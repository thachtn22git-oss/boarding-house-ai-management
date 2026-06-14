import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { Tenant, TenantFormValues } from '../types'

const tenantsCollection = collection(db, 'tenants')

function mapTenantDocument(
  documentId: string,
  data: Record<string, unknown>,
): Tenant {
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
    status:
      data.status === 'inactive' || data.status === 'pending'
        ? data.status
        : 'active',
    moveInDate: String(data.moveInDate ?? ''),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

async function getTenantsFromQuery(ownerId: string, sortByCreatedAt: boolean) {
  const tenantsQuery = sortByCreatedAt
    ? query(
        tenantsCollection,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
      )
    : query(tenantsCollection, where('ownerId', '==', ownerId))
  const snapshot = await getDocs(tenantsQuery)

  return snapshot.docs.map((tenantDoc) =>
    mapTenantDocument(tenantDoc.id, tenantDoc.data()),
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

function sortTenantsByCreatedAt(tenants: Tenant[]) {
  return [...tenants].sort(
    (left, right) =>
      getTimestampValue(right.createdAt) - getTimestampValue(left.createdAt),
  )
}

export async function getTenantsByOwner(ownerId: string): Promise<Tenant[]> {
  try {
    return await getTenantsFromQuery(ownerId, true)
  } catch {
    return getTenantsFromQuery(ownerId, false)
  }
}

export function subscribeOwnerTenants(
  ownerId: string,
  callback: (tenants: Tenant[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const unsubscribe = onSnapshot(
    query(tenantsCollection, where('ownerId', '==', ownerId)),
    (snapshot) => {
      const tenants = sortTenantsByCreatedAt(
        snapshot.docs.map((tenantDoc) =>
          mapTenantDocument(tenantDoc.id, tenantDoc.data()),
        ),
      )
      if (import.meta.env.DEV) {
        console.debug('Owner tenants snapshot', {
          collection: 'tenants',
          ownerId,
          size: tenants.length,
        })
      }
      callback(tenants)
    },
    (error) => {
      console.warn('Realtime tenants subscription failed.', {
        collection: 'tenants',
        ownerId,
        code: 'code' in error ? error.code : undefined,
        message: error.message,
      })
      void getTenantsByOwner(ownerId).then(callback).catch((fallbackError) => {
        console.warn('Tenants fallback fetch failed.', fallbackError)
      })
      onError?.(error)
    },
  )

  if (import.meta.env.DEV) {
    console.debug('Subscribed to owner tenants')
  }

  return () => {
    unsubscribe()
    if (import.meta.env.DEV) {
      console.debug('Unsubscribed from owner tenants')
    }
  }
}

export async function createTenant(
  ownerId: string,
  values: TenantFormValues,
): Promise<string> {
  const tenantRef = await addDoc(tenantsCollection, {
    ...values,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return tenantRef.id
}

export async function updateTenant(
  tenantId: string,
  values: Partial<TenantFormValues>,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantId), {
    ...values,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTenant(tenantId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', tenantId))
}
