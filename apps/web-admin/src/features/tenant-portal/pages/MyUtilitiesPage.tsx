import { useMemo, useState } from 'react'

import { DashboardSection, StatCard } from '../../../components/dashboard'
import { DEMO_PAYMENT_CONFIG } from '../../../config/demo-payment'
import { formatVndAmount, generateVietQRUrlForUtility } from '../../../utils/demo-payment'
import { formatCurrency } from '../../../utils/format'
import {
  simulateDemoVietQRUtilityPayment,
} from '../../utilities/services/utility.service'
import type { UtilityReading } from '../../utilities/types'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

function getUtilityPaymentStatus(utility: UtilityReading) {
  return utility.paymentStatus ?? (utility.status === 'paid' || utility.status === 'billed_paid' ? 'paid' : 'unpaid')
}

function DemoVietQRUtilityPaymentModal({
  utility,
  roomNumber,
  processing,
  onClose,
  onSuccess,
}: {
  utility: UtilityReading
  roomNumber?: string
  processing: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const transferContent = roomNumber
    ? `UTILITY-${utility.billingMonth}-${roomNumber}`
    : `UTILITY-${utility.id}`
  const qrUrl = generateVietQRUrlForUtility({ ...utility, roomNumber })

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal tenant-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-utility-payment-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Demo Payment</p>
            <h2 id="tenant-utility-payment-title">Demo VietQR Utility Payment</h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={processing}
            aria-label="Close utility payment modal"
          >
            x
          </button>
        </div>

        <div className="demo-payment-warning">
          Demo payment only. No real transaction is verified automatically.
        </div>

        <div className="tenant-payment-grid">
          <div className="tenant-payment-qr">
            <img src={qrUrl} alt="Demo VietQR utility payment code" />
          </div>
          <dl className="tenant-detail-list">
            <div>
              <dt>Utility Type</dt>
              <dd>{formatLabel(utility.utilityType)}</dd>
            </div>
            <div>
              <dt>Billing Month</dt>
              <dd>{utility.billingMonth}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{roomNumber ?? 'Not available'}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatVndAmount(utility.totalAmount)}</dd>
            </div>
            <div>
              <dt>Bank Name</dt>
              <dd>{DEMO_PAYMENT_CONFIG.bankName}</dd>
            </div>
            <div>
              <dt>Account Number</dt>
              <dd>{DEMO_PAYMENT_CONFIG.accountNo}</dd>
            </div>
            <div>
              <dt>Account Name</dt>
              <dd>{DEMO_PAYMENT_CONFIG.accountName}</dd>
            </div>
            <div className="tenant-detail-long">
              <dt>Transfer Content</dt>
              <dd>{transferContent}</dd>
            </div>
          </dl>
        </div>

        <div className="room-form-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={processing}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={onSuccess} disabled={processing}>
            {processing ? 'Processing...' : 'I have completed payment (Demo)'}
          </button>
        </div>
      </section>
    </div>
  )
}

function MyUtilitiesPage() {
  const { data, isLoading, error, reload } = useTenantPortalData()
  const utilities = useMemo(() => data?.utilities ?? [], [data?.utilities])
  const [paymentUtility, setPaymentUtility] = useState<UtilityReading | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const tenantName = data?.tenant?.fullName ?? 'Tenant'
  const roomNumber = data?.room?.roomNumber

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

  async function handleDemoPaymentSuccess() {
    if (!paymentUtility) {
      return
    }

    setProcessingPayment(true)
    setSuccessMessage('')

    try {
      await simulateDemoVietQRUtilityPayment(paymentUtility.id, tenantName, roomNumber)
      setPaymentUtility(null)
      setSuccessMessage('Demo VietQR utility payment completed. Utility bill marked as paid.')
      await reload()
    } catch {
      setSuccessMessage('Unable to complete demo utility payment. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

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

      {successMessage ? (
        <div className="tenant-payment-success">{successMessage}</div>
      ) : null}

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
                  <th>Payment Status</th>
                  <th>Actions</th>
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
                    <td>
                      <span
                        className={`tenant-status-badge tenant-status-badge--${getUtilityPaymentStatus(utility)}`}
                      >
                        {formatLabel(getUtilityPaymentStatus(utility))}
                      </span>
                    </td>
                    <td>
                      {getUtilityPaymentStatus(utility) !== 'paid' ? (
                        <button
                          className="table-action-button"
                          type="button"
                          onClick={() => setPaymentUtility(utility)}
                        >
                          Pay with VietQR
                        </button>
                      ) : utility.paidAt ? (
                        <span className="tenant-paid-date">Paid</span>
                      ) : (
                        <span className="tenant-paid-date">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {paymentUtility ? (
        <DemoVietQRUtilityPaymentModal
          utility={paymentUtility}
          roomNumber={roomNumber}
          processing={processingPayment}
          onClose={() => {
            if (!processingPayment) {
              setPaymentUtility(null)
            }
          }}
          onSuccess={() => void handleDemoPaymentSuccess()}
        />
      ) : null}
    </div>
  )
}

export default MyUtilitiesPage
