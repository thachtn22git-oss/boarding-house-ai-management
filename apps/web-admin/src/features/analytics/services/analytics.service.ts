import {
  collection,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import {
  getSupabaseErrorMessage,
  isSupabaseConfigured,
  logSupabaseError,
  supabase,
} from '../../../lib/supabase'
import type {
  AnalyticsData,
  AnalyticsScope,
  ChartPoint,
  DateRangeFilter,
  MonthlyRevenuePoint,
  TopRoomAnalytics,
  UtilityTrendPoint,
} from '../types'

type AnalyticsCollectionKey =
  | 'rooms'
  | 'tenants'
  | 'contracts'
  | 'invoices'
  | 'utilityReadings'
  | 'feedbacks'

type AnalyticsCollections = Record<
  AnalyticsCollectionKey,
  QueryDocumentSnapshot<DocumentData>[]
>

const analyticsCollections: AnalyticsCollectionKey[] = [
  'rooms',
  'tenants',
  'contracts',
  'invoices',
  'utilityReadings',
  'feedbacks',
]

function getTimestampValue(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  return 0
}

function getDateValue(data: DocumentData) {
  return (
    getTimestampValue(data.updatedAt) ||
    getTimestampValue(data.createdAt) ||
    getTimestampValue(data.issueDate) ||
    getTimestampValue(data.startDate) ||
    getTimestampValue(data.moveInDate) ||
    getTimestampValue(data.billingMonth)
  )
}

function getRangeBounds(filter: DateRangeFilter) {
  const now = new Date()
  const end = filter.endDate ? new Date(filter.endDate) : now
  const start = new Date(now)

  if (filter.preset === 'all') {
    return { start: null, end: null }
  }

  if (filter.preset === 'custom') {
    return {
      start: filter.startDate ? new Date(filter.startDate) : null,
      end,
    }
  }

  if (filter.preset === 'last30') start.setDate(now.getDate() - 30)
  if (filter.preset === 'last90') start.setDate(now.getDate() - 90)
  if (filter.preset === 'last6Months') start.setMonth(now.getMonth() - 6)
  if (filter.preset === 'last12Months') start.setMonth(now.getMonth() - 12)

  return { start, end }
}

function isWithinRange(data: DocumentData, filter: DateRangeFilter) {
  if (filter.preset === 'all') return true

  const timestamp = getDateValue(data)
  const { start, end } = getRangeBounds(filter)

  if (!timestamp) return false
  if (start && timestamp < start.getTime()) return false
  if (end && timestamp > end.getTime() + 86_399_999) return false

  return true
}

function filterByScope(
  docs: QueryDocumentSnapshot<DocumentData>[],
  scope: AnalyticsScope,
) {
  if (scope.type === 'admin') return docs

  return docs.filter((documentSnapshot) => documentSnapshot.data().ownerId === scope.ownerId)
}

function toRows(
  docs: QueryDocumentSnapshot<DocumentData>[],
  scope: AnalyticsScope,
  filter: DateRangeFilter,
) {
  return filterByScope(docs, scope)
    .map((documentSnapshot) => ({
      id: documentSnapshot.id,
      data: documentSnapshot.data(),
    }))
    .filter((row) => isWithinRange(row.data, filter))
}

function getMonthKey(value: unknown) {
  const timestamp = getTimestampValue(value)
  const date = timestamp ? new Date(timestamp) : new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getYearKey(value: unknown) {
  const timestamp = getTimestampValue(value)
  const date = timestamp ? new Date(timestamp) : new Date()

  return String(date.getFullYear())
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
  }).format(date)
}

function groupSumBy<T>(
  rows: T[],
  getKey: (row: T) => string,
  getValue: (row: T) => number,
) {
  const groups = new Map<string, number>()

  rows.forEach((row) => {
    const key = getKey(row)
    groups.set(key, (groups.get(key) ?? 0) + getValue(row))
  })

  return groups
}

