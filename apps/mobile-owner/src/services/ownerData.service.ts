import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { generateVietQRUrl, generateVietQRUrlForUtility } from '../utils/demo-payment'
import type {
  Contract,
  Feedback,
  Invoice,
  InvoiceFormValues,
  InvoiceItem,
  Room,
  RoomFormValues,
  Tenant,
  TenantFormValues,
  TenantWithRoom,
  UtilityReading,
  UtilityReadingFormValues,
} from '../types/models'

export interface OwnerDashboardActivity {
  id: string
  title: string
  timestamp?: unknown
}

export interface OwnerDashboardStats {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  monthlyRevenue: number
  unreadNotifications: number
  totalTenants: number
  activeContracts: number
  unpaidInvoices: number
  utilityAmount: number
  pendingFeedback: number
  urgentFeedback: number
  insights: string[]
  recentActivities: OwnerDashboardActivity[]
}

function mapDoc<T>(doc: { id: string; data: () => Record<string, unknown> }) {
  return { id: doc.id, ...doc.data() } as T
}

async function getOwnedCollection<T>(collectionName: string, ownerId: string) {
  const snapshot = await getDocs(query(collection(db, collectionName), where('ownerId', '==', ownerId)))
  return snapshot.docs.map((doc) => mapDoc<T>(doc))
}

function subscribeOwnedCollection<T>(
  collectionName: string,
  ownerId: string,
  callback: (items: T[]) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    query(collection(db, collectionName), where('ownerId', '==', ownerId)),
    (snapshot) => callback(snapshot.docs.map((doc) => mapDoc<T>(doc))),
    (error) => {
      console.warn(`Realtime ${collectionName} subscription failed.`, error)
      onError?.(error)
    },
  )
}

export async function getOwnerDashboard(ownerId: string) {
  const [rooms, tenants, contracts, invoices, utilities, feedback, notifications] = await Promise.all([
    getRooms(ownerId),
    getTenants(ownerId),
    getContracts(ownerId),
    getInvoices(ownerId),
    getUtilities(ownerId),
    getFeedback(ownerId),
    import('./notification.service').then(({ getNotifications }) => getNotifications(ownerId)),
  ])

  return buildOwnerDashboardStats({
    rooms,
    tenants,
    contracts,
    invoices,
    utilities,
    feedback,
    unreadNotifications: notifications.filter((notification) => !notification.read).length,
  })
}

export function subscribeOwnerDashboard(
  ownerId: string,
  callback: (stats: OwnerDashboardStats) => void,
  onError?: (error: unknown) => void,
) {
  let rooms: Room[] = []
  let tenants: Tenant[] = []
  let contracts: Contract[] = []
  let invoices: Invoice[] = []
  let utilities: UtilityReading[] = []
  let feedback: Feedback[] = []
  let unreadNotifications = 0
  const loaded = {
    rooms: false,
    tenants: false,
    contracts: false,
    invoices: false,
    utilities: false,
    feedback: false,
    notifications: false,
  }

  function emitIfReady() {
    if (
      !loaded.rooms ||
      !loaded.tenants ||
      !loaded.contracts ||
      !loaded.invoices ||
      !loaded.utilities ||
      !loaded.feedback ||
      !loaded.notifications
    ) {
      return
    }

    callback(
      buildOwnerDashboardStats({
        rooms,
        tenants,
        contracts,
        invoices,
        utilities,
        feedback,
        unreadNotifications,
      }),
    )
  }

  const unsubscribeRooms = subscribeRooms(
    ownerId,
    (nextRooms) => {
      rooms = nextRooms
      loaded.rooms = true
      emitIfReady()
    },
    onError,
  )
  const unsubscribeInvoices = subscribeInvoices(
    ownerId,
    (nextInvoices) => {
      invoices = nextInvoices
      loaded.invoices = true
      emitIfReady()
    },
    onError,
  )
  const unsubscribeTenants = subscribeTenants(
    ownerId,
    (nextTenants) => {
      tenants = nextTenants
      loaded.tenants = true
      emitIfReady()
    },
    onError,
  )
  const unsubscribeContracts = subscribeContracts(
    ownerId,
    (nextContracts) => {
      contracts = nextContracts
      loaded.contracts = true
      emitIfReady()
    },
    onError,
  )
  const unsubscribeUtilities = subscribeUtilities(
    ownerId,
    (nextUtilities) => {
      utilities = nextUtilities
      loaded.utilities = true
      emitIfReady()
    },
    onError,
  )
  const unsubscribeFeedback = subscribeFeedback(
    ownerId,
    (nextFeedback) => {
      feedback = nextFeedback
      loaded.feedback = true
      emitIfReady()
    },
    onError,
  )
  const unsubscribeNotifications = onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', ownerId)),
    (snapshot) => {
      unreadNotifications = snapshot.docs.filter((item) => !item.data().read).length
      loaded.notifications = true
      emitIfReady()
    },
    (error) => {
      console.warn('Realtime owner dashboard notifications subscription failed.', error)
      onError?.(error)
    },
  )

  return () => {
    unsubscribeRooms()
    unsubscribeInvoices()
    unsubscribeTenants()
    unsubscribeContracts()
    unsubscribeUtilities()
    unsubscribeFeedback()
    unsubscribeNotifications()
  }
}

