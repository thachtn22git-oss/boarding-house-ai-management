import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import { formatCurrency, formatDate } from '../../../utils/format'

export type DashboardActivity = {
  id: string
  title: string
  timestamp: string
  type: 'room' | 'tenant' | 'contract' | 'invoice' | 'utility' | 'feedback'
}

export type DashboardInsight = {
  id: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'success' | 'danger'
}

export type OwnerDashboardStats = {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  maintenanceRooms: number
  totalTenants: number
  activeTenants: number
  totalContracts: number
  activeContracts: number
  expiringContracts: number
  totalInvoices: number
  paidInvoices: number
  unpaidInvoices: number
  overdueInvoices: number
  monthlyRevenue: number
  pendingAmount: number
  totalUtilityAmount: number
  totalFeedback: number
  newFeedback: number
  urgentFeedback: number
  negativeFeedback: number
  occupancyRate: number
  vacantRate: number
  recentActivities: DashboardActivity[]
  aiInsights: DashboardInsight[]
}

type DashboardDocument = {
  id: string
  data: DocumentData
}

type CollectionKey =
  | 'rooms'
  | 'tenants'
  | 'contracts'
  | 'invoices'
  | 'utilityReadings'
  | 'feedbacks'

async function getOwnerDocuments(
  collectionName: CollectionKey,
  ownerId: string,
): Promise<DashboardDocument[]> {
  const collectionRef = collection(db, collectionName)

  try {
    const snapshot = await getDocs(
      query(
        collectionRef,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
      ),
    )

    return snapshot.docs.map(mapSnapshotDocument)
  } catch {
    const snapshot = await getDocs(
      query(collectionRef, where('ownerId', '==', ownerId)),
    )

    return snapshot.docs.map(mapSnapshotDocument)
  }
}

function mapSnapshotDocument(
  documentSnapshot: QueryDocumentSnapshot<DocumentData>,
): DashboardDocument {
  return {
    id: documentSnapshot.id,
    data: documentSnapshot.data(),
  }
}

