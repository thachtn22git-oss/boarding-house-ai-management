import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type {
  Contract,
  Feedback,
  FeedbackPriority,
  Invoice,
  Room,
  Tenant,
  UtilityReading,
} from '../types/models'
import type { AppUser } from '../types/user'
import {
  analyzeFeedbackWithAI,
  type FeedbackAIResult,
} from '../features/feedback/services/feedback-ai.service'
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

export interface TenantFeedbackResult {
  aiUnavailable: boolean
}

function mapDoc<T>(item: { id: string; data: () => Record<string, unknown> }) {
  return { id: item.id, ...item.data() } as T
}

export async function getCurrentTenant(currentUser: AppUser): Promise<TenantPortalData> {
  const tenantSnapshot = await getDocs(
    query(collection(db, 'tenants'), where('email', '==', currentUser.email), limit(1)),
  )
  const tenant = tenantSnapshot.empty ? null : mapDoc<Tenant>(tenantSnapshot.docs[0])

  if (!tenant) {
    return {
      tenant: null,
      room: null,
      activeContract: null,
      invoices: [],
      utilities: [],
      feedbacks: [],
      notifications: [],
      unreadNotifications: (await getNotifications(currentUser.uid)).filter((item) => !item.read).length,
    }
  }

  const [roomDoc, contractsSnapshot, invoicesSnapshot, utilitiesSnapshot, feedbackSnapshot, notifications] =
    await Promise.all([
      tenant.roomId ? getDoc(doc(db, 'rooms', tenant.roomId)) : Promise.resolve(null),
      getDocs(query(collection(db, 'contracts'), where('tenantId', '==', tenant.id))),
      getDocs(query(collection(db, 'invoices'), where('tenantId', '==', tenant.id))),
      getDocs(query(collection(db, 'utilityReadings'), where('tenantId', '==', tenant.id))),
      getDocs(query(collection(db, 'feedbacks'), where('tenantId', '==', tenant.id))),
      getNotifications(currentUser.uid),
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

function getFeedbackAIFields(analysis: FeedbackAIResult | null) {
  if (!analysis) {
    return {
      category: 'other' as const,
      priority: null,
      sentiment: null,
      aiGenerated: false,
      aiSummary: null,
      aiSuggestedCategory: null,
      aiSuggestedPriority: null,
      aiConfidence: null,
      aiError: 'AI analysis unavailable',
    }
  }

  return {
    category: analysis.category,
    priority: analysis.priority,
    sentiment: analysis.sentiment,
    aiGenerated: true,
    aiSummary: analysis.summary || null,
    aiSuggestedCategory: analysis.category,
    aiSuggestedPriority: analysis.priority,
    aiConfidence: analysis.confidence,
    aiError: null,
  }
}

export async function createTenantFeedback(
  tenant: Tenant,
  values: TenantFeedbackValues,
): Promise<TenantFeedbackResult> {
  let analysis: FeedbackAIResult | null = null

  try {
    analysis = await analyzeFeedbackWithAI(values.content)
  } catch (error) {
    console.warn('Tenant feedback submitted without AI analysis.', error)
  }

  await addDoc(collection(db, 'feedbacks'), {
    ownerId: tenant.ownerId,
    tenantId: tenant.id,
    roomId: tenant.roomId,
    title: values.title,
    content: values.content,
    ...getFeedbackAIFields(analysis),
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: tenant.ownerId,
      role: 'owner',
      type: 'feedback',
      priority: (analysis?.priority ?? 'medium') as FeedbackPriority,
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

  return {
    aiUnavailable: !analysis,
  }
}

function sortByDateDesc<T>(items: T[], key: keyof T) {
  return [...items].sort((a, b) => String(b[key] ?? '').localeCompare(String(a[key] ?? '')))
}
