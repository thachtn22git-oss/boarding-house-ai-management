export type AnalyticsScope = {
  type: 'admin' | 'owner'
  ownerId?: string
}

export type DateRangePreset =
  | 'last30'
  | 'last90'
  | 'last6Months'
  | 'last12Months'
  | 'custom'
  | 'all'

export type DateRangeFilter = {
  preset: DateRangePreset
  startDate?: string
  endDate?: string
}

export type ChartPoint = {
  label: string
  value: number
}

export type MonthlyRevenuePoint = {
  month: string
  revenue: number
}

export type UtilityTrendPoint = {
  month: string
  electricity: number
  water: number
}

export type TopRoomAnalytics = {
  roomId: string
  roomNumber: string
  revenue: number
  occupancyRate: number
  activeContracts: number
}

export type AnalyticsData = {
  summary: {
    revenue: number
    occupancyRate: number
    activeContracts: number
    overdueInvoices: number
    tenantSatisfaction: number
  }
  revenue: {
    monthly: MonthlyRevenuePoint[]
    yearly: ChartPoint[]
    currentMonthRevenue: number
    previousMonthRevenue: number
    growthPercent: number
    totalRevenue: number
  }
  occupancy: {
    totalRooms: number
    occupiedRooms: number
    vacantRooms: number
    occupancyRate: number
    distribution: ChartPoint[]
  }
  contracts: {
    total: number
    active: number
    expired: number
    expiringSoon: number
    byStatus: ChartPoint[]
  }
  invoices: {
    paid: number
    pending: number
    overdue: number
    byStatus: ChartPoint[]
  }
  tenants: {
    total: number
    newThisMonth: number
    active: number
    growthTrend: ChartPoint[]
  }
  feedback: {
    total: number
    resolved: number
    pending: number
    aiAnalyzed: number
    urgent: number
    negative: number
    positive: number
    neutral: number
    pendingAI: number
    sentimentDistribution: ChartPoint[]
    categoryDistribution: ChartPoint[]
    priorityDistribution: ChartPoint[]
    statusByPriority: ChartPoint[]
  }
  utilities: {
    trend: UtilityTrendPoint[]
    averageElectricityUsage: number
    averageWaterUsage: number
  }
  topRooms: TopRoomAnalytics[]
  exports: {
    revenue: Array<Record<string, string | number>>
    invoices: Array<Record<string, string | number>>
    feedback: Array<Record<string, string | number>>
    tenants: Array<Record<string, string | number>>
  }
}
