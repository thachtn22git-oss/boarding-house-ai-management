import { useMemo } from 'react'

import { DashboardSection, StatCard } from '../../../components/dashboard'
import { formatCurrency } from '../../../utils/format'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

function MyUtilitiesPage() {
  const { data, isLoading, error, reload } = useTenantPortalData()
  const utilities = useMemo(() => data?.utilities ?? [], [data?.utilities])

  const stats = useMemo(
    () => ({
      electricityUsage: utilities
        .filter((utility) => utility.utilityType === 'electricity')
        .reduce((sum, utility) => sum + utility.usage, 0),
      waterUsage: utilities
        .filter((utility) => utility.utilityType === 'water')
        .reduce((sum, utility) => sum + utility.usage, 0),
      utilityCost: utilities.reduce(
        (sum, utility) => sum + utility.totalAmount,
        0,
      ),
    }),
    [utilities],
  )

  if (isLoading && !data) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Loading utilities"
          message="Fetching your electricity and water readings."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Utilities unavailable"
          message={error}
          action={
            <button className="dashboard-refresh-button" type="button" onClick={reload}>
              Refresh
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="tenant-portal-page">
      <DashboardSection
        title="Utility Statistics"
        description="Electricity and water readings linked to your tenant profile."
      >
        <div className="stats-grid">
          <StatCard
            label="Electricity Usage"
            value={String(stats.electricityUsage)}
            helper="Total recorded units"
            tone="warning"
          />
          <StatCard
            label="Water Usage"
            value={String(stats.waterUsage)}
            helper="Total recorded units"
            tone="primary"
          />
          <StatCard
            label="Utility Cost"
            value={formatCurrency(stats.utilityCost)}
            helper="Total utility amount"
            tone="success"
          />
        </div>
      </DashboardSection>

      <section className="dashboard-card room-table-card">
        {utilities.length === 0 ? (
          <div className="room-empty-state">
            <h2>No utility readings found.</h2>
            <p>Your utility readings will appear here after they are recorded.</p>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Billing Month</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Usage</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {utilities.map((utility) => (
                  <tr key={utility.id}>
                    <td>
                      <span
                        className={`tenant-type-badge tenant-type-badge--${utility.utilityType}`}
                      >
                        {formatLabel(utility.utilityType)}
                      </span>
                    </td>
                    <td>{utility.billingMonth}</td>
                    <td>{utility.previousReading}</td>
                    <td>{utility.currentReading}</td>
                    <td>{utility.usage}</td>
                    <td>{formatCurrency(utility.totalAmount)}</td>
                    <td>
                      <span
                        className={`tenant-status-badge tenant-status-badge--${utility.status}`}
                      >
                        {formatLabel(utility.status)}
                      </span>
                    </td>
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

export default MyUtilitiesPage
