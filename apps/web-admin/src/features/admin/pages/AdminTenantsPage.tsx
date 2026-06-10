import { useEffect, useState } from 'react'

import {
  subscribeToAdminTenantSummaries,
} from '../services/admin-analytics.service'
import type { TenantSummary } from '../types'
import './AdminPortal.css'

function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    return subscribeToAdminTenantSummaries(
      (nextTenants) => {
        setTenants(nextTenants)
        setLoading(false)
        setError('')
      },
      (loadError) => {
        console.error('Unable to load tenant summaries.', loadError)
        setError('Unable to load tenants. Please try again.')
        setLoading(false)
      },
    )
  }, [])

  return (
    <div className="admin-portal-page">
      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading tenants...</div>
        ) : tenants.length === 0 ? (
          <div className="room-empty-state">
            <h2>No tenants found.</h2>
            <p>Tenant records will appear here after owners create them.</p>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table admin-table">
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Email</th>
                  <th>Room</th>
                  <th>Contract Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.user.id}>
                    <td>{tenant.tenantName}</td>
                    <td>{tenant.email}</td>
                    <td>{tenant.room}</td>
                    <td>{tenant.contractStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminTenantsPage
