import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { generateVietQRUrl } from '../utils/demo-payment'
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

function mapDoc<T>(doc: { id: string; data: () => Record<string, unknown> }) {
  return { id: doc.id, ...doc.data() } as T
}

async function getOwnedCollection<T>(collectionName: string, ownerId: string) {
  const snapshot = await getDocs(query(collection(db, collectionName), where('ownerId', '==', ownerId)))
  return snapshot.docs.map((doc) => mapDoc<T>(doc))
}

export async function getOwnerDashboard(ownerId: string) {
  const [rooms, invoices, notifications] = await Promise.all([
    getRooms(ownerId),
    getInvoices(ownerId),
    import('./notification.service').then(({ getNotifications }) => getNotifications(ownerId)),
  ])

  const monthlyRevenue = invoices
    .filter((invoice) => isInvoicePaid(invoice) && isCurrentInvoicePaymentMonth(invoice))
    .reduce((total, invoice) => total + getInvoicePaidAmount(invoice), 0)

  return {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter((room) => room.status === 'occupied').length,
    vacantRooms: rooms.filter((room) => room.status === 'available').length,
    monthlyRevenue,
    unreadNotifications: notifications.filter((notification) => !notification.read).length,
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
