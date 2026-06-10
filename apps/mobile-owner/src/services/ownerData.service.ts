import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Contract, Feedback, Invoice, Room, Tenant, TenantWithRoom, UtilityReading } from '../types/models'

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
    .filter((invoice) => invoice.status === 'paid' && isCurrentBillingMonth(invoice.billingMonth))
    .reduce((total, invoice) => total + (invoice.totalAmount ?? 0), 0)

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

function isCurrentBillingMonth(billingMonth?: string) {
  if (!billingMonth) return false

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return billingMonth.startsWith(currentMonth)
}
