import { Timestamp, type DocumentData } from 'firebase/firestore'

import { getRecommendationFromData } from '../../feedbacks/feedback.recommendation-rules'

export type AnalyticsDocument = {
  id: string
  data: DocumentData
}

export type AnalyticsCollections = {
  rooms: AnalyticsDocument[]
  tenants: AnalyticsDocument[]
  contracts: AnalyticsDocument[]
  invoices: AnalyticsDocument[]
  utilityReadings: AnalyticsDocument[]
  feedbacks: AnalyticsDocument[]
}

export type AIInsight = {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  icon: string
  createdAt: string
}

export type AITrend = {
  id: string
  metric: string
  direction: 'up' | 'down' | 'stable'
  percentage: number
}

export type AIRecommendation = {
  id: string
  title: string
  explanation: string
  priority: 'low' | 'medium' | 'high'
  suggestedAction: string
}

export type MonthlyAISummary = {
  totalRevenue: number
  occupancyRate: number
  totalFeedbackCount: number
  positiveFeedbackCount: number
  negativeFeedbackCount: number
  mostCommonComplaintCategory: string
  urgentIssuesCount: number
}

export type PriorityCenter = {
  high: string[]
  medium: string[]
  low: string[]
}

export type KPIAlert = {
  id: string
  title: string
  description: string
  severity: 'medium' | 'high'
}

type MonthWindow = {
  year: number
  month: number
}

const CREATED_NOW = () => new Date().toISOString()

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

  if (value instanceof Date) {
    return value.getTime()
  }

  return 0
}

function getMonthWindow(offset: number): MonthWindow {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  }
}

function getMonthFromValue(value: unknown): MonthWindow | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number)
    return { year, month: month - 1 }
  }

  const timestamp = getTimestampValue(value)
  if (!timestamp) {
    return null
  }

  const date = new Date(timestamp)
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
  }
}

function isSameMonth(value: unknown, monthWindow: MonthWindow) {
  const month = getMonthFromValue(value)

  return (
    month !== null &&
    month.year === monthWindow.year &&
    month.month === monthWindow.month
  )
}

function isWithinDays(value: unknown, days: number) {
  const timestamp = getTimestampValue(value)
  if (!timestamp) {
    return false
  }

  const now = Date.now()
  return timestamp >= now - days * 24 * 60 * 60 * 1000
}

function calculateChange(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return 0
  }

  if (previous === 0) {
    return 100
  }

  return ((current - previous) / previous) * 100
}

function trendDirection(change: number): AITrend['direction'] {
  if (Math.abs(change) < 1) {
    return 'stable'
  }

  return change > 0 ? 'up' : 'down'
}

function createInsight(
  id: string,
  title: string,
  description: string,
  severity: AIInsight['severity'],
  icon: string,
): AIInsight {
  return {
    id,
    title,
    description,
    severity,
    icon,
    createdAt: CREATED_NOW(),
  }
}

