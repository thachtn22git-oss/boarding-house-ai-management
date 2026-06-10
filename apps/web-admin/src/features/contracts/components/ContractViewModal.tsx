import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type { Contract, ContractStatus } from '../types'

type ContractViewModalProps = {
  contract: Contract
  tenant?: Tenant
  room?: Room
  onClose: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getStatusLabel(status: ContractStatus) {
  if (status === 'active') {
    return 'Active'
  }

  if (status === 'pending') {
    return 'Pending'
  }

  if (status === 'expired') {
    return 'Expired'
  }

  return 'Terminated'
}

function formatDate(value: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function ContractViewModal({
  contract,
  tenant,
  room,
  onClose,
}: ContractViewModalProps) {
  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal contract-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-view-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Contract Summary</p>
            <h2 id="contract-view-title">{contract.contractCode}</h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close contract summary"
          >
            x
          </button>
        </div>

        <div className="contract-summary">
          <dl>
            <div>
              <dt>Contract code</dt>
              <dd>{contract.contractCode}</dd>
            </div>
            <div>
              <dt>Tenant details</dt>
              <dd>
                {tenant
                  ? `${tenant.fullName} - ${tenant.email}`
                  : 'Tenant not found'}
              </dd>
            </div>
            <div>
              <dt>Room details</dt>
              <dd>
                {room ? `${room.roomNumber} - ${room.roomType}` : 'Room not found'}
              </dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>{formatDate(contract.startDate)}</dd>
            </div>
            <div>
              <dt>End date</dt>
              <dd>{formatDate(contract.endDate)}</dd>
            </div>
            <div>
              <dt>Monthly rent</dt>
              <dd>{currencyFormatter.format(contract.monthlyRent)}</dd>
            </div>
            <div>
              <dt>Deposit</dt>
              <dd>{currencyFormatter.format(contract.deposit)}</dd>
            </div>
            <div>
              <dt>Payment due day</dt>
              <dd>Day {contract.paymentDueDay}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{getStatusLabel(contract.status)}</dd>
            </div>
            <div className="contract-summary-full">
              <dt>Terms</dt>
              <dd>{contract.terms || 'No terms provided.'}</dd>
            </div>
          </dl>
        </div>

        <div className="room-form-actions contract-view-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </section>
    </div>
  )
}

export default ContractViewModal