export async function getTenantsWithRooms(ownerId: string): Promise<TenantWithRoom[]> {
  const [tenants, rooms] = await Promise.all([getTenants(ownerId), getRooms(ownerId)])
  const roomById = new Map(rooms.map((room) => [room.id, room]))

  return tenants.map((tenant) => ({
    ...tenant,
    room: tenant.roomId ? roomById.get(tenant.roomId) ?? null : null,
  }))
}

export const getRooms = (ownerId: string) => getOwnedCollection<Room>('rooms', ownerId)
export const getTenants = (ownerId: string) => getOwnedCollection<Tenant>('tenants', ownerId)
export const getContracts = (ownerId: string) => getOwnedCollection<Contract>('contracts', ownerId)
export const getInvoices = (ownerId: string) => getOwnedCollection<Invoice>('invoices', ownerId)
export const getUtilities = (ownerId: string) => getOwnedCollection<UtilityReading>('utilityReadings', ownerId)
export const getFeedback = (ownerId: string) => getOwnedCollection<Feedback>('feedbacks', ownerId)

export const subscribeRooms = (
  ownerId: string,
  callback: (rooms: Room[]) => void,
  onError?: (error: unknown) => void,
) => subscribeOwnedCollection<Room>('rooms', ownerId, callback, onError)
export const subscribeTenants = (
  ownerId: string,
  callback: (tenants: Tenant[]) => void,
  onError?: (error: unknown) => void,
) => subscribeOwnedCollection<Tenant>('tenants', ownerId, callback, onError)
export const subscribeContracts = (
  ownerId: string,
  callback: (contracts: Contract[]) => void,
  onError?: (error: unknown) => void,
) => subscribeOwnedCollection<Contract>('contracts', ownerId, callback, onError)
export const subscribeInvoices = (
  ownerId: string,
  callback: (invoices: Invoice[]) => void,
  onError?: (error: unknown) => void,
) => subscribeOwnedCollection<Invoice>('invoices', ownerId, callback, onError)
export const subscribeUtilities = (
  ownerId: string,
  callback: (utilities: UtilityReading[]) => void,
  onError?: (error: unknown) => void,
) => subscribeOwnedCollection<UtilityReading>('utilityReadings', ownerId, callback, onError)
export const subscribeFeedback = (
  ownerId: string,
  callback: (feedback: Feedback[]) => void,
  onError?: (error: unknown) => void,
) => subscribeOwnedCollection<Feedback>('feedbacks', ownerId, callback, onError)

