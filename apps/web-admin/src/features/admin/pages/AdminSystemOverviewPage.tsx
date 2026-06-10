import { useEffect, useState } from 'react'

import { DashboardSection, StatCard } from '../../../components/dashboard'
import {
  subscribeToAdminDashboard,
} from '../services/admin-dashboard.service'
import type { AdminDashboardStats } from '../types'
import './AdminPortal.css'

function AdminSystemOverviewPage() {
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
        console.error('Unable to load system overview.', loadError)
        setError('Unable to load system overview. Please try again.')
        setLoading(false)
      },
    )
  }, [])

  if (loading && !stats) {
    return (
      <div className="admin-portal-page">
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>Loading system overview</h2>
            <p>Fetching platform health and document counts.</p>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-portal-page">
        <div className="room-error">{error}</div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="admin-portal-page">
      <DashboardSection
        title="Platform Health"
        description="Live Firestore footprint and high-level system totals."
      >
        <div className="admin-system-grid">
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
          <StatCard
            label="Unread Notifications"
            value={String(stats.unreadNotifications)}
            tone="warning"
          />
        </div>
      </DashboardSection>
    </div>
  )
}

export default AdminSystemOverviewPage
