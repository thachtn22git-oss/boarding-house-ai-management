import { formatCurrency } from '../../../utils/format'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

function MyRoomPage() {
  const { data, isLoading, error, reload } = useTenantPortalData()
  const room = data?.room

  if (isLoading && !data) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Loading room information"
          message="Fetching your assigned room details."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Room information unavailable"
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

  if (!room) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="No room information available."
          message="Your account does not have an assigned room yet."
        />
      </div>
    )
  }

  return (
    <div className="tenant-portal-page">
      <section className="dashboard-card tenant-summary-card">
        <h2>My Room</h2>
        <dl className="tenant-detail-list">
          <div>
            <dt>Room Number</dt>
            <dd>{room.roomNumber}</dd>
          </div>
          <div>
            <dt>Room Type</dt>
            <dd>{room.roomType}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{room.area} sq m</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{formatCurrency(room.price)}</dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>{formatCurrency(room.deposit)}</dd>
          </div>
          <div>
            <dt>Maximum Occupancy</dt>
            <dd>{room.maxTenants}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`tenant-status-badge tenant-status-badge--${room.status}`}>
                {formatLabel(room.status)}
              </span>
            </dd>
          </div>
          <div className="tenant-detail-long">
            <dt>Description</dt>
            <dd>{room.description || 'No description provided.'}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

export default MyRoomPage