export function subscribeTenantsWithRooms(
  ownerId: string,
  callback: (tenants: TenantWithRoom[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  let tenants: Tenant[] = []
  let rooms: Room[] = []
  const loaded = { tenants: false, rooms: false }

  function emitIfReady() {
    if (!loaded.tenants || !loaded.rooms) return
    const roomById = new Map(rooms.map((room) => [room.id, room]))
    callback(
      tenants.map((tenant) => ({
        ...tenant,
        room: tenant.roomId ? roomById.get(tenant.roomId) ?? null : null,
      })),
    )
  }

  const unsubscribeTenants = subscribeTenants(
    ownerId,
    (nextTenants) => {
      tenants = nextTenants
      loaded.tenants = true
      emitIfReady()
    },
    onError,
  )
  const unsubscribeRooms = subscribeRooms(
    ownerId,
    (nextRooms) => {
      rooms = nextRooms
      loaded.rooms = true
      emitIfReady()
    },
    onError,
  )

  return () => {
    unsubscribeTenants()
    unsubscribeRooms()
  }
}

export async function createRoom(ownerId: string, values: RoomFormValues) {
  await addDoc(collection(db, 'rooms'), {
    ...values,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateRoom(roomId: string, values: Partial<RoomFormValues>) {
  await updateDoc(doc(db, 'rooms', roomId), {
    ...values,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRoom(roomId: string) {
  await deleteDoc(doc(db, 'rooms', roomId))
}

export async function createTenant(ownerId: string, values: TenantFormValues) {
  await addDoc(collection(db, 'tenants'), {
    ...values,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  if (values.status === 'active') {
    await updateRoom(values.roomId, { status: 'occupied' })
  }
}

export async function updateTenant(tenantId: string, values: Partial<TenantFormValues>) {
  await updateDoc(doc(db, 'tenants', tenantId), {
    ...values,
    updatedAt: serverTimestamp(),
  })

  if (values.roomId && values.status === 'active') {
    await updateRoom(values.roomId, { status: 'occupied' })
  }
}

export async function deleteTenant(tenantId: string) {
  await deleteDoc(doc(db, 'tenants', tenantId))
}

export async function createInvoice(ownerId: string, values: InvoiceFormValues) {
  const totals = calculateInvoiceTotals(values.items, values.discount)

  await addDoc(collection(db, 'invoices'), {
    ...values,
    ...totals,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateInvoice(invoiceId: string, values: Partial<InvoiceFormValues>) {
  const payload: Record<string, unknown> = {
    ...values,
    updatedAt: serverTimestamp(),
  }

  if (values.items) {
    Object.assign(payload, calculateInvoiceTotals(values.items, values.discount ?? 0))
  }

  await updateDoc(doc(db, 'invoices', invoiceId), payload)
}

export async function markInvoiceAsPaid(invoice: Invoice) {
  await updateDoc(doc(db, 'invoices', invoice.id), {
    status: 'paid',
    paymentStatus: 'paid',
    paymentMethod: 'manual',
    paymentReference: `MANUAL-${Date.now()}`,
    paidAmount: invoice.totalAmount ?? 0,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function simulateOwnerVietQRCallback(invoice: Invoice, tenantName = 'Tenant') {
  await updateDoc(doc(db, 'invoices', invoice.id), {
    status: 'paid',
    paymentStatus: 'paid',
    paymentMethod: 'demo_vietqr',
    paymentReference: `DEMO-VIETQR-${Date.now()}`,
    paidAmount: invoice.totalAmount ?? 0,
    paidAt: serverTimestamp(),
    qrProvider: 'vietqr_demo',
    qrPayload: generateVietQRUrl(invoice),
    updatedAt: serverTimestamp(),
  })

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: invoice.ownerId,
      ownerId: invoice.ownerId,
      tenantId: invoice.tenantId,
      role: 'owner',
      type: 'invoice',
      priority: 'medium',
      title: 'Invoice Paid',
      message: `${tenantName} completed demo VietQR payment for invoice ${invoice.invoiceCode}.`,
      read: false,
      status: 'unread',
      actionUrl: '/owner/invoices',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (notificationError) {
    console.warn('Owner invoice payment notification failed.', notificationError)
  }
}

export async function deleteInvoice(invoiceId: string) {
  await deleteDoc(doc(db, 'invoices', invoiceId))
}

export async function createUtilityReading(ownerId: string, values: UtilityReadingFormValues) {
  const totals = calculateUtilityTotals(values)

  await addDoc(collection(db, 'utilityReadings'), {
    ...values,
    ...totals,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateUtilityReading(readingId: string, values: Partial<UtilityReadingFormValues>) {
  const payload: Record<string, unknown> = {
    ...values,
    updatedAt: serverTimestamp(),
  }

  if (
    values.previousReading !== undefined &&
    values.currentReading !== undefined &&
    values.unitPrice !== undefined
  ) {
    Object.assign(payload, calculateUtilityTotals(values as UtilityReadingFormValues))
  }

  await updateDoc(doc(db, 'utilityReadings', readingId), payload)
}

export async function confirmUtilityReading(readingId: string) {
  await updateDoc(doc(db, 'utilityReadings', readingId), {
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  })
}

export async function markUtilityReadingAsBilled(readingId: string) {
  await updateDoc(doc(db, 'utilityReadings', readingId), {
    status: 'billed',
    updatedAt: serverTimestamp(),
  })
}

export async function simulateOwnerUtilityVietQRCallback(
  reading: UtilityReading,
  tenantName = 'Tenant',
  roomNumber?: string,
) {
  await updateDoc(doc(db, 'utilityReadings', reading.id), {
    paymentStatus: 'paid',
    paymentMethod: 'demo_vietqr',
    paymentReference: `DEMO-VIETQR-UTILITY-${Date.now()}`,
    paidAmount: reading.totalAmount ?? 0,
    paidAt: serverTimestamp(),
    qrProvider: 'vietqr_demo',
    qrPayload: generateVietQRUrlForUtility({ ...reading, roomNumber }),
    status: 'paid',
    updatedAt: serverTimestamp(),
  })

  try {
    await addDoc(collection(db, 'notifications'), {
      userId: reading.ownerId,
      role: 'owner',
      type: 'utility',
      priority: 'medium',
      title: 'Utility Bill Paid',
      message: `${tenantName} completed demo VietQR payment for ${reading.utilityType} utility bill.`,
      read: false,
      actionUrl: '/owner/utilities',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (notificationError) {
    console.warn('Owner utility payment notification failed.', notificationError)
  }
}

export async function deleteUtilityReading(readingId: string) {
  await deleteDoc(doc(db, 'utilityReadings', readingId))
}

export async function markFeedbackAsInReview(feedbackId: string) {
  await updateDoc(doc(db, 'feedbacks', feedbackId), {
    status: 'in_review',
    updatedAt: serverTimestamp(),
  })
}

export async function resolveFeedback(feedback: Feedback, ownerResponse?: string) {
  await updateFeedbackStatus(feedback, 'resolved', ownerResponse)
}

export async function rejectFeedback(feedback: Feedback, ownerResponse?: string) {
  await updateFeedbackStatus(feedback, 'rejected', ownerResponse)
}

function isCurrentBillingMonth(billingMonth?: string) {
  if (!billingMonth) return false

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return billingMonth.startsWith(currentMonth)
}

function isCurrentInvoicePaymentMonth(invoice: Invoice) {
  if (invoice.paidAt && typeof invoice.paidAt === 'object' && 'toDate' in invoice.paidAt) {
    const date = (invoice.paidAt as { toDate: () => Date }).toDate()
    const now = new Date()

    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }

  return isCurrentBillingMonth(invoice.billingMonth)
}

function isInvoicePaid(invoice: Invoice) {
  return invoice.status === 'paid' || invoice.paymentStatus === 'paid'
}

function getInvoicePaidAmount(invoice: Invoice) {
  return Number(invoice.paidAmount || invoice.totalAmount || 0)
}

function normalizeText(value?: string | null) {
  return (value ?? '').toLowerCase()
}

function isInvoiceUnpaid(invoice: Invoice) {
  return normalizeText(invoice.paymentStatus) !== 'paid' && normalizeText(invoice.status) !== 'paid'
}

function isFeedbackPending(feedback: Feedback) {
  return normalizeText(feedback.status) !== 'resolved'
}

function isFeedbackUrgent(feedback: Feedback) {
  return normalizeText(feedback.priority) === 'urgent' || normalizeText(feedback.priority) === 'high'
}

function getRecordTime(item: Record<string, unknown>) {
  const candidates = [item.paidAt, item.updatedAt, item.createdAt]

  for (const value of candidates) {
    if (value && typeof value === 'object' && 'toDate' in value) {
      return (value as { toDate: () => Date }).toDate().getTime()
    }

    if (typeof value === 'string') {
      const time = new Date(value).getTime()
      if (!Number.isNaN(time)) return time
    }
  }

  return 0
}

function getActivityTimestamp(item: Record<string, unknown>) {
  return item.paidAt ?? item.updatedAt ?? item.createdAt
}

function buildOwnerDashboardStats({
  rooms,
  tenants,
  contracts,
  invoices,
  utilities,
  feedback,
  unreadNotifications,
}: {
  rooms: Room[]
  tenants: Tenant[]
  contracts: Contract[]
  invoices: Invoice[]
  utilities: UtilityReading[]
  feedback: Feedback[]
  unreadNotifications: number
}): OwnerDashboardStats {
  const monthlyRevenue = invoices
    .filter((invoice) => isInvoicePaid(invoice) && isCurrentInvoicePaymentMonth(invoice))
    .reduce((total, invoice) => total + getInvoicePaidAmount(invoice), 0)
  const vacantRooms = rooms.filter((room) => room.status === 'available').length
  const activeContracts = contracts.filter((contract) => contract.status === 'active').length
  const unpaidInvoices = invoices.filter(isInvoiceUnpaid).length
  const urgentFeedback = feedback.filter(isFeedbackUrgent).length
  const utilityAmount = utilities.reduce((total, reading) => total + Number(reading.totalAmount || 0), 0)

  return {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter((room) => room.status === 'occupied').length,
    vacantRooms,
    monthlyRevenue,
    unreadNotifications,
    totalTenants: tenants.length,
    activeContracts,
    unpaidInvoices,
    utilityAmount,
    pendingFeedback: feedback.filter(isFeedbackPending).length,
    urgentFeedback,
    insights: [
      `${vacantRooms} room${vacantRooms === 1 ? '' : 's'} available`,
      `${activeContracts} active contract${activeContracts === 1 ? '' : 's'}`,
      `${unpaidInvoices} unpaid invoice${unpaidInvoices === 1 ? '' : 's'}`,
      `${urgentFeedback} urgent feedback`,
    ],
    recentActivities: buildRecentActivities({ invoices, utilities, contracts, feedback }),
  }
}

function buildRecentActivities({
  invoices,
  utilities,
  contracts,
  feedback,
}: {
  invoices: Invoice[]
  utilities: UtilityReading[]
  contracts: Contract[]
  feedback: Feedback[]
}) {
  const invoiceActivities = invoices.map((invoice) => ({
    id: `invoice-${invoice.id}`,
    title: isInvoicePaid(invoice)
      ? `Payment completed for invoice ${invoice.invoiceCode}`
      : `Invoice ${invoice.invoiceCode} created`,
    timestamp: getActivityTimestamp(invoice as unknown as Record<string, unknown>),
    sortTime: getRecordTime(invoice as unknown as Record<string, unknown>),
  }))
  const utilityActivities = utilities.map((reading) => ({
    id: `utility-${reading.id}`,
    title: `${reading.utilityType === 'electricity' ? 'Electricity' : 'Water'} utility updated`,
    timestamp: getActivityTimestamp(reading as unknown as Record<string, unknown>),
    sortTime: getRecordTime(reading as unknown as Record<string, unknown>),
  }))
  const contractActivities = contracts.map((contract) => ({
    id: `contract-${contract.id}`,
    title: `Contract ${contract.contractCode} updated`,
    timestamp: getActivityTimestamp(contract as unknown as Record<string, unknown>),
    sortTime: getRecordTime(contract as unknown as Record<string, unknown>),
  }))
  const feedbackActivities = feedback.map((item) => ({
    id: `feedback-${item.id}`,
    title: `Feedback submitted: ${item.title}`,
    timestamp: getActivityTimestamp(item as unknown as Record<string, unknown>),
    sortTime: getRecordTime(item as unknown as Record<string, unknown>),
  }))

  return [...invoiceActivities, ...utilityActivities, ...contractActivities, ...feedbackActivities]
    .sort((left, right) => right.sortTime - left.sortTime)
    .slice(0, 5)
    .map(({ sortTime: _sortTime, ...activity }) => activity)
}

function calculateInvoiceTotals(items: InvoiceItem[], discount = 0) {
  const normalizedItems = items.map((item) => ({
    ...item,
    amount: Number(item.quantity || 0) * Number(item.unitPrice || 0),
  }))
  const subtotal = normalizedItems.reduce((total, item) => total + item.amount, 0)
  const totalAmount = Math.max(0, subtotal - Number(discount || 0))

  return {
    items: normalizedItems,
    subtotal,
    totalAmount,
  }
}

function calculateUtilityTotals(values: UtilityReadingFormValues) {
  const usage = Number(values.currentReading || 0) - Number(values.previousReading || 0)

  if (usage < 0) {
    throw new Error('Current reading must be greater than or equal to previous reading.')
  }

  return {
    usage,
    totalAmount: usage * Number(values.unitPrice || 0),
  }
}

async function updateFeedbackStatus(feedback: Feedback, status: 'resolved' | 'rejected', ownerResponse?: string) {
  await updateDoc(doc(db, 'feedbacks', feedback.id), {
    status,
    ownerResponse: ownerResponse || feedback.ownerResponse || '',
    updatedAt: serverTimestamp(),
    ...(status === 'resolved' ? { resolvedAt: serverTimestamp() } : {}),
  })

  await notifyTenantAboutFeedback(feedback, status)
}

async function notifyTenantAboutFeedback(feedback: Feedback, status: 'resolved' | 'rejected') {
  if (!feedback.tenantId) return

  try {
    const tenantSnapshot = await getDoc(doc(db, 'tenants', feedback.tenantId))
    if (!tenantSnapshot.exists()) return

    const tenant = tenantSnapshot.data() as Tenant
    if (!tenant.email) return

    const userSnapshot = await getDocs(query(collection(db, 'users'), where('email', '==', tenant.email)))
    const tenantUser = userSnapshot.docs[0]
    if (!tenantUser) return

    await addDoc(collection(db, 'notifications'), {
      userId: tenantUser.id,
      role: 'tenant',
      type: 'feedback',
      priority: 'medium',
      title: status === 'resolved' ? 'Feedback Resolved' : 'Feedback Reviewed',
      message:
        status === 'resolved'
          ? 'Your feedback has been reviewed and resolved.'
          : 'Your feedback has been reviewed.',
      read: false,
      actionUrl: '/tenant/my-feedback',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (notificationError) {
    console.warn('Tenant feedback notification failed.', notificationError)
  }
}
