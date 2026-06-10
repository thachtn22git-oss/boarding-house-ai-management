import { useEffect, useState } from 'react'

import {
  subscribeToAdminOwnerSummaries,
} from '../services/admin-analytics.service'
import type { OwnerSummary } from '../types'
import './AdminPortal.css'

function AdminOwnersPage() {
  const [owners, setOwners] = useState<OwnerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true)
      setError('')
    })

    return subscribeToAdminOwnerSummaries(
      (nextOwners) => {
        setOwners(nextOwners)
        setLoading(false)
        setError('')
      },
      (loadError) => {
        console.error('Unable to load owner summaries.', loadError)
        setError('Unable to load owners. Please try again.')
        setLoading(false)
      },
    )
  }, [])

  return (
    <div className="admin-portal-page">
      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading owners...</div>
        ) : owners.length === 0 ? (
          <div className="room-empty-state">
            <h2>No owners found.</h2>
            <p>Owner accounts will appear here after registration.</p>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table admin-table">
              <thead>
                <tr>
                  <th>Owner Name</th>
                  <th>Email</th>
                  <th>Total Rooms</th>
                  <th>Total Tenants</th>
                  <th>Total Contracts</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.user.id}>
                    <td>{owner.user.fullName}</td>
                    <td>{owner.user.email}</td>
                    <td>{owner.totalRooms}</td>
                    <td>{owner.totalTenants}</td>
                    <td>{owner.totalContracts}</td>
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

export default AdminOwnersPage
