import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import { generateVietQRUrlForUtility } from '../../../utils/demo-payment'
import { createNotification } from '../../notifications/services/notification.service'
import { getUserUidByEmail } from '../../notifications/services/user-resolution.service'
import type {
  UtilityReading,
  UtilityReadingFormValues,
  UtilityPaymentMethod,
  UtilityPaymentStatus,
  UtilityQRProvider,
  UtilityReadingStatus,
  UtilityType,
} from '../types'

const utilityReadingsCollection = collection(db, 'utilityReadings')

type TenantNotificationProfile = {
  id: string
  email: string
}

function isUtilityType(value: unknown): value is UtilityType {
  return value === 'electricity' || value === 'water'
}

function isUtilityReadingStatus(value: unknown): value is UtilityReadingStatus {
  return (
    value === 'draft' ||
    value === 'confirmed' ||
    value === 'billed' ||
    value === 'paid' ||
    value === 'billed_paid'
  )
}

function isUtilityPaymentStatus(value: unknown): value is UtilityPaymentStatus {
  return value === 'unpaid' || value === 'pending' || value === 'paid' || value === 'failed'
}

function isUtilityPaymentMethod(value: unknown): value is UtilityPaymentMethod {
  return value === 'manual' || value === 'demo_vietqr'
}

function isUtilityQRProvider(value: unknown): value is UtilityQRProvider {
  return value === 'vietqr_demo'
}

function getFallbackPaymentStatus(status: UtilityReadingStatus): UtilityPaymentStatus {
  if (status === 'paid' || status === 'billed_paid') {
    return 'paid'
  }

  if (status === 'billed' || status === 'confirmed') {
    return 'unpaid'
  }

  return 'unpaid'
}

function calculateUtility(values: {
  previousReading: number
  currentReading: number
  unitPrice: number
}) {
  const previousReading = Number(values.previousReading)
  const currentReading = Number(values.currentReading)
  const unitPrice = Number(values.unitPrice)
  const usage = currentReading - previousReading

  if (currentReading < previousReading || usage < 0) {
    throw new Error('Current reading must be greater than or equal to previous reading.')
  }

  return {
    previousReading,
    currentReading,
    unitPrice,
    usage,
    totalAmount: usage * unitPrice,
  }
}

function mapUtilityReadingDocument(
  documentId: string,
  data: Record<string, unknown>,
): UtilityReading {
  const status = isUtilityReadingStatus(data.status) ? data.status : 'draft'

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
    status,
    paymentStatus: isUtilityPaymentStatus(data.paymentStatus)
      ? data.paymentStatus
      : getFallbackPaymentStatus(status),
    paymentMethod: isUtilityPaymentMethod(data.paymentMethod)
      ? data.paymentMethod
      : undefined,
    paymentReference:
      typeof data.paymentReference === 'string'
        ? data.paymentReference
        : null,
    paidAt:
      data.paidAt && typeof data.paidAt === 'object'
        ? (data.paidAt as UtilityReading['paidAt'])
        : null,
    paidAmount:
      typeof data.paidAmount === 'number' ? data.paidAmount : undefined,
    qrProvider: isUtilityQRProvider(data.qrProvider) ? data.qrProvider : undefined,
    qrPayload: typeof data.qrPayload === 'string' ? data.qrPayload : null,
    note: typeof data.note === 'string' ? data.note : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export function buildDemoVietQRUtilityUrl(
  reading: Pick<UtilityReading, 'id' | 'billingMonth' | 'totalAmount'>,
  roomNumber?: string,
) {
  return generateVietQRUrlForUtility({ ...reading, roomNumber })
}

async function getTenantNotificationProfile(
  tenantId: string | undefined,
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

async function createTenantUtilityNotification(reading: UtilityReading) {
  try {
    const tenant = await getTenantNotificationProfile(reading.tenantId)

    if (!tenant?.email) {
      console.warn('Tenant utility notification skipped: tenant email was not found.')
      return
    }

    const tenantUserUid = await getUserUidByEmail(tenant.email)

    if (!tenantUserUid) {
      console.warn(
        `Tenant utility notification skipped: no user found for ${tenant.email}.`,
      )
      return
    }

    await createNotification({
      userId: tenantUserUid,
      role: 'tenant',
      type: 'utility',
      priority: 'medium',
      title: 'Utility Bill Updated',
      message: `A utility reading for ${reading.billingMonth} has been updated.`,
      actionUrl: '/tenant/my-utilities',
    })
  } catch (error) {
    console.warn('Failed to create tenant notification for utility update.', error)
  }
}

async function getUtilityReadingsFromQuery(
  ownerId: string,
  sortByCreatedAt: boolean,
) {
  const readingsQuery = sortByCreatedAt
    ? query(
        utilityReadingsCollection,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
      )
    : query(utilityReadingsCollection, where('ownerId', '==', ownerId))
  const snapshot = await getDocs(readingsQuery)

  return snapshot.docs.map((readingDoc) =>
    mapUtilityReadingDocument(readingDoc.id, readingDoc.data()),
  )
}

function getTimestampValue(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

function sortUtilityReadingsByCreatedAt(readings: UtilityReading[]) {
  return [...readings].sort(
    (left, right) =>
      getTimestampValue(right.createdAt) - getTimestampValue(left.createdAt),
  )
}

export async function getUtilityReadingsByOwner(
  ownerId: string,
): Promise<UtilityReading[]> {
  try {
    return await getUtilityReadingsFromQuery(ownerId, true)
  } catch {
    return getUtilityReadingsFromQuery(ownerId, false)
  }
}

function subscribeUtilityReadingsByField(
  field: 'ownerId' | 'tenantId',
  value: string,
  callback: (readings: UtilityReading[]) => void,
  onError?: (error: unknown) => void,
  label = 'utility readings',
): () => void {
  const unsubscribe = onSnapshot(
    query(utilityReadingsCollection, where(field, '==', value)),
    (snapshot) => {
      const readings = sortUtilityReadingsByCreatedAt(
        snapshot.docs.map((readingDoc) =>
          mapUtilityReadingDocument(readingDoc.id, readingDoc.data()),
        ),
      )
      if (import.meta.env.DEV) {
        console.debug(`${label} snapshot`, {
          collection: 'utilityReadings',
          field,
          value,
          size: readings.length,
        })
      }
      callback(readings)
    },
    (error) => {
      console.warn(`Realtime ${label} subscription failed.`, {
        collection: 'utilityReadings',
        field,
        value,
        code: 'code' in error ? error.code : undefined,
        message: error.message,
      })
      const fallback =
        field === 'ownerId'
          ? getUtilityReadingsByOwner(value)
          : getDocs(query(utilityReadingsCollection, where(field, '==', value))).then((snapshot) =>
              sortUtilityReadingsByCreatedAt(
                snapshot.docs.map((readingDoc) =>
                  mapUtilityReadingDocument(readingDoc.id, readingDoc.data()),
                ),
              ),
            )
      void fallback.then(callback).catch((fallbackError) => {
        console.warn(`${label} fallback fetch failed.`, fallbackError)
      })
      onError?.(error)
    },
  )

  if (import.meta.env.DEV) {
    console.debug(`Subscribed to ${label}`)
  }

  return () => {
    unsubscribe()
    if (import.meta.env.DEV) {
      console.debug(`Unsubscribed from ${label}`)
    }
  }
}

export function subscribeOwnerUtilityReadings(
  ownerId: string,
  callback: (readings: UtilityReading[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return subscribeUtilityReadingsByField(
    'ownerId',
    ownerId,
    callback,
    onError,
    'owner utility readings',
  )
}

export function subscribeTenantUtilityReadings(
  tenantId: string,
  callback: (readings: UtilityReading[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return subscribeUtilityReadingsByField(
    'tenantId',
    tenantId,
    callback,
    onError,
    'tenant utility readings',
  )
}

export async function createUtilityReading(
  ownerId: string,
  values: UtilityReadingFormValues,
): Promise<string> {
  const calculatedValues = calculateUtility(values)
  const readingRef = await addDoc(utilityReadingsCollection, {
    ...values,
    tenantId: values.tenantId || null,
    note: values.note || null,
    ownerId,
    ...calculatedValues,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return readingRef.id
}

export async function updateUtilityReading(
  readingId: string,
  values: Partial<UtilityReadingFormValues>,
): Promise<void> {
  const readingRef = doc(db, 'utilityReadings', readingId)
  const readingSnapshot = await getDoc(readingRef)

  if (!readingSnapshot.exists()) {
    throw new Error('Utility reading not found.')
  }

  const currentReading = mapUtilityReadingDocument(
    readingSnapshot.id,
    readingSnapshot.data(),
  )
  const mergedValues = {
    ...currentReading,
    ...values,
  }
  const calculatedValues = calculateUtility(mergedValues)

  await updateDoc(readingRef, {
    ...values,
    tenantId: values.tenantId || null,
    note: values.note || null,
    ...calculatedValues,
    updatedAt: serverTimestamp(),
  })

  if (
    values.status &&
    (values.status === 'confirmed' || values.status === 'billed') &&
    values.status !== currentReading.status
  ) {
    await createTenantUtilityNotification({
      ...mergedValues,
      ...calculatedValues,
      status: values.status,
    })
  }
}

export async function deleteUtilityReading(readingId: string): Promise<void> {
  await deleteDoc(doc(db, 'utilityReadings', readingId))
}

export async function confirmUtilityReading(readingId: string): Promise<void> {
  const readingRef = doc(db, 'utilityReadings', readingId)
  const readingSnapshot = await getDoc(readingRef)

  if (!readingSnapshot.exists()) {
    throw new Error('Utility reading not found.')
  }

  const reading = mapUtilityReadingDocument(
    readingSnapshot.id,
    readingSnapshot.data(),
  )

  await updateDoc(readingRef, {
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  })

  await createTenantUtilityNotification({
    ...reading,
    status: 'confirmed',
  })
}

export async function markUtilityReadingAsBilled(
  readingId: string,
): Promise<void> {
  const readingRef = doc(db, 'utilityReadings', readingId)
  const readingSnapshot = await getDoc(readingRef)

  if (!readingSnapshot.exists()) {
    throw new Error('Utility reading not found.')
  }

  const reading = mapUtilityReadingDocument(
    readingSnapshot.id,
    readingSnapshot.data(),
  )

  await updateDoc(readingRef, {
    status: 'billed',
    updatedAt: serverTimestamp(),
  })

  await createTenantUtilityNotification({
    ...reading,
    status: 'billed',
  })
}

export async function simulateDemoVietQRUtilityPayment(
  readingId: string,
  tenantName: string,
  roomNumber?: string,
): Promise<void> {
  const readingRef = doc(db, 'utilityReadings', readingId)
  const readingSnapshot = await getDoc(readingRef)

  if (!readingSnapshot.exists()) {
    throw new Error('Utility reading not found.')
  }

  const reading = mapUtilityReadingDocument(
    readingSnapshot.id,
    readingSnapshot.data(),
  )
  const qrPayload = buildDemoVietQRUtilityUrl(reading, roomNumber)

  await updateDoc(readingRef, {
    paymentStatus: 'paid',
    paymentMethod: 'demo_vietqr',
    paymentReference: `DEMO-VIETQR-UTILITY-${Date.now()}`,
    paidAmount: reading.totalAmount,
    paidAt: serverTimestamp(),
    qrProvider: 'vietqr_demo',
    qrPayload,
    status: 'paid',
    updatedAt: serverTimestamp(),
  })

  try {
    await createNotification({
      userId: reading.ownerId,
      role: 'owner',
      type: 'utility',
      priority: 'medium',
      title: 'Utility Bill Paid',
      message: `${tenantName} completed demo VietQR payment for ${reading.utilityType} utility bill.`,
      read: false,
      actionUrl: '/owner/utilities',
    })
  } catch (notificationError) {
    console.warn('Owner utility payment notification failed.', notificationError)
  }
}
