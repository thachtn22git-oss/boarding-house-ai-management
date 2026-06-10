import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import type {
  Contract,
  Feedback,
  Invoice,
  Room,
  Tenant,
  UtilityReading,
} from '../types/models'
import type { AppUser } from '../types/user'
import { getNotifications } from './notification.service'

export interface TenantPortalData {
  tenant: Tenant | null
  room: Room | null
  activeContract: Contract | null
  invoices: Invoice[]
  utilities: UtilityReading[]
  feedbacks: Feedback[]
  notifications: Awaited<ReturnType<typeof getNotifications>>
  unreadNotifications: number
}

export interface TenantFeedbackValues {
  title: string
  content: string
}

function mapDoc<T>(item: { id: string; data: () => Record<string, unknown> }) {
  return { id: item.id, ...item.data() } as T
}

export async function getCurrentTenant(currentUser: AppUser): Promise<TenantPortalData> {
  const tenantSnapshot = await getDocs(
    query(collection(db, 'tenants'), where('email', '==', currentUser.email), limit(1)),
  )
  const tenant = tenantSnapshot.empty ? null : mapDoc<Tenant>(tenantSnapshot.docs[0])
  const notifications = await getNotifications(currentUser.uid)

  if (!tenant) {
    return {
      tenant: null,
      room: null,
      activeContract: null,
      invoices: [],
      utilities: [],
      feedbacks: [],
      notifications,
      unreadNotifications: notifications.filter((item) => !item.read).length,
    }
  }

  const [roomDoc, contractsSnapshot, invoicesSnapshot, utilitiesSnapshot, feedbackSnapshot] = await Promise.all([
    tenant.roomId ? getDoc(doc(db, 'rooms', tenant.roomId)) : Promise.resolve(null),
    getDocs(query(collection(db, 'contracts'), where('tenantId', '==', tenant.id))),
    getDocs(query(collection(db, 'invoices'), where('tenantId', '==', tenant.id))),
    getDocs(query(collection(db, 'utilityReadings'), where('tenantId', '==', tenant.id))),
    getDocs(query(collection(db, 'feedbacks'), where('tenantId', '==', tenant.id))),
  ])

  const contracts = contractsSnapshot.docs.map((item) => mapDoc<Contract>(item))
  const invoices = sortByDateDesc(invoicesSnapshot.docs.map((item) => mapDoc<Invoice>(item)), 'dueDate')
  const utilities = sortByDateDesc(utilitiesSnapshot.docs.map((item) => mapDoc<UtilityReading>(item)), 'billingMonth')
  const feedbacks = feedbackSnapshot.docs.map((item) => mapDoc<Feedback>(item))

  return {
    tenant,
    room: roomDoc && roomDoc.exists() ? ({ id: roomDoc.id, ...roomDoc.data() } as Room) : null,
    activeContract: contracts.find((contract) => contract.status === 'active') ?? null,
    invoices,
    utilities,
    feedbacks,
    notifications,
    unreadNotifications: notifications.filter((item) => !item.read).length,
  }
}

export async function createTenantFeedback(tenant: Tenant, values: TenantFeedbackValues) {
  await addDoc(collection(db, 'feedbacks'), {
    ownerId: tenant.ownerId,
    tenantId: tenant.id,
    roomId: tenant.roomId,
    title: values.title,
    content: values.content,
    category: 'other',
    priority: null,
    sentiment: null,
    status: 'new',
    aiGenerated: false,
    aiSummary: null,
    aiSuggestedCategory: null,
    aiSuggestedPriority: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: tenant.ownerId,
      role: 'owner',
      type: 'feedback',
      priority: 'medium',
      title: 'New Tenant Feedback',
      message: `${tenant.fullName} submitted new feedback: ${values.title}`,
      read: false,
      actionUrl: '/owner/feedback',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (notificationError) {
    console.warn('Owner notification creation failed after tenant feedback submission.', notificationError)
  }
}

function sortByDateDesc<T>(items: T[], key: keyof T) {
  return [...items].sort((a, b) => String(b[key] ?? '').localeCompare(String(a[key] ?? '')))
}
