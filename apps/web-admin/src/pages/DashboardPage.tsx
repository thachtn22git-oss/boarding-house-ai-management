import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ActivityList,
  DashboardSection,
  InsightCard,
  ProgressCard,
  StatCard,
} from '../components/dashboard'
import {
  getOwnerDashboardStats,
  subscribeOwnerDashboardStats,
  type DashboardActivity,
  type OwnerDashboardStats,
} from '../features/dashboard/services/dashboard.service'
import type {
  AIRecommendation,
  AITrend,
  KPIAlert,
  MonthlyAISummary,
  PriorityCenter,
} from '../features/dashboard/services/analytics-ai.service'
import { useAuth } from '../features/auth/useAuth'
import NotificationWidget from '../features/notifications/components/NotificationWidget'
import { formatCurrency, formatPercent } from '../utils/format'

const activityIcons: Record<DashboardActivity['type'], string> = {
  room: 'R',
  tenant: 'T',
  contract: 'C',
  invoice: '$',
  utility: 'U',
  feedback: 'F',
}

function hasDashboardData(stats: OwnerDashboardStats) {
  return (
    stats.totalRooms > 0 ||
    stats.totalTenants > 0 ||
    stats.totalContracts > 0 ||
    stats.totalInvoices > 0 ||
    stats.totalUtilityAmount > 0 ||
    stats.totalFeedback > 0
  )
}

function getMaintenancePercent(stats: OwnerDashboardStats) {
  if (stats.totalRooms === 0) {
    return 0
  }

  return (stats.maintenanceRooms / stats.totalRooms) * 100
}

function getTrendPrefix(direction: AITrend['direction']) {
  if (direction === 'up') {
    return '+'
  }

  if (direction === 'down') {
    return '-'
  }

  return ''
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-skeleton-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            className="dashboard-card dashboard-skeleton-card"
            key={`dashboard-skeleton-${index}`}
          />
        ))}
      </div>
    </div>
  )
}

function KPIAlerts({ alerts }: { alerts: KPIAlert[] }) {
  if (alerts.length === 0) {
    return null
  }

  return (
    <section className="kpi-alert-grid" aria-label="Smart KPI alerts">
      {alerts.map((alert) => (
        <article
          className={`dashboard-card kpi-alert-card kpi-alert-card--${alert.severity}`}
          key={alert.id}
        >
          <span className="kpi-alert-label">{alert.severity} alert</span>
          <h3>{alert.title}</h3>
          <p>{alert.description}</p>
        </article>
      ))}
    </section>
  )
}

