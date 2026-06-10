import { Link } from 'react-router-dom'

import {
  DashboardSection,
  StatCard,
} from '../../../components/dashboard'
import { formatCurrency } from '../../../utils/format'
import NotificationWidget from '../../notifications/components/NotificationWidget'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

function TenantHomePage() {
  const { data, isLoading, error, reload } = useTenantPortalData()

  if (isLoading && !data) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Loading tenant portal"
          message="Fetching your room, contract, invoices, and utility data."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Tenant portal unavailable"
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

  if (!data?.tenant) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="No tenant profile found"
          message="No tenant record is linked to this account yet."
        />
      </div>
    )
  }

  const latestInvoice = data.invoices[0]
  const utilitiesThisMonth = data.utilities.reduce(
    (sum, utility) => sum + utility.totalAmount,
    0,
  )
  return (
    <div className="tenant-portal-page">
      <DashboardSection
        title={`Welcome back, ${data.tenant.fullName}`}
        description="Tenant Portal"
      >
        <div className="stats-grid">
          <StatCard
            label="Current Room"
            value={data.room?.roomNumber ?? 'Not assigned'}
            helper={data.room?.roomType}
            tone="primary"
          />
          <StatCard
            label="Current Contract Status"
            value={
              data.activeContract
                ? formatLabel(data.activeContract.status)
                : 'No contract'
            }
            helper={data.activeContract?.contractCode}
            tone={data.activeContract?.status === 'active' ? 'success' : 'warning'}
          />
          <StatCard
            label="Current Invoice Status"
            value={latestInvoice ? formatLabel(latestInvoice.status) : 'No invoice'}
            helper={latestInvoice?.invoiceCode}
            tone={latestInvoice?.status === 'paid' ? 'success' : 'warning'}
          />
          <StatCard
            label="Utilities This Month"
            value={formatCurrency(utilitiesThisMonth)}
            helper="Electricity and water"
            tone="primary"
          />
        </div>
      </DashboardSection>

      <div className="tenant-summary-grid">
        <section className="dashboard-card tenant-summary-card">
          <h2>Room Summary</h2>
          <dl className="tenant-detail-list">
            <div>
              <dt>Room Number</dt>
              <dd>{data.room?.roomNumber ?? '-'}</dd>
            </div>
            <div>
              <dt>Room Type</dt>
              <dd>{data.room?.roomType ?? '-'}</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{data.room ? `${data.room.area} sq m` : '-'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{data.room ? formatLabel(data.room.status) : '-'}</dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-card tenant-summary-card">
          <h2>Contract Summary</h2>
          <dl className="tenant-detail-list">
            <div>
              <dt>Contract Code</dt>
              <dd>{data.activeContract?.contractCode ?? '-'}</dd>
            </div>
            <div>
              <dt>Start Date</dt>
              <dd>{data.activeContract?.startDate ?? '-'}</dd>
            </div>
            <div>
              <dt>End Date</dt>
              <dd>{data.activeContract?.endDate ?? '-'}</dd>
            </div>
            <div>
              <dt>Monthly Rent</dt>
              <dd>
                {data.activeContract
                  ? formatCurrency(data.activeContract.monthlyRent)
                  : '-'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-card tenant-summary-card">
          <h2>Latest Invoice</h2>
          <dl className="tenant-detail-list">
            <div>
              <dt>Invoice Code</dt>
              <dd>{latestInvoice?.invoiceCode ?? '-'}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                {latestInvoice ? formatCurrency(latestInvoice.totalAmount) : '-'}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{latestInvoice ? formatLabel(latestInvoice.status) : '-'}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--two">
        <NotificationWidget />

        <section className="dashboard-card panel-card">
          <h2>Quick Actions</h2>
          <div className="tenant-actions">
            <Link className="quick-action-button" to="/tenant/my-contract">
              View Contract
            </Link>
            <Link className="quick-action-button" to="/tenant/my-invoices">
              View Invoices
            </Link>
            <Link className="quick-action-button" to="/tenant/my-utilities">
              View Utilities
            </Link>
            <Link className="quick-action-button" to="/tenant/my-feedback">
              Submit Feedback
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default TenantHomePage
