import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { AppUser } from '../../../types/user'
import type { Contract, ContractStatus } from '../../contracts/types'
import type {
  Feedback,
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  SentimentLabel,
} from '../../feedbacks/types'
import type { Invoice, InvoiceItem, InvoiceStatus } from '../../invoices/types'
import { createNotification } from '../../notifications/services/notification.service'
import type { Room, RoomStatus } from '../../rooms/types'
import type { Tenant, TenantStatus } from '../../tenants/types'
import type {
  UtilityReading,
  UtilityReadingStatus,
  UtilityType,
} from '../../utilities/types'
import type { TenantFeedbackFormValues, TenantPortalData } from '../types'

const tenantsCollection = collection(db, 'tenants')
const contractsCollection = collection(db, 'contracts')
const invoicesCollection = collection(db, 'invoices')
const utilityReadingsCollection = collection(db, 'utilityReadings')
const feedbacksCollection = collection(db, 'feedbacks')

function isRoomStatus(value: unknown): value is RoomStatus {
  return value === 'occupied' || value === 'maintenance' || value === 'available'
}

function isTenantStatus(value: unknown): value is TenantStatus {
  return value === 'active' || value === 'inactive' || value === 'pending'
}

function isContractStatus(value: unknown): value is ContractStatus {
  return (
    value === 'active' ||
    value === 'expired' ||
    value === 'terminated' ||
    value === 'pending'
  )
}

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return (
    value === 'draft' ||
    value === 'unpaid' ||
    value === 'paid' ||
    value === 'overdue' ||
    value === 'cancelled'
  )
}

function isUtilityType(value: unknown): value is UtilityType {
  return value === 'electricity' || value === 'water'
}

function isUtilityReadingStatus(value: unknown): value is UtilityReadingStatus {
  return value === 'draft' || value === 'confirmed' || value === 'billed'
}

function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    value === 'electricity' ||
    value === 'water' ||
    value === 'internet' ||
    value === 'security' ||
    value === 'cleanliness' ||
    value === 'maintenance' ||
    value === 'billing' ||
    value === 'other'
  )
}

function isFeedbackPriority(value: unknown): value is FeedbackPriority {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'urgent'
}

function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return (
    value === 'new' ||
    value === 'in_review' ||
    value === 'resolved' ||
    value === 'rejected'
  )
}

function isSentimentLabel(value: unknown): value is SentimentLabel {
  return value === 'positive' || value === 'neutral' || value === 'negative'
}