function TrendAnalysisCard({ trends }: { trends: AITrend[] }) {
  return (
    <section className="dashboard-card panel-card ai-trend-card">
      <div className="panel-card-header">
        <div>
          <p className="panel-eyebrow">AI Monitoring</p>
          <h2>Trend Analysis</h2>
        </div>
      </div>
      {trends.length === 0 ? (
        <p className="dashboard-empty-text">No trend data available.</p>
      ) : (
        <div className="trend-list">
          {trends.map((trend) => (
            <div
              className={`trend-item trend-item--${trend.direction}`}
              key={trend.id}
            >
              <span>{trend.metric}</span>
              <strong>
                {trend.direction === 'stable'
                  ? 'Stable'
                  : `${getTrendPrefix(trend.direction)}${trend.percentage}%`}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function RecommendationsCard({
  recommendations,
}: {
  recommendations: AIRecommendation[]
}) {
  return (
    <section className="dashboard-card panel-card ai-recommendation-card">
      <div className="panel-card-header">
        <div>
          <p className="panel-eyebrow">Action Engine</p>
          <h2>AI Recommendations</h2>
        </div>
      </div>
      {recommendations.length === 0 ? (
        <p className="dashboard-empty-text">No AI recommendations yet.</p>
      ) : (
        <div className="recommendation-list">
          {recommendations.map((recommendation) => (
            <article
              className={`recommendation-item recommendation-item--${recommendation.priority}`}
              key={recommendation.id}
            >
              <div className="recommendation-title-row">
                <h3>{recommendation.title}</h3>
                <span
                  className={`dashboard-badge dashboard-badge--${recommendation.priority}`}
                >
                  {recommendation.priority}
                </span>
              </div>
              <p>{recommendation.explanation}</p>
              <div className="suggested-action">
                <span>Suggested Action</span>
                <strong>{recommendation.suggestedAction}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function MonthlySummaryCard({ summary }: { summary: MonthlyAISummary }) {
  const items = [
    ['Total Revenue', formatCurrency(summary.totalRevenue)],
    ['Occupancy Rate', formatPercent(summary.occupancyRate)],
    ['Total Feedback', String(summary.totalFeedbackCount)],
    ['Positive Feedback', String(summary.positiveFeedbackCount)],
    ['Negative Feedback', String(summary.negativeFeedbackCount)],
    ['Most Common Complaint', summary.mostCommonComplaintCategory],
    ['Urgent Issues', String(summary.urgentIssuesCount)],
  ]

  return (
    <section className="dashboard-card panel-card monthly-summary-card">
      <div className="panel-card-header">
        <div>
          <p className="panel-eyebrow">Monthly AI Summary</p>
          <h2>Operating Snapshot</h2>
        </div>
      </div>
      <div className="summary-metric-grid">
        {items.map(([label, value]) => (
          <div className="summary-metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function PriorityList({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'high' | 'medium' | 'low'
  items: string[]
}) {
  return (
    <div className={`priority-column priority-column--${tone}`}>
      <div className="priority-column-header">
        <h3>{title}</h3>
        <span className={`dashboard-badge dashboard-badge--${tone}`}>
          {tone}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="dashboard-empty-text">No items.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PriorityCenterCard({ priorityCenter }: { priorityCenter: PriorityCenter }) {
  return (
    <section className="dashboard-card panel-card priority-center-card">
      <div className="panel-card-header">
        <div>
          <p className="panel-eyebrow">AI Priority Center</p>
          <h2>Operational Priorities</h2>
        </div>
      </div>
      <div className="priority-grid">
        <PriorityList
          title="High Priority"
          tone="high"
          items={priorityCenter.high}
        />
        <PriorityList
          title="Medium Priority"
          tone="medium"
          items={priorityCenter.medium}
        />
        <PriorityList title="Low Priority" tone="low" items={priorityCenter.low} />
      </div>
    </section>
  )
}

function DashboardPage() {
  const { currentUser } = useAuth()
  const [stats, setStats] = useState<OwnerDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!currentUser) {
      setStats(null)
      setError('You must be signed in to view dashboard data.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const dashboardStats = await getOwnerDashboardStats(currentUser.uid)
      setStats(dashboardStats)
    } catch {
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      setStats(null)
      setError('You must be signed in to view dashboard data.')
      setIsLoading(false)
      return undefined
    }

    let hasLoadedOnce = false
    setIsLoading(true)
    setError('')

    return subscribeOwnerDashboardStats(
      currentUser.uid,
      (dashboardStats) => {
        setStats(dashboardStats)
        setError('')
        if (!hasLoadedOnce) {
          setIsLoading(false)
          hasLoadedOnce = true
        }
      },
      (subscriptionError) => {
        console.warn('Owner dashboard realtime update failed.', subscriptionError)
        setError('Realtime updates are unavailable. Showing latest loaded data.')
        if (!hasLoadedOnce) {
          setIsLoading(false)
          hasLoadedOnce = true
        }
      },
    )
  }, [currentUser])

  const statCards = useMemo(() => {
    if (!stats) {
      return []
    }

    return [
      {
        label: 'Total Rooms',
        value: String(stats.totalRooms),
        helper: `${stats.maintenanceRooms} in maintenance`,
        tone: 'primary',
      },
      {
        label: 'Occupied Rooms',
        value: String(stats.occupiedRooms),
        helper: formatPercent(stats.occupancyRate),
        tone: 'success',
      },
      {
        label: 'Vacant Rooms',
        value: String(stats.vacantRooms),
        helper: formatPercent(stats.vacantRate),
        tone: 'warning',
      },
      {
        label: 'Monthly Revenue',
        value: formatCurrency(stats.monthlyRevenue),
        helper: 'Paid invoices this month',
        tone: 'primary',
      },
      {
        label: 'Pending Invoices',
        value: String(stats.unpaidInvoices + stats.overdueInvoices),
        helper: `${formatCurrency(stats.pendingAmount)} pending`,
        tone: 'danger',
      },
      {
        label: 'Expiring Contracts',
        value: String(stats.expiringContracts),
        helper: 'Within the next 30 days',
        tone: 'warning',
      },
      {
        label: 'Total Tenants',
        value: String(stats.totalTenants),
        helper: `${stats.activeTenants} active tenants`,
        tone: 'neutral',
      },
      {
        label: 'Active Contracts',
        value: String(stats.activeContracts),
        helper: `${stats.totalContracts} total contracts`,
        tone: 'success',
      },
      {
        label: 'New Feedback',
        value: String(stats.newFeedback),
        helper: `${stats.urgentFeedback} urgent items`,
        tone: stats.urgentFeedback > 0 ? 'danger' : 'neutral',
      },
      {
        label: 'Utility Amount',
        value: formatCurrency(stats.totalUtilityAmount),
        helper: 'Electricity and water readings',
        tone: 'primary',
      },
    ] as const
  }, [stats])

  const recentActivities = useMemo(() => {
    if (!stats) {
      return []
    }

    return stats.recentActivities.map((activity) => ({
      icon: activityIcons[activity.type],
      title: activity.title,
      timestamp: activity.timestamp,
    }))
  }, [stats])

  if (isLoading && !stats) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>Dashboard unavailable</h2>
            <p>{error}</p>
            <button
              className="dashboard-refresh-button"
              type="button"
              onClick={loadDashboard}
            >
              Refresh
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const isEmpty = !hasDashboardData(stats)
  const maintenancePercent = getMaintenancePercent(stats)

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <button
          className="dashboard-refresh-button"
          type="button"
          disabled={isLoading}
          onClick={loadDashboard}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isEmpty ? (
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>No dashboard data yet</h2>
            <p>
              Start by creating rooms, tenants, contracts, and invoices to see
              dashboard insights.
            </p>
          </div>
        </section>
      ) : null}

      <KPIAlerts alerts={stats.kpiAlerts} />

      <DashboardSection
        title="Statistics"
        description="Current operational performance across rooms, revenue, and contracts."
      >
        <div className="stats-grid">
          {statCards.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              helper={stat.helper}
              tone={stat.tone}
            />
          ))}
        </div>
      </DashboardSection>

      <div className="dashboard-grid dashboard-grid--two">
        <ProgressCard
          title="Occupancy Overview"
          items={[
            {
              label: 'Occupied',
              value: Math.round(stats.occupancyRate),
              tone: 'success',
            },
            {
              label: 'Vacant',
              value: Math.round(stats.vacantRate),
              tone: 'warning',
            },
            {
              label: `Maintenance (${stats.maintenanceRooms})`,
              value: Math.round(maintenancePercent),
              tone: 'danger',
            },
          ]}
        />
        <ActivityList
          title="Recent Activities"
          items={recentActivities}
          emptyMessage="No recent activity yet."
        />
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <InsightCard
          title="AI Insights"
          insights={stats.aiInsights}
          emptyMessage="No AI insights yet."
        />
        <TrendAnalysisCard trends={stats.aiTrends} />
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <MonthlySummaryCard summary={stats.monthlySummary} />
        <PriorityCenterCard priorityCenter={stats.priorityCenter} />
      </div>

      <div className="dashboard-grid">
        <RecommendationsCard recommendations={stats.aiRecommendations} />
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <NotificationWidget />
      </div>
    </div>
  )
}

export default DashboardPage
