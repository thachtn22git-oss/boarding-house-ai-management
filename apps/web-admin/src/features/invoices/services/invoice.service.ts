import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import { createNotification } from '../../notifications/services/notification.service'
import { getUserUidByEmail } from '../../notifications/services/user-resolution.service'
import type {
  Invoice,
  InvoiceFormValues,
  InvoiceItem,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
} from '../types'

const invoicesCollection = collection(db, 'invoices')

type TenantNotificationProfile = {
  id: string
  email: string
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

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    value === 'unpaid' ||
    value === 'pending' ||
    value === 'paid' ||
    value === 'failed'
  )
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'manual' || value === 'demo_qr'
}

function getFallbackPaymentStatus(status: InvoiceStatus): PaymentStatus {
  if (status === 'paid') {
    return 'paid'
  }

  if (status === 'cancelled') {
    return 'failed'
  }

  return 'unpaid'
}

function calculateItems(items: InvoiceItem[]) {
  return items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    amount: Number(item.quantity) * Number(item.unitPrice),
  }))
}

function calculateTotals(values: Pick<InvoiceFormValues, 'items' | 'discount'>) {
  const items = calculateItems(values.items)
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const discount = Number(values.discount || 0)
  const totalAmount = Math.max(subtotal - discount, 0)

  return {
    items,
    subtotal,
    totalAmount,
  }
}

function mapInvoiceItem(item: unknown, index: number): InvoiceItem {
  const data =
    typeof item === 'object' && item !== null
      ? (item as Record<string, unknown>)
      : {}
  const quantity = Number(data.quantity ?? 0)
  const unitPrice = Number(data.unitPrice ?? 0)

  return {
    id: String(data.id ?? `item-${index}`),
    name: String(data.name ?? ''),
    quantity,
    unitPrice,
    amount: Number(data.amount ?? quantity * unitPrice),
  }
}