function getPaidRevenue(invoices: AnalyticsDocument[], monthWindow?: MonthWindow) {
  return invoices
    .filter((invoice) => isInvoicePaid(invoice.data))
    .filter((invoice) =>
      monthWindow
        ? isSameMonth(
            invoice.data.paidAt ??
              invoice.data.billingMonth ??
              invoice.data.updatedAt ??
              invoice.data.createdAt,
            monthWindow,
          )
        : true,
    )
    .reduce((sum, invoice) => sum + getInvoicePaidAmount(invoice.data), 0)
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

function getFeedbackCategory(feedback: AnalyticsDocument) {
  const category =
    feedback.data.aiSuggestedCategory ??
    feedback.data.category ??
    'other'

  return String(category || 'other')
}

function getComplaintCategoryCounts(feedbacks: AnalyticsDocument[]) {
  const counts = new Map<string, number>()

  feedbacks.forEach((feedback) => {
    const category = getFeedbackCategory(feedback)
    counts.set(category, (counts.get(category) ?? 0) + 1)
  })

  return counts
}

function getMostCommonCategory(feedbacks: AnalyticsDocument[]) {
  const [topCategory] =
    [...getComplaintCategoryCounts(feedbacks).entries()].sort(
      (left, right) => right[1] - left[1],
    )[0] ?? []

  return topCategory ? formatLabel(topCategory) : 'None'
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getOccupancyRate(rooms: AnalyticsDocument[]) {
  if (rooms.length === 0) {
    return 0
  }

  const occupiedRooms = rooms.filter(
    (room) => room.data.status === 'occupied',
  ).length

  return (occupiedRooms / rooms.length) * 100
}

function getMonthlyOccupancyRate(rooms: AnalyticsDocument[], monthWindow: MonthWindow) {
  const roomSet = rooms.filter((room) =>
    isSameMonth(room.data.updatedAt ?? room.data.createdAt, monthWindow),
  )

  return roomSet.length > 0 ? getOccupancyRate(roomSet) : getOccupancyRate(rooms)
}

function getUtilityUsage(
  utilityReadings: AnalyticsDocument[],
  utilityType: string,
  monthWindow: MonthWindow,
) {
  return utilityReadings
    .filter((reading) => reading.data.utilityType === utilityType)
    .filter((reading) =>
      isSameMonth(reading.data.billingMonth ?? reading.data.createdAt, monthWindow),
    )
    .reduce((sum, reading) => sum + Number(reading.data.usage ?? 0), 0)
}

function getExpiringContracts(contracts: AnalyticsDocument[]) {
  const now = Date.now()
  const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000

  return contracts.filter((contract) => {
    if (contract.data.status !== 'active') {
      return false
    }

    const endTime = getTimestampValue(contract.data.endDate)
    return endTime >= now && endTime <= thirtyDaysFromNow
  })
}

export function generateTrendAnalysis(
  collections: AnalyticsCollections,
): AITrend[] {
  const currentMonth = getMonthWindow(0)
  const previousMonth = getMonthWindow(-1)

  const currentRevenue = getPaidRevenue(collections.invoices, currentMonth)
  const previousRevenue = getPaidRevenue(collections.invoices, previousMonth)
  const currentFeedback = collections.feedbacks.filter((feedback) =>
    isSameMonth(feedback.data.createdAt, currentMonth),
  ).length
  const previousFeedback = collections.feedbacks.filter((feedback) =>
    isSameMonth(feedback.data.createdAt, previousMonth),
  ).length
  const currentInternetFeedback = collections.feedbacks.filter(
    (feedback) =>
      getFeedbackCategory(feedback) === 'internet' &&
      isSameMonth(feedback.data.createdAt, currentMonth),
  ).length
  const previousInternetFeedback = collections.feedbacks.filter(
    (feedback) =>
      getFeedbackCategory(feedback) === 'internet' &&
      isSameMonth(feedback.data.createdAt, previousMonth),
  ).length
  const currentElectricity = getUtilityUsage(
    collections.utilityReadings,
    'electricity',
    currentMonth,
  )
  const previousElectricity = getUtilityUsage(
    collections.utilityReadings,
    'electricity',
    previousMonth,
  )
  const currentWater = getUtilityUsage(
    collections.utilityReadings,
    'water',
    currentMonth,
  )
  const previousWater = getUtilityUsage(
    collections.utilityReadings,
    'water',
    previousMonth,
  )
  const currentOccupancy = getMonthlyOccupancyRate(collections.rooms, currentMonth)
  const previousOccupancy = getMonthlyOccupancyRate(collections.rooms, previousMonth)

  const trendInputs = [
    ['Revenue', currentRevenue, previousRevenue],
    ['Feedback Reports', currentFeedback, previousFeedback],
    ['Internet Complaints', currentInternetFeedback, previousInternetFeedback],
    ['Occupancy', currentOccupancy, previousOccupancy],
    ['Electricity Usage', currentElectricity, previousElectricity],
    ['Water Usage', currentWater, previousWater],
  ] as const

  return trendInputs.map(([metric, current, previous]) => {
    const percentage = calculateChange(current, previous)

    return {
      id: metric.toLowerCase().replace(/\s+/g, '-'),
      metric,
      direction: trendDirection(percentage),
      percentage: Math.round(Math.abs(percentage)),
    }
  })
}

export function generateMonthlySummary(
  collections: AnalyticsCollections,
): MonthlyAISummary {
  const currentMonth = getMonthWindow(0)
  const currentFeedback = collections.feedbacks.filter((feedback) =>
    isSameMonth(feedback.data.createdAt, currentMonth),
  )
  const currentRevenue = getPaidRevenue(collections.invoices, currentMonth)

  return {
    totalRevenue: currentRevenue,
    occupancyRate: getOccupancyRate(collections.rooms),
    totalFeedbackCount: currentFeedback.length,
    positiveFeedbackCount: currentFeedback.filter(
      (feedback) => feedback.data.sentiment === 'positive',
    ).length,
    negativeFeedbackCount: currentFeedback.filter(
      (feedback) => feedback.data.sentiment === 'negative',
    ).length,
    mostCommonComplaintCategory: getMostCommonCategory(currentFeedback),
    urgentIssuesCount: currentFeedback.filter((feedback) => {
      const priority = feedback.data.priority ?? feedback.data.aiSuggestedPriority
      return priority === 'urgent' || priority === 'high'
    }).length,
  }
}

export function generateInsights(collections: AnalyticsCollections): AIInsight[] {
  const trends = generateTrendAnalysis(collections)
  const summary = generateMonthlySummary(collections)
  const insights: AIInsight[] = []
  const internetTrend = trends.find((trend) => trend.metric === 'Internet Complaints')
  const occupancyTrend = trends.find((trend) => trend.metric === 'Occupancy')
  const revenueTrend = trends.find((trend) => trend.metric === 'Revenue')
  const maintenanceRequests = collections.feedbacks.filter(
    (feedback) => getRecommendationFromData(feedback.data).actionLabel === 'Maintenance Inspection',
  )
  const overdueInvoices = collections.invoices.filter((invoice) =>
    isInvoiceOverdue(invoice.data),
  )

  if (internetTrend && internetTrend.direction === 'up' && internetTrend.percentage >= 20) {
    insights.push(
      createInsight(
        'internet-complaints-increasing',
        'Internet complaints increasing',
        `Internet-related complaints increased by ${internetTrend.percentage}% compared to the previous month.`,
        internetTrend.percentage >= 40 ? 'high' : 'medium',
        'NET',
      ),
    )
  }

  if (occupancyTrend && occupancyTrend.direction === 'down' && occupancyTrend.percentage >= 10) {
    insights.push(
      createInsight(
        'occupancy-rate-dropping',
        'Occupancy rate dropping',
        `Occupancy decreased by ${occupancyTrend.percentage}% compared to last month.`,
        'medium',
        'OCC',
      ),
    )
  }

  if (revenueTrend && revenueTrend.direction === 'up' && revenueTrend.percentage >= 5) {
    insights.push(
      createInsight(
        'revenue-growth-detected',
        'Revenue growth detected',
        `Monthly revenue increased by ${revenueTrend.percentage}%.`,
        'low',
        'REV',
      ),
    )
  }

  if (maintenanceRequests.length >= 3) {
    insights.push(
      createInsight(
        'maintenance-requests-cluster',
        'Maintenance requests need review',
        `${maintenanceRequests.length} maintenance-related feedback items require operational follow-up.`,
        'high',
        'FIX',
      ),
    )
  }

  if (overdueInvoices.length > 0) {
    insights.push(
      createInsight(
        'overdue-invoices-detected',
        'Overdue invoices detected',
        `${overdueInvoices.length} overdue invoice(s) may affect cash flow.`,
        'high',
        'PAY',
      ),
    )
  }

  if (summary.negativeFeedbackCount > summary.positiveFeedbackCount && summary.totalFeedbackCount > 0) {
    insights.push(
      createInsight(
        'negative-feedback-dominant',
        'Negative feedback is dominant',
        'Negative tenant sentiment is higher than positive sentiment this month.',
        'medium',
        'FB',
      ),
    )
  }

  return insights.slice(0, 6)
}

export function generateRecommendations(
  collections: AnalyticsCollections,
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = []
  const recentFeedback = collections.feedbacks.filter((feedback) =>
    isWithinDays(feedback.data.createdAt, 7),
  )
  const internetComplaints = recentFeedback.filter(
    (feedback) => getFeedbackCategory(feedback) === 'internet',
  )
  const maintenanceComplaints = recentFeedback.filter(
    (feedback) =>
      getRecommendationFromData(feedback.data).actionLabel === 'Maintenance Inspection',
  )
  const expiringContracts = getExpiringContracts(collections.contracts)
  const overdueInvoices = collections.invoices.filter((invoice) =>
    isInvoiceOverdue(invoice.data),
  )
  const highUtilityReadings = collections.utilityReadings.filter(
    (reading) => Number(reading.data.totalAmount ?? 0) > 0,
  )

  if (internetComplaints.length >= 2) {
    recommendations.push({
      id: 'internet-complaints',
      title: 'Internet complaints detected',
      explanation:
        'Multiple tenants reported unstable internet service during the last 7 days.',
      priority: 'high',
      suggestedAction:
        'Inspect routers, networking equipment, and ISP connection quality.',
    })
  }

  if (maintenanceComplaints.length >= 2) {
    recommendations.push({
      id: 'maintenance-follow-up',
      title: 'Maintenance follow-up recommended',
      explanation:
        'Recent feedback points to repeated repair or facility maintenance concerns.',
      priority: 'high',
      suggestedAction:
        'Assign maintenance staff, inspect affected rooms, and update tenants after resolution.',
    })
  }

  if (expiringContracts.length > 0) {
    recommendations.push({
      id: 'contract-renewal-opportunity',
      title: 'Contract renewal opportunity',
      explanation: `${expiringContracts.length} contract(s) will expire within the next 30 days.`,
      priority: expiringContracts.length >= 3 ? 'high' : 'medium',
      suggestedAction: 'Contact tenants and discuss renewal options.',
    })
  }

  if (overdueInvoices.length > 0) {
    recommendations.push({
      id: 'invoice-collection',
      title: 'Invoice collection needed',
      explanation: `${overdueInvoices.length} invoice(s) are overdue and need follow-up.`,
      priority: 'high',
      suggestedAction:
        'Send payment reminders and review tenants with repeated late payments.',
    })
  }

  if (highUtilityReadings.length > 0 && recommendations.length < 4) {
    recommendations.push({
      id: 'utility-review',
      title: 'Utility usage review',
      explanation:
        'Utility readings are available for review and may reveal abnormal consumption patterns.',
      priority: 'low',
      suggestedAction:
        'Compare this month usage against prior readings and inspect unusual room-level spikes.',
    })
  }

  return recommendations.slice(0, 5)
}

export function generatePriorityCenter(
  collections: AnalyticsCollections,
): PriorityCenter {
  const overdueInvoices = collections.invoices.filter((invoice) =>
    isInvoiceOverdue(invoice.data),
  )
  const unresolvedMaintenance = collections.feedbacks.filter((feedback) => {
    const status = feedback.data.status
    return (
      status !== 'resolved' &&
      status !== 'rejected' &&
      getRecommendationFromData(feedback.data).actionLabel === 'Maintenance Inspection'
    )
  })
  const internetComplaints = collections.feedbacks.filter(
    (feedback) => getFeedbackCategory(feedback) === 'internet',
  )
  const expiringContracts = getExpiringContracts(collections.contracts)
  const utilitySpikes = generateTrendAnalysis(collections).filter(
    (trend) =>
      (trend.metric === 'Electricity Usage' || trend.metric === 'Water Usage') &&
      trend.direction === 'up' &&
      trend.percentage >= 20,
  )
  const occupancyTrend = generateTrendAnalysis(collections).find(
    (trend) => trend.metric === 'Occupancy',
  )

  return {
    high: [
      unresolvedMaintenance.length >= 2
        ? `${unresolvedMaintenance.length} unresolved maintenance request(s)`
        : '',
      internetComplaints.length >= 3
        ? `${internetComplaints.length} repeated internet complaint(s)`
        : '',
      overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue invoice(s)` : '',
    ].filter(Boolean),
    medium: [
      expiringContracts.length > 0
        ? `${expiringContracts.length} contract(s) expiring soon`
        : '',
      ...utilitySpikes.map(
        (trend) => `${trend.metric} increased by ${trend.percentage}%`,
      ),
    ].filter(Boolean),
    low: [
      collections.feedbacks.length > 0 ? 'Review minor tenant feedback' : '',
      occupancyTrend &&
      occupancyTrend.direction !== 'stable' &&
      occupancyTrend.percentage < 10
        ? `Small occupancy fluctuation of ${occupancyTrend.percentage}%`
        : '',
    ].filter(Boolean),
  }
}

export function generateKPIAlerts(collections: AnalyticsCollections): KPIAlert[] {
  const trends = generateTrendAnalysis(collections)
  const summary = generateMonthlySummary(collections)
  const alerts: KPIAlert[] = []
  const revenueTrend = trends.find((trend) => trend.metric === 'Revenue')
  const negativeFeedbackTrend = trends.find(
    (trend) => trend.metric === 'Feedback Reports',
  )
  const electricityTrend = trends.find(
    (trend) => trend.metric === 'Electricity Usage',
  )
  const waterTrend = trends.find((trend) => trend.metric === 'Water Usage')

  if (revenueTrend?.direction === 'down' && revenueTrend.percentage > 20) {
    alerts.push({
      id: 'revenue-drop',
      title: 'Revenue dropped significantly',
      description: `Monthly revenue decreased by ${revenueTrend.percentage}%.`,
      severity: 'high',
    })
  }

  if (summary.occupancyRate > 0 && summary.occupancyRate < 70) {
    alerts.push({
      id: 'low-occupancy',
      title: 'Occupancy below target',
      description: `Current occupancy is ${Math.round(summary.occupancyRate)}%.`,
      severity: 'medium',
    })
  }

  if (
    negativeFeedbackTrend?.direction === 'up' &&
    negativeFeedbackTrend.percentage >= 30 &&
    summary.negativeFeedbackCount > 0
  ) {
    alerts.push({
      id: 'negative-feedback-increase',
      title: 'Negative feedback increased',
      description: `Feedback volume increased by ${negativeFeedbackTrend.percentage}% and includes negative sentiment.`,
      severity: 'high',
    })
  }

  if (electricityTrend?.direction === 'up' && electricityTrend.percentage >= 30) {
    alerts.push({
      id: 'electricity-spike',
      title: 'Electricity consumption spike',
      description: `Electricity usage increased by ${electricityTrend.percentage}%.`,
      severity: 'medium',
    })
  }

  if (waterTrend?.direction === 'up' && waterTrend.percentage >= 30) {
    alerts.push({
      id: 'water-spike',
      title: 'Water consumption spike',
      description: `Water usage increased by ${waterTrend.percentage}%.`,
      severity: 'medium',
    })
  }

  return alerts
}
