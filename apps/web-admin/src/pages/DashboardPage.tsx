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
  type DashboardActivity,
  type OwnerDashboardStats,
} from '../features/dashboard/services/dashboard.service'
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
    void Promise.resolve().then(loadDashboard)
  }, [loadDashboard])

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
    return (
      <div className="dashboard-page">
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>Loading dashboard</h2>
            <p>Fetching the latest owner dashboard data.</p>
          </div>
        </section>
      </div>
    )
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
        <NotificationWidget />
      </div>
    </div>
  )
}

export default DashboardPage