function getTimestampValue(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis()
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const date = (value as { toDate: () => Date }).toDate()
    return date.getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

function isCurrentMonth(value: unknown) {
  const timestamp = getTimestampValue(value)

  if (!timestamp) {
    return false
  }

  const date = new Date(timestamp)
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function isContractExpiring(endDate: unknown) {
  if (typeof endDate !== 'string') {
    return false
  }

  const endTime = new Date(endDate).getTime()

  if (Number.isNaN(endTime)) {
    return false
  }

  const now = new Date()
  const inThirtyDays = new Date()
  inThirtyDays.setDate(now.getDate() + 30)

  return endTime >= now.getTime() && endTime <= inThirtyDays.getTime()
}

function createActivity(
  document: DashboardDocument,
  type: DashboardActivity['type'],
  title: string,
): DashboardActivity & { sortValue: number } {
  const createdAt = document.data.createdAt
  const sortValue = getTimestampValue(createdAt)

  return {
    id: `${type}-${document.id}`,
    title,
    timestamp: sortValue ? formatDate(createdAt) : 'Recently',
    type,
    sortValue,
  }
}

function createActivities(collections: {
  rooms: DashboardDocument[]
  tenants: DashboardDocument[]
  contracts: DashboardDocument[]
  invoices: DashboardDocument[]
  utilityReadings: DashboardDocument[]
  feedbacks: DashboardDocument[]
}) {
  const activities = [
    ...collections.rooms.map((room) =>
      createActivity(
        room,
        'room',
        `Room ${String(room.data.roomNumber ?? '') || 'record'} was updated`,
      ),
    ),
    ...collections.tenants.map((tenant) =>
      createActivity(
        tenant,
        'tenant',
        `Tenant ${String(tenant.data.fullName ?? '') || 'profile'} was updated`,
      ),
    ),
    ...collections.contracts.map((contract) =>
      createActivity(
        contract,
        'contract',
        `Contract ${String(contract.data.contractCode ?? '') || 'record'} was updated`,
      ),
    ),
    ...collections.invoices.map((invoice) =>
      createActivity(
        invoice,
        'invoice',
        `Invoice ${String(invoice.data.invoiceCode ?? '') || 'record'} was updated`,
      ),
    ),
    ...collections.utilityReadings.map((utility) =>
      createActivity(
        utility,
        'utility',
        `${String(utility.data.utilityType ?? 'Utility')} reading was updated`,
      ),
    ),
    ...collections.feedbacks.map((feedback) =>
      createActivity(
        feedback,
        'feedback',
        `Feedback ${String(feedback.data.title ?? '') || 'record'} was updated`,
      ),
    ),
  ]

  return activities
    .sort((left, right) => right.sortValue - left.sortValue)
    .slice(0, 6)
}

function createInsights(stats: Omit<OwnerDashboardStats, 'recentActivities' | 'aiInsights'>) {
  const insights: DashboardInsight[] = []

  if (stats.occupancyRate >= 80) {
    insights.push({
      id: 'high-occupancy',
      title: 'High occupancy rate',
      description: 'Most rooms are currently occupied.',
      severity: 'success',
    })
  }

  if (stats.vacantRooms > 0) {
    insights.push({
      id: 'vacant-rooms',
      title: 'Vacant rooms available',
      description: `${stats.vacantRooms} rooms are available for new tenants.`,
      severity: 'info',
    })
  }

  if (stats.overdueInvoices > 0) {
    insights.push({
      id: 'overdue-invoices',
      title: 'Overdue invoices need attention',
      description: `${stats.overdueInvoices} invoices are currently overdue.`,
      severity: 'danger',
    })
  }

  if (stats.expiringContracts > 0) {
    insights.push({
      id: 'expiring-contracts',
      title: 'Contracts expiring soon',
      description: `${stats.expiringContracts} active contracts end within 30 days.`,
      severity: 'warning',
    })
  }

  if (stats.urgentFeedback > 0) {
    insights.push({
      id: 'urgent-feedback',
      title: 'Urgent feedback requires action',
      description: `${stats.urgentFeedback} urgent feedback items need review.`,
      severity: 'danger',
    })
  }

  if (stats.monthlyRevenue > 0) {
    insights.push({
      id: 'monthly-revenue',
      title: 'Revenue activity detected',
      description: `${formatCurrency(stats.monthlyRevenue)} was collected this month.`,
      severity: 'success',
    })
  }

  return insights
}

export async function getOwnerDashboardStats(
  ownerId: string,
): Promise<OwnerDashboardStats> {
  const [rooms, tenants, contracts, invoices, utilityReadings, feedbacks] =
    await Promise.all([
      getOwnerDocuments('rooms', ownerId),
      getOwnerDocuments('tenants', ownerId),
      getOwnerDocuments('contracts', ownerId),
      getOwnerDocuments('invoices', ownerId),
      getOwnerDocuments('utilityReadings', ownerId),
      getOwnerDocuments('feedbacks', ownerId),
    ])

  const totalRooms = rooms.length
  const occupiedRooms = rooms.filter((room) => room.data.status === 'occupied').length
  const vacantRooms = rooms.filter((room) => room.data.status === 'available').length
  const maintenanceRooms = rooms.filter(
    (room) => room.data.status === 'maintenance',
  ).length
  const paidInvoices = invoices.filter((invoice) => invoice.data.status === 'paid')
  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.data.status === 'unpaid',
  )
  const overdueInvoices = invoices.filter(
    (invoice) => invoice.data.status === 'overdue',
  )

  const baseStats = {
    totalRooms,
    occupiedRooms,
    vacantRooms,
    maintenanceRooms,
    totalTenants: tenants.length,
    activeTenants: tenants.filter((tenant) => tenant.data.status === 'active').length,
    totalContracts: contracts.length,
    activeContracts: contracts.filter((contract) => contract.data.status === 'active')
      .length,
    expiringContracts: contracts.filter(
      (contract) =>
        contract.data.status === 'active' && isContractExpiring(contract.data.endDate),
    ).length,
    totalInvoices: invoices.length,
    paidInvoices: paidInvoices.length,
    unpaidInvoices: unpaidInvoices.length,
    overdueInvoices: overdueInvoices.length,
    monthlyRevenue: paidInvoices
      .filter((invoice) => isCurrentMonth(invoice.data.updatedAt ?? invoice.data.createdAt))
      .reduce((sum, invoice) => sum + Number(invoice.data.totalAmount ?? 0), 0),
    pendingAmount: [...unpaidInvoices, ...overdueInvoices].reduce(
      (sum, invoice) =>
        sum +
        Math.max(
          Number(invoice.data.totalAmount ?? 0) -
            Number(invoice.data.paidAmount ?? 0),
          0,
        ),
      0,
    ),
    totalUtilityAmount: utilityReadings.reduce(
      (sum, reading) => sum + Number(reading.data.totalAmount ?? 0),
      0,
    ),
    totalFeedback: feedbacks.length,
    newFeedback: feedbacks.filter((feedback) => feedback.data.status === 'new').length,
    urgentFeedback: feedbacks.filter((feedback) => feedback.data.priority === 'urgent')
      .length,
    negativeFeedback: feedbacks.filter(
      (feedback) => feedback.data.sentiment === 'negative',
    ).length,
    occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
    vacantRate: totalRooms > 0 ? (vacantRooms / totalRooms) * 100 : 0,
  }

  return {
    ...baseStats,
    recentActivities: createActivities({
      rooms,
      tenants,
      contracts,
      invoices,
      utilityReadings,
      feedbacks,
    }),
    aiInsights: createInsights(baseStats),
  }
}
