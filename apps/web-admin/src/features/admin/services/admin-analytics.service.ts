import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { OwnerSummary, TenantSummary, AdminUser } from '../types'

type AnalyticsCollectionKey = 'users' | 'rooms' | 'tenants' | 'contracts'

type AnalyticsCollections = Record<
  AnalyticsCollectionKey,
  Array<{ id: string; data: Record<string, unknown> }>
>

const analyticsCollections: AnalyticsCollectionKey[] = [
  'users',
  'rooms',
  'tenants',
  'contracts',
]

function isUserRole(value: unknown): value is AdminUser['role'] {
  return value === 'admin' || value === 'owner' || value === 'tenant'
}

function mapUser(id: string, data: Record<string, unknown>): AdminUser {
  return {
    id,
    uid: String(data.uid ?? id),
    fullName: String(data.fullName ?? 'User'),
    email: String(data.email ?? ''),
    role: isUserRole(data.role) ? data.role : 'tenant',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function getStatusLabel(status: unknown) {
  if (status === 'active') return 'Active'
  if (status === 'expired') return 'Expired'
  if (status === 'terminated') return 'Terminated'
  if (status === 'pending') return 'Pending'
  return 'No contract'
}

function calculateOwnerSummaries(collections: AnalyticsCollections): OwnerSummary[] {
  const users = collections.users.map((user) => mapUser(user.id, user.data))
  const owners = users.filter((user) => user.role === 'owner')

  return owners.map((owner) => ({
    user: owner,
    totalRooms: collections.rooms.filter(
      (room) => room.data.ownerId === owner.uid,
    ).length,
    totalTenants: collections.tenants.filter(
      (tenant) => tenant.data.ownerId === owner.uid,
    ).length,
    totalContracts: collections.contracts.filter(
      (contract) => contract.data.ownerId === owner.uid,
    ).length,
  }))
}

function calculateTenantSummaries(collections: AnalyticsCollections): TenantSummary[] {
  const roomsById = new Map(collections.rooms.map((room) => [room.id, room.data]))
  const activeContractByTenantId = new Map<string, Record<string, unknown>>()

  collections.contracts.forEach((contract) => {
    const tenantId = String(contract.data.tenantId ?? '')
    const existingContract = activeContractByTenantId.get(tenantId)

    if (!existingContract || contract.data.status === 'active') {
      activeContractByTenantId.set(tenantId, contract.data)
    }
  })

  return collections.tenants.map((tenant) => {
    const room = roomsById.get(String(tenant.data.roomId ?? ''))
    const contract = activeContractByTenantId.get(tenant.id)

    return {
      user: mapUser(tenant.id, {
        uid: tenant.id,
        fullName: tenant.data.fullName,
        email: tenant.data.email,
        role: 'tenant',
        createdAt: tenant.data.createdAt,
        updatedAt: tenant.data.updatedAt,
      }),
      tenantName: String(tenant.data.fullName ?? 'Tenant'),
      email: String(tenant.data.email ?? ''),
      room: room
        ? `${String(room.roomNumber ?? '')} - ${String(room.roomType ?? '')}`
        : 'No room assigned',
      contractStatus: getStatusLabel(contract?.status),
    }
  })
}

export function subscribeToAdminOwnerSummaries(
  callback: (owners: OwnerSummary[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return subscribeToAnalyticsCollections((collections) => {
    callback(calculateOwnerSummaries(collections))
  }, onError)
}

export function subscribeToAdminTenantSummaries(
  callback: (tenants: TenantSummary[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return subscribeToAnalyticsCollections((collections) => {
    callback(calculateTenantSummaries(collections))
  }, onError)
}

function subscribeToAnalyticsCollections(
  callback: (collections: AnalyticsCollections) => void,
  onError?: (error: unknown) => void,
): () => void {
  const collections: AnalyticsCollections = {
    users: [],
    rooms: [],
    tenants: [],
    contracts: [],
  }
  const loadedCollections = new Set<AnalyticsCollectionKey>()
  const unsubscribers: Unsubscribe[] = analyticsCollections.map((collectionName) =>
    onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        collections[collectionName] = snapshot.docs.map((documentSnapshot) => ({
          id: documentSnapshot.id,
          data: documentSnapshot.data(),
        }))
        loadedCollections.add(collectionName)

        if (loadedCollections.size === analyticsCollections.length) {
          callback(collections)
        }
      },
      (error) => {
        console.error(`Unable to load ${collectionName} analytics.`, error)
        onError?.(error)
      },
    ),
  )

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}