function mapInvoiceDocument(
  documentId: string,
  data: Record<string, unknown>,
): Invoice {
  const items = Array.isArray(data.items)
    ? data.items.map((item, index) => mapInvoiceItem(item, index))
    : []

  const status = isInvoiceStatus(data.status) ? data.status : 'draft'

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
    items,
    subtotal: Number(data.subtotal ?? 0),
    discount: Number(data.discount ?? 0),
    totalAmount: Number(data.totalAmount ?? 0),
    paidAmount: Number(data.paidAmount ?? 0),
    status,
    paymentStatus: isPaymentStatus(data.paymentStatus)
      ? data.paymentStatus
      : getFallbackPaymentStatus(status),
    paymentMethod: isPaymentMethod(data.paymentMethod)
      ? data.paymentMethod
      : undefined,
    paymentReference:
      typeof data.paymentReference === 'string'
        ? data.paymentReference
        : undefined,
    paidAt:
      data.paidAt && typeof data.paidAt === 'object'
        ? (data.paidAt as Invoice['paidAt'])
        : null,
    qrPayload: typeof data.qrPayload === 'string' ? data.qrPayload : null,
    note: typeof data.note === 'string' ? data.note : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function buildDemoQrPayload(invoice: Invoice, tenantName: string) {
  return `BOARDING_HOUSE_AI|INVOICE:${invoice.invoiceCode}|AMOUNT:${invoice.totalAmount}|TENANT:${tenantName}`
}

async function getTenantNotificationProfile(
  tenantId: string,
): Promise<TenantNotificationProfile | null> {
  if (!tenantId) {
    return null
  }

  const tenantSnapshot = await getDoc(doc(db, 'tenants', tenantId))

  if (!tenantSnapshot.exists()) {
    return null
  }

  const tenant = tenantSnapshot.data()

  return {
    id: tenantSnapshot.id,
    email: String(tenant.email ?? ''),
  }
}

async function createTenantInvoiceNotification(values: InvoiceFormValues) {
  try {
    const tenant = await getTenantNotificationProfile(values.tenantId)

    if (!tenant?.email) {
      console.warn('Tenant invoice notification skipped: tenant email was not found.')
      return
    }

    const tenantUserUid = await getUserUidByEmail(tenant.email)

    if (!tenantUserUid) {
      console.warn(
        `Tenant invoice notification skipped: no user found for ${tenant.email}.`,
      )
      return
    }

    await createNotification({
      userId: tenantUserUid,
      role: 'tenant',
      type: 'invoice',
      priority: 'high',
      title: 'New Invoice Available',
      message: `Your invoice ${values.invoiceCode} is ready.`,
      actionUrl: '/tenant/my-invoices',
    })
  } catch (error) {
    console.warn('Failed to create tenant notification for new invoice.', error)
  }
}

async function getInvoicesFromQuery(ownerId: string, sortByCreatedAt: boolean) {
  const invoicesQuery = sortByCreatedAt
    ? query(
        invoicesCollection,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
      )
    : query(invoicesCollection, where('ownerId', '==', ownerId))
  const snapshot = await getDocs(invoicesQuery)

  return snapshot.docs.map((invoiceDoc) =>
    mapInvoiceDocument(invoiceDoc.id, invoiceDoc.data()),
  )
}

export async function getInvoicesByOwner(ownerId: string): Promise<Invoice[]> {
  try {
    return await getInvoicesFromQuery(ownerId, true)
  } catch {
    return getInvoicesFromQuery(ownerId, false)
  }
}

export async function createInvoice(
  ownerId: string,
  values: InvoiceFormValues,
): Promise<string> {
  const totals = calculateTotals(values)
  const invoiceRef = await addDoc(invoicesCollection, {
    ...values,
    contractId: values.contractId || null,
    paidAmount: Number(values.paidAmount || 0),
    ownerId,
    ...totals,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await createTenantInvoiceNotification(values)

  return invoiceRef.id
}

export async function updateInvoice(
  invoiceId: string,
  values: Partial<InvoiceFormValues>,
): Promise<void> {
  const updateValues: Record<string, unknown> = {
    ...values,
    contractId: values.contractId || null,
    updatedAt: serverTimestamp(),
  }

  if (values.items && values.discount !== undefined) {
    Object.assign(updateValues, calculateTotals(values as InvoiceFormValues))
  }

  await updateDoc(doc(db, 'invoices', invoiceId), updateValues)
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  await deleteDoc(doc(db, 'invoices', invoiceId))
}

export async function markInvoiceAsPaid(invoiceId: string): Promise<void> {
  const invoiceRef = doc(db, 'invoices', invoiceId)
  const invoiceSnapshot = await getDoc(invoiceRef)

  if (!invoiceSnapshot.exists()) {
    throw new Error('Invoice not found.')
  }

  const invoice = mapInvoiceDocument(invoiceSnapshot.id, invoiceSnapshot.data())

  await updateDoc(invoiceRef, {
    status: 'paid',
    paymentStatus: 'paid',
    paymentMethod: 'manual',
    paymentReference: `MANUAL-${Date.now()}`,
    paidAmount: invoice.totalAmount,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function simulateDemoQrInvoicePayment(
  invoiceId: string,
  tenantName: string,
): Promise<void> {
  const invoiceRef = doc(db, 'invoices', invoiceId)
  const invoiceSnapshot = await getDoc(invoiceRef)

  if (!invoiceSnapshot.exists()) {
    throw new Error('Invoice not found.')
  }

  const invoice = mapInvoiceDocument(invoiceSnapshot.id, invoiceSnapshot.data())
  const paymentReference = `DEMO-${Date.now()}`
  const qrPayload = buildDemoQrPayload(invoice, tenantName)

  await updateDoc(invoiceRef, {
    status: 'paid',
    paymentStatus: 'paid',
    paymentMethod: 'demo_qr',
    paymentReference,
    paidAmount: invoice.totalAmount,
    paidAt: serverTimestamp(),
    qrPayload,
    updatedAt: serverTimestamp(),
  })

  try {
    await createNotification({
      userId: invoice.ownerId,
      role: 'owner',
      type: 'invoice',
      priority: 'medium',
      title: 'Invoice Paid',
      message: `${tenantName} paid invoice ${invoice.invoiceCode} via demo QR.`,
      actionUrl: '/owner/invoices',
    })
  } catch (notificationError) {
    console.warn('Owner invoice payment notification failed.', notificationError)
  }
}
