import { formatCurrency } from '../../../utils/format'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

function MyContractPage() {
  const { data, isLoading, error, reload } = useTenantPortalData()
  const contract = data?.activeContract

  if (isLoading && !data) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Loading contract"
          message="Fetching your active rental contract."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Contract unavailable"
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

  if (!contract) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="No active contract found."
          message="Your account does not have an active rental contract yet."
        />
      </div>
    )
  }

  return (
    <div className="tenant-portal-page">
      <section className="dashboard-card tenant-summary-card">
        <div className="room-page-actions">
          <button className="primary-button" type="button" onClick={() => window.print()}>
            Print Contract
          </button>
        </div>
        <h2>My Contract</h2>
        <dl className="tenant-detail-list">
          <div>
            <dt>Contract Code</dt>
            <dd>{contract.contractCode}</dd>
          </div>
          <div>
            <dt>Start Date</dt>
            <dd>{contract.startDate}</dd>
          </div>
          <div>
            <dt>End Date</dt>
            <dd>{contract.endDate}</dd>
          </div>
          <div>
            <dt>Monthly Rent</dt>
            <dd>{formatCurrency(contract.monthlyRent)}</dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>{formatCurrency(contract.deposit)}</dd>
          </div>
          <div>
            <dt>Due Day</dt>
            <dd>{contract.paymentDueDay}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span
                className={`tenant-status-badge tenant-status-badge--${contract.status}`}
              >
                {formatLabel(contract.status)}
              </span>
            </dd>
          </div>
          <div className="tenant-detail-long">
            <dt>Terms</dt>
            <dd>{contract.terms || 'No terms provided.'}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

export default MyContractPage
