import { useEffect, useMemo, useState } from 'react'

import {
  ActivityList,
  DashboardSection,
  ProgressCard,
  StatCard,
} from '../components/dashboard'
import {
  formatCurrency,
  subscribeToAdminDashboard,
} from '../features/admin/services/admin-dashboard.service'
import type { AdminDashboardStats } from '../features/admin/types'

function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    return subscribeToAdminDashboard(
      (nextStats) => {
        setStats(nextStats)
        setLoading(false)
        setError('')
      },
      (loadError) => {
        console.error('Unable to load admin dashboard.', loadError)
        setError('Unable to load admin dashboard data. Please try again.')
        setLoading(false)
      },
    )
  }, [])

  const statCards = useMemo(() => {
    if (!stats) return []

    return [
      { label: 'Total Users', value: String(stats.totalUsers), tone: 'primary' },
      { label: 'Total Owners', value: String(stats.totalOwners), tone: 'primary' },
      { label: 'Total Admins', value: String(stats.totalAdmins), tone: 'danger' },
      { label: 'Total Tenants', value: String(stats.totalTenants), tone: 'success' },
      { label: 'Total Rooms', value: String(stats.totalRooms), tone: 'primary' },
      {
        label: 'Occupied Rooms',
        value: String(stats.occupiedRooms),
        tone: 'success',
      },
      { label: 'Vacant Rooms', value: String(stats.vacantRooms), tone: 'warning' },
      {
        label: 'Active Contracts',
        value: String(stats.activeContracts),
        tone: 'success',
      },
      {
        label: 'Pending Invoices',
        value: String(stats.pendingInvoices),
        tone: 'warning',
      },
      {
        label: 'Overdue Invoices',
        value: String(stats.overdueInvoices),
        tone: 'danger',
      },
      {
        label: 'Total Feedbacks',
        value: String(stats.totalFeedbacks),
        tone: 'primary',
      },
      {
        label: 'Unread Notifications',
        value: String(stats.unreadNotifications),
        tone: 'danger',
      },
    ] as const
  }, [stats])

  if (loading && !stats) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>Loading admin dashboard</h2>
            <p>Fetching real-time platform data.</p>
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
            <h2>Admin dashboard unavailable</h2>
            <p>{error}</p>
          </div>
        </section>
      </div>
    )
  }

  if (!stats) return null

  const totalRoomsPercent = stats.totalRooms > 0 ? 100 : 0
  const occupiedPercent =
    stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0
  const vacantPercent =
    stats.totalRooms > 0 ? Math.round((stats.vacantRooms / stats.totalRooms) * 100) : 0

  return (
    <div className="dashboard-page">
      <DashboardSection
        title="Platform Statistics"
        description="Real-time operating metrics across users, rooms, contracts, invoices, and feedback."
      >
        <div className="stats-grid">
          {statCards.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone={stat.tone}
            />
          ))}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Revenue Analytics"
        description="Paid invoice revenue across monthly, yearly, and lifetime totals."
      >
        <div className="stats-grid">
          <StatCard
            label="Monthly Revenue"
            value={formatCurrency(stats.monthlyRevenue)}
            tone="primary"
          />
          <StatCard
            label="Yearly Revenue"
            value={formatCurrency(stats.yearlyRevenue)}
            tone="success"
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            tone="primary"
          />
          <StatCard
            label="Total Invoices"
            value={String(stats.totalInvoices)}
            tone="neutral"
          />
        </div>
      </DashboardSection>

      <div className="dashboard-grid dashboard-grid--two">
        <ProgressCard
          title="Platform Health"
          items={[
            { label: 'Database Collections', value: 100, tone: 'success' },
            { label: 'Room Records', value: totalRoomsPercent, tone: 'primary' },
            { label: 'Occupied Rooms', value: occupiedPercent, tone: 'success' },
            { label: 'Vacant Rooms', value: vacantPercent, tone: 'warning' },
          ]}
        />
        <ActivityList
          title="Recent Registrations"
          items={stats.recentRegistrations}
          emptyMessage="No recent registrations found."
        />
      </div>

      <DashboardSection
        title="System Overview"
        description="Estimated platform data footprint across Firestore collections."
      >
        <div className="stats-grid">
          <StatCard
            label="Database Collections"
            value={String(stats.databaseCollections)}
            tone="primary"
          />
          <StatCard
            label="Total Documents"
            value={String(stats.totalDocuments)}
            tone="success"
          />
          <StatCard
            label="Storage Estimate"
            value={stats.storageEstimate}
            tone="neutral"
          />
        </div>
      </DashboardSection>

      <ActivityList
        title="Platform Activity"
        items={stats.platformActivities}
        emptyMessage="No platform activity found."
      />
    </div>
  )
}

export default AdminDashboardPage