function getStatusCount(rows: Array<{ data: DocumentData }>, statuses: string[]) {
  return rows.filter((row) => statuses.includes(String(row.data.status ?? ''))).length
}

function isCurrentMonth(value: unknown) {
  const timestamp = getTimestampValue(value)
  if (!timestamp) return false

  const date = new Date(timestamp)
  const now = new Date()

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function isToday(value: unknown) {
  const timestamp = getTimestampValue(value)
  if (!timestamp) return false

  const date = new Date(timestamp)
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isContractExpiringSoon(data: DocumentData) {
  if (data.status !== 'active') return false

  const endTime = getTimestampValue(data.endDate)
  if (!endTime) return false

  const now = Date.now()
  const inThirtyDays = new Date()
  inThirtyDays.setDate(new Date().getDate() + 30)

  return endTime >= now && endTime <= inThirtyDays.getTime()
}

function formatDistributionLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getEffectiveCategory(data: DocumentData) {
  const category = data.aiSuggestedCategory ?? data.category

  return typeof category === 'string' && category ? category : null
}

function getEffectivePriority(data: DocumentData) {
  const priority = data.priority ?? data.aiSuggestedPriority

  return typeof priority === 'string' && priority ? priority : null
}

function needsAIAnalysis(data: DocumentData) {
  return !data.sentiment || !getEffectivePriority(data) || !getEffectiveCategory(data)
}

function createStatusDistribution(
  rows: Array<{ data: DocumentData }>,
  labels: string[],
) {
  return labels.map((status) => ({
    label: status,
    value: rows.filter((row) => String(row.data.status ?? '').toLowerCase() === status.toLowerCase()).length,
  }))
}

function paidInvoiceDate(data: DocumentData) {
  return data.updatedAt ?? data.createdAt ?? data.issueDate
}

export function getRevenueAnalytics(
  invoices: Array<{ id: string; data: DocumentData }>,
) {
  const paidInvoices = invoices.filter((invoice) => invoice.data.status === 'paid')
  const monthlyGroups = groupSumBy(
    paidInvoices,
    (invoice) => getMonthKey(paidInvoiceDate(invoice.data)),
    (invoice) => Number(invoice.data.totalAmount ?? 0),
  )
  const yearlyGroups = groupSumBy(
    paidInvoices,
    (invoice) => getYearKey(paidInvoiceDate(invoice.data)),
    (invoice) => Number(invoice.data.totalAmount ?? 0),
  )
  const monthly = [...monthlyGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, revenue]): MonthlyRevenuePoint => ({
      month: getMonthLabel(month),
      revenue,
    }))
  const yearly = [...yearlyGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]): ChartPoint => ({ label, value }))
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`
  const currentMonthRevenue = monthlyGroups.get(currentMonthKey) ?? 0
  const previousMonthRevenue = monthlyGroups.get(previousMonthKey) ?? 0
  const growthPercent =
    previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : currentMonthRevenue > 0
        ? 100
        : 0

  return {
    monthly,
    yearly,
    currentMonthRevenue,
    previousMonthRevenue,
    growthPercent,
    totalRevenue: paidInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.data.totalAmount ?? 0),
      0,
    ),
  }
}

export function getOccupancyAnalytics(rooms: Array<{ id: string; data: DocumentData }>) {
  const occupiedRooms = rooms.filter((room) => room.data.status === 'occupied').length
  const vacantRooms = rooms.filter((room) => {
    const status = room.data.status
    return status === 'available' || status === 'vacant'
  }).length
  const occupancyRate = rooms.length > 0 ? (occupiedRooms / rooms.length) * 100 : 0

  return {
    totalRooms: rooms.length,
    occupiedRooms,
    vacantRooms,
    occupancyRate,
    distribution: [
      { label: 'Occupied Rooms', value: occupiedRooms },
      { label: 'Vacant Rooms', value: vacantRooms },
    ],
  }
}

export function getContractAnalytics(
  contracts: Array<{ id: string; data: DocumentData }>,
) {
  return {
    total: contracts.length,
    active: getStatusCount(contracts, ['active']),
    expired: getStatusCount(contracts, ['expired']),
    expiringSoon: contracts.filter((contract) => isContractExpiringSoon(contract.data)).length,
    byStatus: createStatusDistribution(contracts, [
      'Active',
      'Pending',
      'Expired',
      'Terminated',
    ]),
  }
}

export function getInvoiceAnalytics(
  invoices: Array<{ id: string; data: DocumentData }>,
) {
  return {
    paid: getStatusCount(invoices, ['paid']),
    pending: getStatusCount(invoices, ['pending', 'unpaid', 'draft']),
    overdue: getStatusCount(invoices, ['overdue']),
    byStatus: [
      { label: 'Paid', value: getStatusCount(invoices, ['paid']) },
      { label: 'Pending', value: getStatusCount(invoices, ['pending', 'unpaid', 'draft']) },
      { label: 'Overdue', value: getStatusCount(invoices, ['overdue']) },
      { label: 'Cancelled', value: getStatusCount(invoices, ['cancelled']) },
    ],
  }
}

export function getFeedbackAnalytics(
  feedbacks: Array<{ id: string; data: DocumentData }>,
) {
  const positive = feedbacks.filter((feedback) => feedback.data.sentiment === 'positive').length
  const neutral = feedbacks.filter((feedback) => feedback.data.sentiment === 'neutral').length
  const negative = feedbacks.filter((feedback) => feedback.data.sentiment === 'negative').length
  const pendingAI = feedbacks.filter((feedback) => needsAIAnalysis(feedback.data)).length
  const aiAnalyzed = feedbacks.filter((feedback) => feedback.data.aiGenerated === true).length
  const urgent = feedbacks.filter((feedback) => getEffectivePriority(feedback.data) === 'urgent').length
  const categoryGroups = groupSumBy(
    feedbacks,
    (feedback) => getEffectiveCategory(feedback.data) ?? 'pending',
    () => 1,
  )
  const priorityGroups = groupSumBy(
    feedbacks,
    (feedback) => getEffectivePriority(feedback.data) ?? 'pending',
    () => 1,
  )
  const statusByPriorityGroups = groupSumBy(
    feedbacks,
    (feedback) => {
      const status = String(feedback.data.status ?? 'new')
      const priority = getEffectivePriority(feedback.data) ?? 'pending'

      return `${formatDistributionLabel(status)} / ${formatDistributionLabel(priority)}`
    },
    () => 1,
  )
  const categoryLabels = [
    'electricity',
    'water',
    'internet',
    'security',
    'cleanliness',
    'maintenance',
    'billing',
    'other',
    'pending',
  ]
  const priorityLabels = ['low', 'medium', 'high', 'urgent', 'pending']

  return {
    total: feedbacks.length,
    resolved: getStatusCount(feedbacks, ['resolved']),
    pending: getStatusCount(feedbacks, ['new', 'in_review']),
    aiAnalyzed,
    urgent,
    negative,
    positive,
    neutral,
    pendingAI,
    sentimentDistribution: [
      { label: 'Positive', value: positive },
      { label: 'Neutral', value: neutral },
      { label: 'Negative', value: negative },
      { label: 'Pending AI', value: pendingAI },
    ],
    categoryDistribution: categoryLabels.map((label) => ({
      label: label === 'pending' ? 'Pending AI' : formatDistributionLabel(label),
      value: categoryGroups.get(label) ?? 0,
    })),
    priorityDistribution: priorityLabels.map((label) => ({
      label: label === 'pending' ? 'Pending AI' : formatDistributionLabel(label),
      value: priorityGroups.get(label) ?? 0,
    })),
    statusByPriority: [...statusByPriorityGroups.entries()].map(
      ([label, value]) => ({ label, value }),
    ),
  }
}

export function getUtilityAnalytics(
  utilities: Array<{ id: string; data: DocumentData }>,
) {
  const monthlyGroups = new Map<string, UtilityTrendPoint>()

  utilities.forEach((utility) => {
    const monthKey = String(utility.data.billingMonth || getMonthKey(utility.data.createdAt))
    const existing = monthlyGroups.get(monthKey) ?? {
      month: getMonthLabel(monthKey),
      electricity: 0,
      water: 0,
    }
    const usage = Number(utility.data.usage ?? 0)

    if (utility.data.utilityType === 'water') {
      existing.water += usage
    } else {
      existing.electricity += usage
    }

    monthlyGroups.set(monthKey, existing)
  })

  const electricityReadings = utilities.filter(
    (utility) => utility.data.utilityType === 'electricity',
  )
  const waterReadings = utilities.filter((utility) => utility.data.utilityType === 'water')
  const trend = [...monthlyGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, point]) => point)

  return {
    trend,
    averageElectricityUsage:
      electricityReadings.length > 0
        ? electricityReadings.reduce((sum, utility) => sum + Number(utility.data.usage ?? 0), 0) /
          electricityReadings.length
        : 0,
    averageWaterUsage:
      waterReadings.length > 0
        ? waterReadings.reduce((sum, utility) => sum + Number(utility.data.usage ?? 0), 0) /
          waterReadings.length
        : 0,
  }
}

function getTenantAnalytics(tenants: Array<{ id: string; data: DocumentData }>) {
  const growthGroups = groupSumBy(
    tenants,
    (tenant) => getMonthKey(tenant.data.createdAt ?? tenant.data.moveInDate),
    () => 1,
  )

  return {
    total: tenants.length,
    newThisMonth: tenants.filter((tenant) =>
      isCurrentMonth(tenant.data.createdAt ?? tenant.data.moveInDate),
    ).length,
    active: tenants.filter((tenant) => tenant.data.status === 'active').length,
    growthTrend: [...growthGroups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, value]) => ({ label: getMonthLabel(label), value })),
  }
}

function getQuestionTypeLabel(intent: unknown) {
  if (intent === 'monthly_revenue') return 'revenue'
  if (intent === 'overdue_invoices') return 'invoices'
  if (intent === 'expiring_contracts') return 'contracts'
  if (intent === 'room_availability') return 'rooms'
  if (intent === 'urgent_feedback' || intent === 'feedback_summary') return 'feedback'
  if (intent === 'utility_summary') return 'utilities'

  return 'unknown'
}

function buildAIUsageAnalytics(
  totalConversations: number,
  usageLogs: Array<{ intent?: unknown; created_at?: unknown }>,
) {
  const questionTypes = ['revenue', 'invoices', 'contracts', 'rooms', 'feedback', 'utilities', 'unknown']
  const typeCounts = new Map(questionTypes.map((label) => [label, 0]))

  usageLogs.forEach((message) => {
    const label = getQuestionTypeLabel(message.intent)
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1)
  })

  return {
    supabaseConfigured: true,
    totalQuestions: usageLogs.length,
    totalConversations,
    questionsToday: usageLogs.filter((message) => isToday(message.created_at)).length,
    averageQuestionsPerConversation:
      totalConversations > 0 ? usageLogs.length / totalConversations : 0,
    mostAskedQuestionTypes: questionTypes.map((label) => ({
      label: formatDistributionLabel(label),
      value: typeCounts.get(label) ?? 0,
    })),
  }
}

function emptyAIUsageAnalytics(supabaseConfigured: boolean, error?: string) {
  return {
    supabaseConfigured,
    error,
    totalQuestions: 0,
    totalConversations: 0,
    questionsToday: 0,
    averageQuestionsPerConversation: 0,
    mostAskedQuestionTypes: ['revenue', 'invoices', 'contracts', 'rooms', 'feedback', 'utilities', 'unknown'].map((label) => ({
      label: formatDistributionLabel(label),
      value: 0,
    })),
  }
}

async function getAIUsageFromSupabase(
  scope: AnalyticsScope,
  filter: DateRangeFilter,
) {
  if (!supabase || !isSupabaseConfigured) {
    return emptyAIUsageAnalytics(false, 'AI usage analytics requires Supabase configuration.')
  }

  console.info('Loading analytics...', { source: 'supabase_ai_usage', scope })

  const { start, end } = getRangeBounds(filter)
  let conversationsQuery = supabase
    .from('ai_conversations')
    .select('id, owner_id, created_at, updated_at')
  let logsQuery = supabase
    .from('ai_usage_logs')
    .select('id, owner_id, intent, created_at')

  if (scope.type === 'owner' && scope.ownerId) {
    conversationsQuery = conversationsQuery.eq('owner_id', scope.ownerId)
    logsQuery = logsQuery.eq('owner_id', scope.ownerId)
  }

  if (filter.preset !== 'all') {
    if (start) {
      conversationsQuery = conversationsQuery.gte('created_at', start.toISOString())
      logsQuery = logsQuery.gte('created_at', start.toISOString())
    }

    if (end) {
      const inclusiveEnd = new Date(end.getTime() + 86_399_999)
      conversationsQuery = conversationsQuery.lte('created_at', inclusiveEnd.toISOString())
      logsQuery = logsQuery.lte('created_at', inclusiveEnd.toISOString())
    }
  }

  const [conversationResult, logResult] = await Promise.all([
    conversationsQuery,
    logsQuery,
  ])

  if (conversationResult.error) {
    logSupabaseError('Loading AI usage conversations', conversationResult.error)
    return emptyAIUsageAnalytics(true, getSupabaseErrorMessage(conversationResult.error))
  }
  if (logResult.error) {
    logSupabaseError('Loading AI usage logs', logResult.error)
    return emptyAIUsageAnalytics(true, getSupabaseErrorMessage(logResult.error))
  }

  console.info('Analytics loaded.', {
    source: 'supabase_ai_usage',
    conversations: conversationResult.data?.length ?? 0,
    logs: logResult.data?.length ?? 0,
  })
  return buildAIUsageAnalytics(
    conversationResult.data?.length ?? 0,
    (logResult.data ?? []) as Array<{ intent?: unknown; created_at?: unknown }>,
  )
}

function getTopRooms(
  rooms: Array<{ id: string; data: DocumentData }>,
  contracts: Array<{ id: string; data: DocumentData }>,
  invoices: Array<{ id: string; data: DocumentData }>,
) {
  return rooms
    .map((room): TopRoomAnalytics => {
      const roomInvoices = invoices.filter((invoice) => invoice.data.roomId === room.id)
      const roomContracts = contracts.filter((contract) => contract.data.roomId === room.id)
      const activeContracts = roomContracts.filter(
        (contract) => contract.data.status === 'active',
      ).length
      const revenue = roomInvoices
        .filter((invoice) => invoice.data.status === 'paid')
        .reduce((sum, invoice) => sum + Number(invoice.data.totalAmount ?? 0), 0)

      return {
        roomId: room.id,
        roomNumber: String(room.data.roomNumber ?? room.id),
        revenue,
        occupancyRate: room.data.status === 'occupied' || activeContracts > 0 ? 100 : 0,
        activeContracts,
      }
    })
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 10)
}

function buildAnalyticsData(
  collections: AnalyticsCollections,
  scope: AnalyticsScope,
  filter: DateRangeFilter,
  aiUsageAnalytics: AnalyticsData['aiUsage'],
  coreError?: string,
): AnalyticsData {
  const rooms = filterByScope(collections.rooms, scope).map((documentSnapshot) => ({
    id: documentSnapshot.id,
    data: documentSnapshot.data(),
  }))
  const contracts = toRows(collections.contracts, scope, filter)
  const invoices = toRows(collections.invoices, scope, filter)
  const tenants = toRows(collections.tenants, scope, filter)
  const feedbacks = toRows(collections.feedbacks, scope, filter)
  const utilities = toRows(collections.utilityReadings, scope, filter)
  const revenue = getRevenueAnalytics(invoices)
  const occupancy = getOccupancyAnalytics(rooms)
  const contractAnalytics = getContractAnalytics(contracts)
  const invoiceAnalytics = getInvoiceAnalytics(invoices)
  const tenantAnalytics = getTenantAnalytics(tenants)
  const feedbackAnalytics = getFeedbackAnalytics(feedbacks)
  const utilityAnalytics = getUtilityAnalytics(utilities)
  const topRooms = getTopRooms(rooms, contracts, invoices)
  const satisfactionTotal =
    feedbackAnalytics.positive + feedbackAnalytics.neutral + feedbackAnalytics.negative

  return {
    coreError,
    summary: {
      revenue: revenue.totalRevenue,
      occupancyRate: occupancy.occupancyRate,
      activeContracts: contractAnalytics.active,
      overdueInvoices: invoiceAnalytics.overdue,
      tenantSatisfaction:
        satisfactionTotal > 0 ? (feedbackAnalytics.positive / satisfactionTotal) * 100 : 0,
    },
    revenue,
    occupancy,
    contracts: contractAnalytics,
    invoices: invoiceAnalytics,
    tenants: tenantAnalytics,
    feedback: feedbackAnalytics,
    utilities: utilityAnalytics,
    aiUsage: aiUsageAnalytics,
    topRooms,
    exports: {
      revenue: revenue.monthly.map((row) => ({
        Month: row.month,
        Revenue: row.revenue,
      })),
      invoices: invoices.map((invoice) => ({
        Code: String(invoice.data.invoiceCode ?? ''),
        Status: String(invoice.data.status ?? ''),
        Total: Number(invoice.data.totalAmount ?? 0),
        Paid: Number(invoice.data.paidAmount ?? 0),
      })),
      feedback: feedbacks.map((feedback) => ({
        Title: String(feedback.data.title ?? ''),
        Category: String(feedback.data.category ?? ''),
        Sentiment: String(feedback.data.sentiment ?? ''),
        Status: String(feedback.data.status ?? ''),
      })),
      tenants: tenants.map((tenant) => ({
        Name: String(tenant.data.fullName ?? ''),
        Email: String(tenant.data.email ?? ''),
        Status: String(tenant.data.status ?? ''),
      })),
    },
  }
}

export async function getAnalyticsData(
  scope: AnalyticsScope,
  filter: DateRangeFilter,
): Promise<AnalyticsData> {
  console.info('Loading analytics...', { source: 'firestore_core', scope })
  const snapshots = await Promise.allSettled(
    analyticsCollections.map(async (collectionName) => ({
      collectionName,
      docs: (await getDocs(collection(db, collectionName))).docs,
    })),
  )
  const failedSnapshots = snapshots.filter(
    (snapshot): snapshot is PromiseRejectedResult => snapshot.status === 'rejected',
  )
  const fulfilledSnapshots = snapshots.filter(
    (snapshot): snapshot is PromiseFulfilledResult<{
      collectionName: AnalyticsCollectionKey
      docs: QueryDocumentSnapshot<DocumentData>[]
    }> => snapshot.status === 'fulfilled',
  )

  failedSnapshots.forEach((snapshot) => {
    console.warn('Analytics failed.', {
      source: 'firestore_core',
      error: snapshot.reason,
    })
  })

  const collections = fulfilledSnapshots.reduce(
    (current, snapshot) => ({
      ...current,
      [snapshot.value.collectionName]: snapshot.value.docs,
    }),
    {
      rooms: [],
      tenants: [],
      contracts: [],
      invoices: [],
      utilityReadings: [],
      feedbacks: [],
    } as AnalyticsCollections,
  )

  const aiUsage = await getAIUsageFromSupabase(scope, filter)
  const coreError =
    failedSnapshots.length > 0
      ? 'Some core analytics data could not be loaded. Please check Firebase quota or permissions.'
      : undefined

  console.info('Analytics loaded.', {
    source: 'firestore_core',
    failedCollections: failedSnapshots.length,
  })

  return buildAnalyticsData(collections, scope, filter, aiUsage, coreError)
}