function mapRoomDocument(documentId: string, data: DocumentData): Room {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    boardingHouseId:
      typeof data.boardingHouseId === 'string' ? data.boardingHouseId : undefined,
    roomNumber: String(data.roomNumber ?? ''),
    floor: Number(data.floor ?? 0),
    roomType: String(data.roomType ?? ''),
    area: Number(data.area ?? 0),
    price: Number(data.price ?? 0),
    deposit: Number(data.deposit ?? 0),
    maxTenants: Number(data.maxTenants ?? 0),
    status: isRoomStatus(data.status) ? data.status : 'available',
    description:
      typeof data.description === 'string' ? data.description : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapTenantDocument(documentId: string, data: DocumentData): Tenant {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    roomId: String(data.roomId ?? ''),
    fullName: String(data.fullName ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    identityNumber: String(data.identityNumber ?? ''),
    dateOfBirth:
      typeof data.dateOfBirth === 'string' ? data.dateOfBirth : undefined,
    address: typeof data.address === 'string' ? data.address : undefined,
    status: isTenantStatus(data.status) ? data.status : 'active',
    moveInDate: String(data.moveInDate ?? ''),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapContractDocument(documentId: string, data: DocumentData): Contract {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    tenantId: String(data.tenantId ?? ''),
    roomId: String(data.roomId ?? ''),
    contractCode: String(data.contractCode ?? ''),
    startDate: String(data.startDate ?? ''),
    endDate: String(data.endDate ?? ''),
    monthlyRent: Number(data.monthlyRent ?? 0),
    deposit: Number(data.deposit ?? 0),
    paymentDueDay: Number(data.paymentDueDay ?? 1),
    status: isContractStatus(data.status) ? data.status : 'pending',
    terms: typeof data.terms === 'string' ? data.terms : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapInvoiceDocument(documentId: string, data: DocumentData): Invoice {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    tenantId: String(data.tenantId ?? ''),
    roomId: String(data.roomId ?? ''),
    contractId: typeof data.contractId === 'string' ? data.contractId : undefined,
    invoiceCode: String(data.invoiceCode ?? ''),
    billingMonth: String(data.billingMonth ?? ''),
    issueDate: String(data.issueDate ?? ''),
    dueDate: String(data.dueDate ?? ''),
    items: Array.isArray(data.items) ? (data.items as InvoiceItem[]) : [],
    subtotal: Number(data.subtotal ?? 0),
    discount: Number(data.discount ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
    paidAmount: Number(data.paidAmount ?? 0),
    status: isInvoiceStatus(data.status) ? data.status : 'draft',
    note: typeof data.note === 'string' ? data.note : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapUtilityReadingDocument(
  documentId: string,
  data: DocumentData,
): UtilityReading {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    roomId: String(data.roomId ?? ''),
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    utilityType: isUtilityType(data.utilityType) ? data.utilityType : 'electricity',
    billingMonth: String(data.billingMonth ?? ''),
    previousReading: Number(data.previousReading ?? 0),
    currentReading: Number(data.currentReading ?? 0),
    usage: Number(data.usage ?? 0),
    unitPrice: Number(data.unitPrice ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
    status: isUtilityReadingStatus(data.status) ? data.status : 'draft',
    note: typeof data.note === 'string' ? data.note : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapFeedbackDocument(documentId: string, data: DocumentData): Feedback {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    roomId: typeof data.roomId === 'string' ? data.roomId : undefined,
    title: String(data.title ?? ''),
    content: String(data.content ?? ''),
    category: isFeedbackCategory(data.category) ? data.category : 'other',
    priority: isFeedbackPriority(data.priority) ? data.priority : null,
    status: isFeedbackStatus(data.status) ? data.status : 'new',
    sentiment: isSentimentLabel(data.sentiment) ? data.sentiment : null,
    aiGenerated: Boolean(data.aiGenerated),
    aiSuggestedCategory: isFeedbackCategory(data.aiSuggestedCategory)
      ? data.aiSuggestedCategory
      : null,
    aiSuggestedPriority: isFeedbackPriority(data.aiSuggestedPriority)
      ? data.aiSuggestedPriority
      : null,
    aiSummary: typeof data.aiSummary === 'string' ? data.aiSummary : null,
    ownerResponse:
      typeof data.ownerResponse === 'string' ? data.ownerResponse : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    resolvedAt: data.resolvedAt,
  }
}

function sortByCreatedAtDesc<T extends { createdAt?: unknown }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftDate = getDateTime(left.createdAt)
    const rightDate = getDateTime(right.createdAt)

    return rightDate - leftDate
  })
}

function getDateTime(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

async function getTenantByEmail(email: string) {
  const snapshot = await getDocs(query(tenantsCollection, where('email', '==', email)))
  const tenants = snapshot.docs.map((tenantDoc) =>
    mapTenantDocument(tenantDoc.id, tenantDoc.data()),
  )

  return (
    tenants.find((tenant) => tenant.status === 'active') ??
    tenants[0] ??
    null
  )
}

async function getTenantById(tenantId: string) {
  const tenantSnapshot = await getDoc(doc(db, 'tenants', tenantId))

  if (!tenantSnapshot.exists()) {
    return null
  }

  return mapTenantDocument(tenantSnapshot.id, tenantSnapshot.data())
}

async function getCurrentTenantRecord(currentUser: AppUser) {
  const tenantByEmail = currentUser.email
    ? await getTenantByEmail(currentUser.email)
    : null

  if (tenantByEmail) {
    return tenantByEmail
  }

  return currentUser.tenantId ? getTenantById(currentUser.tenantId) : null
}

async function getTenantRoom(tenant: Tenant) {
  if (!tenant.roomId) {
    return null
  }

  const roomSnapshot = await getDoc(doc(db, 'rooms', tenant.roomId))

  if (!roomSnapshot.exists()) {
    return null
  }

  const room = mapRoomDocument(roomSnapshot.id, roomSnapshot.data())

  return room.ownerId === tenant.ownerId ? room : null
}

async function getTenantContracts(tenant: Tenant) {
  const snapshot = await getDocs(
    query(contractsCollection, where('tenantId', '==', tenant.id)),
  )

  return snapshot.docs
    .map((contractDoc) =>
      mapContractDocument(contractDoc.id, contractDoc.data()),
    )
    .filter((contract) => contract.ownerId === tenant.ownerId)
}

async function getTenantInvoices(tenant: Tenant) {
  const snapshot = await getDocs(
    query(invoicesCollection, where('tenantId', '==', tenant.id)),
  )

  return sortByCreatedAtDesc(
    snapshot.docs
      .map((invoiceDoc) => mapInvoiceDocument(invoiceDoc.id, invoiceDoc.data()))
      .filter((invoice) => invoice.ownerId === tenant.ownerId),
  )
}

async function getTenantUtilities(tenant: Tenant) {
  const snapshot = await getDocs(
    query(utilityReadingsCollection, where('tenantId', '==', tenant.id)),
  )

  return sortByCreatedAtDesc(
    snapshot.docs
      .map((utilityDoc) =>
        mapUtilityReadingDocument(utilityDoc.id, utilityDoc.data()),
      )
      .filter((utility) => utility.ownerId === tenant.ownerId),
  )
}

async function getTenantFeedbacks(tenant: Tenant) {
  const snapshot = await getDocs(
    query(feedbacksCollection, where('tenantId', '==', tenant.id)),
  )

  return sortByCreatedAtDesc(
    snapshot.docs
      .map((feedbackDoc) =>
        mapFeedbackDocument(feedbackDoc.id, feedbackDoc.data()),
      )
      .filter((feedback) => feedback.ownerId === tenant.ownerId),
  )
}

function getActiveContract(contracts: Contract[]) {
  return (
    contracts.find((contract) => contract.status === 'active') ??
    contracts[0] ??
    null
  )
}

async function createOwnerFeedbackNotification(
  tenant: Tenant,
  values: TenantFeedbackFormValues,
) {
  try {
    await createNotification({
      userId: tenant.ownerId,
      role: 'owner',
      type: 'feedback',
      priority: 'medium',
      title: 'New Tenant Feedback',
      message: `${tenant.fullName} submitted new feedback: ${values.title}`,
      actionUrl: '/owner/feedback',
    })
  } catch (error) {
    console.error('Failed to create owner notification for tenant feedback.', error)
  }
}

export async function getCurrentTenant(
  currentUser: AppUser,
): Promise<TenantPortalData> {
  const tenant = await getCurrentTenantRecord(currentUser)

  if (!tenant) {
    return {
      tenant: null,
      room: null,
      activeContract: null,
      invoices: [],
      utilities: [],
      feedbacks: [],
    }
  }

  const [room, contracts, invoices, utilities, feedbacks] = await Promise.all([
    getTenantRoom(tenant),
    getTenantContracts(tenant),
    getTenantInvoices(tenant),
    getTenantUtilities(tenant),
    getTenantFeedbacks(tenant),
  ])

  return {
    tenant,
    room,
    activeContract: getActiveContract(contracts),
    invoices,
    utilities,
    feedbacks,
  }
}

export async function createTenantFeedback(
  tenant: Tenant,
  values: TenantFeedbackFormValues,
): Promise<string> {
  const feedbackRef = await addDoc(feedbacksCollection, {
    ownerId: tenant.ownerId,
    tenantId: tenant.id,
    roomId: tenant.roomId || null,
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

  await createOwnerFeedbackNotification(tenant, values)

  return feedbackRef.id
}
