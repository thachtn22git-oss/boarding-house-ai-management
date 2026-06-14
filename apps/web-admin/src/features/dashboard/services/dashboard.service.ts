import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import { formatDate } from '../../../utils/format'
import {
  generateInsights,
  generateKPIAlerts,
  generateMonthlySummary,
  generatePriorityCenter,
  generateRecommendations,
  generateTrendAnalysis,
  type AIInsight,
  type AIRecommendation,
  type AITrend,
  type KPIAlert,
  type MonthlyAISummary,
  type PriorityCenter,
} from './analytics-ai.service'

export type DashboardActivity = {
  id: string
  title: string
  timestamp: string
  type: 'room' | 'tenant' | 'contract' | 'invoice' | 'utility' | 'feedback'
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
  aiInsights: AIInsight[]
  aiRecommendations: AIRecommendation[]
  aiTrends: AITrend[]
  monthlySummary: MonthlyAISummary
  priorityCenter: PriorityCenter
  kpiAlerts: KPIAlert[]
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

function isInvoicePaid(data: DocumentData) {
  return data.status === 'paid' || data.paymentStatus === 'paid'
}

function isInvoiceOverdue(data: DocumentData) {
  return data.status === 'overdue' && data.paymentStatus !== 'paid'
}

function getInvoicePaidAmount(data: DocumentData) {
  const paidAmount = Number(data.paidAmount ?? 0)
  return paidAmount > 0 ? paidAmount : Number(data.totalAmount ?? 0)
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

function buildOwnerDashboardStats(collections: {
  rooms: DashboardDocument[]
  tenants: DashboardDocument[]
  contracts: DashboardDocument[]
  invoices: DashboardDocument[]
  utilityReadings: DashboardDocument[]
  feedbacks: DashboardDocument[]
}): OwnerDashboardStats {
  const { rooms, tenants, contracts, invoices, utilityReadings, feedbacks } = collections
  const totalRooms = rooms.length
  const occupiedRooms = rooms.filter((room) => room.data.status === 'occupied').length
  const vacantRooms = rooms.filter((room) =>
    room.data.status === 'available' || room.data.status === 'vacant'
  ).length
  const maintenanceRooms = rooms.filter(
    (room) => room.data.status === 'maintenance',
  ).length
  const paidInvoices = invoices.filter((invoice) => isInvoicePaid(invoice.data))
  const unpaidInvoices = invoices.filter(
    (invoice) =>
      !isInvoicePaid(invoice.data) &&
      (invoice.data.status === 'unpaid' || invoice.data.paymentStatus === 'unpaid'),
  )
  const overdueInvoices = invoices.filter((invoice) =>
    isInvoiceOverdue(invoice.data),
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
      .filter((invoice) =>
        isCurrentMonth(invoice.data.paidAt ?? invoice.data.updatedAt ?? invoice.data.createdAt),
      )
      .reduce((sum, invoice) => sum + getInvoicePaidAmount(invoice.data), 0),
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
    aiInsights: generateInsights({
      rooms,
      tenants,
      contracts,
      invoices,
      utilityReadings,
      feedbacks,
    }),
    aiRecommendations: generateRecommendations({
      rooms,
      tenants,
      contracts,
      invoices,
      utilityReadings,
      feedbacks,
    }),
    aiTrends: generateTrendAnalysis({
      rooms,
      tenants,
      contracts,
      invoices,
      utilityReadings,
      feedbacks,
    }),
    monthlySummary: generateMonthlySummary({
      rooms,
      tenants,
      contracts,
      invoices,
      utilityReadings,
      feedbacks,
    }),
    priorityCenter: generatePriorityCenter({
      rooms,
      tenants,
      contracts,
      invoices,
      utilityReadings,
      feedbacks,
    }),
    kpiAlerts: generateKPIAlerts({
      rooms,
      tenants,
      contracts,
      invoices,
      utilityReadings,
      feedbacks,
    }),
  }
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

  return buildOwnerDashboardStats({
    rooms,
    tenants,
    contracts,
    invoices,
    utilityReadings,
    feedbacks,
  })
}

export function subscribeOwnerDashboardStats(
  ownerId: string,
  callback: (stats: OwnerDashboardStats) => void,
  onError?: (error: unknown) => void,
): () => void {
  const state: Record<CollectionKey, DashboardDocument[] | null> = {
    rooms: null,
    tenants: null,
    contracts: null,
    invoices: null,
    utilityReadings: null,
    feedbacks: null,
  }

  function maybeEmit() {
    if (
      state.rooms &&
      state.tenants &&
      state.contracts &&
      state.invoices &&
      state.utilityReadings &&
      state.feedbacks
    ) {
      callback(
        buildOwnerDashboardStats({
          rooms: state.rooms,
          tenants: state.tenants,
          contracts: state.contracts,
          invoices: state.invoices,
          utilityReadings: state.utilityReadings,
          feedbacks: state.feedbacks,
        }),
      )
    }
  }

  const unsubscribes = ([
    'rooms',
    'tenants',
    'contracts',
    'invoices',
    'utilityReadings',
    'feedbacks',
  ] as CollectionKey[]).map((collectionName) =>
    onSnapshot(
      query(collection(db, collectionName), where('ownerId', '==', ownerId)),
      (snapshot) => {
        state[collectionName] = snapshot.docs.map(mapSnapshotDocument)
        maybeEmit()
      },
      (error) => {
        console.warn(`Realtime dashboard ${collectionName} subscription failed.`, error)
        onError?.(error)
      },
    ),
  )

  if (import.meta.env.DEV) {
    console.debug('Subscribed to owner dashboard stats')
  }

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe())
    if (import.meta.env.DEV) {
      console.debug('Unsubscribed from owner dashboard stats')
    }
  }
}
