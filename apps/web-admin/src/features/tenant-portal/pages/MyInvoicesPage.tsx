import { useMemo, useState } from 'react'

import { DashboardSection, StatCard } from '../../../components/dashboard'
import { DEMO_PAYMENT_CONFIG } from '../../../config/demo-payment'
import { formatVndAmount, generateVietQRUrl } from '../../../utils/demo-payment'
import { formatCurrency, formatDate } from '../../../utils/format'
import {
  simulateDemoVietQRInvoicePayment,
} from '../../invoices/services/invoice.service'
import type { Invoice } from '../../invoices/types'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

function TenantInvoiceViewModal({
  invoice,
  onPay,
  onClose,
}: {
  invoice: Invoice
  onPay: (invoice: Invoice) => void
  onClose: () => void
}) {
  const remainingAmount = Math.max(invoice.totalAmount - invoice.paidAmount, 0)
  const paymentStatus = invoice.paymentStatus ?? (invoice.status === 'paid' ? 'paid' : 'unpaid')
  const canPay = invoice.status !== 'paid' && invoice.status !== 'cancelled'

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal tenant-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-invoice-view-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Invoice Summary</p>
            <h2 id="tenant-invoice-view-title">{invoice.invoiceCode}</h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close invoice summary"
          >
            x
          </button>
        </div>

        <div className="tenant-summary-card">
          <dl className="tenant-detail-list">
            <div>
              <dt>Invoice Code</dt>
              <dd>{invoice.invoiceCode}</dd>
            </div>
            <div>
              <dt>Billing Month</dt>
              <dd>{invoice.billingMonth}</dd>
            </div>
            <div>
              <dt>Issue Date</dt>
              <dd>{invoice.issueDate}</dd>
            </div>
            <div>
              <dt>Due Date</dt>
              <dd>{invoice.dueDate}</dd>
            </div>
            <div>
              <dt>Total Amount</dt>
              <dd>{formatCurrency(invoice.totalAmount)}</dd>
            </div>
            <div>
              <dt>Paid Amount</dt>
              <dd>{formatCurrency(invoice.paidAmount)}</dd>
            </div>
            <div>
              <dt>Remaining Amount</dt>
              <dd>{formatCurrency(remainingAmount)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatLabel(invoice.status)}</dd>
            </div>
            <div>
              <dt>Payment Status</dt>
              <dd>{formatLabel(paymentStatus)}</dd>
            </div>
            <div>
              <dt>Payment Method</dt>
              <dd>{invoice.paymentMethod ? formatLabel(invoice.paymentMethod) : '-'}</dd>
            </div>
            <div>
              <dt>Payment Reference</dt>
              <dd>{invoice.paymentReference ?? '-'}</dd>
            </div>
            <div>
              <dt>Paid At</dt>
              <dd>{invoice.paidAt ? formatDate(invoice.paidAt) : '-'}</dd>
            </div>
            <div className="tenant-detail-long">
              <dt>Note</dt>
              <dd>{invoice.note || 'No note provided.'}</dd>
            </div>
          </dl>
        </div>

        <div className="room-form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          {canPay ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => onPay(invoice)}
            >
              Pay with VietQR
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function DemoQrPaymentModal({
  invoice,
  processing,
  onClose,
  onSuccess,
}: {
  invoice: Invoice
  processing: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const vietQrUrl = generateVietQRUrl(invoice)

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal tenant-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-payment-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Demo Payment</p>
            <h2 id="tenant-payment-title">Demo VietQR Payment</h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            disabled={processing}
          >
            x
          </button>
        </div>

        <div className="demo-payment-warning">
          This is a demo payment flow. No real transaction is verified automatically.
        </div>

        <div className="tenant-payment-grid">
          <div className="tenant-payment-qr">
            <img src={vietQrUrl} alt="Demo VietQR payment code" />
          </div>
          <dl className="tenant-detail-list">
            <div>
              <dt>Invoice Code</dt>
              <dd>{invoice.invoiceCode}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatVndAmount(invoice.totalAmount)}</dd>
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
            <div>
              <dt>Due Date</dt>
              <dd>{invoice.dueDate}</dd>
            </div>
            <div className="tenant-detail-long">
              <dt>Transfer Content</dt>
              <dd>{invoice.invoiceCode}</dd>
            </div>
          </dl>
        </div>

        <div className="room-form-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={processing}
          >
            Close
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={onSuccess}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'I have completed payment (Demo)'}
          </button>
        </div>
      </section>
    </div>
  )
}

function MyInvoicesPage() {
  const { data, isLoading, error, reload } = useTenantPortalData()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const invoices = useMemo(() => data?.invoices ?? [], [data?.invoices])
  const tenantName = data?.tenant?.fullName ?? 'Tenant'

  const stats = useMemo(
    () => ({
      paid: invoices.filter((invoice) => invoice.status === 'paid').length,
      unpaid: invoices.filter((invoice) => invoice.status === 'unpaid').length,
      overdue: invoices.filter((invoice) => invoice.status === 'overdue').length,
    }),
    [invoices],
  )

  async function handleDemoPaymentSuccess() {
    if (!paymentInvoice) {
      return
    }

    setProcessingPayment(true)
    setSuccessMessage('')

    try {
      await simulateDemoVietQRInvoicePayment(paymentInvoice.id, tenantName)
      setPaymentInvoice(null)
      setSelectedInvoice(null)
      setSuccessMessage('Demo VietQR payment completed. Invoice marked as paid.')
      await reload()
    } catch {
      setSuccessMessage('Unable to complete demo payment. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Loading invoices"
          message="Fetching invoices linked to your tenant profile."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Invoices unavailable"
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
        title="Invoice Statistics"
        description="Invoices linked to your current tenant profile."
      >
        <div className="stats-grid">
          <StatCard label="Total Invoices" value={String(invoices.length)} />
          <StatCard label="Paid" value={String(stats.paid)} tone="success" />
          <StatCard label="Unpaid" value={String(stats.unpaid)} tone="warning" />
          <StatCard label="Overdue" value={String(stats.overdue)} tone="danger" />
        </div>
      </DashboardSection>

      {successMessage ? (
        <div className="tenant-payment-success">{successMessage}</div>
      ) : null}

      <section className="dashboard-card room-table-card">
        {invoices.length === 0 ? (
          <div className="room-empty-state">
            <h2>No invoices found.</h2>
            <p>Your invoices will appear here when they are generated.</p>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table">
              <thead>
                <tr>
                  <th>Invoice Code</th>
                  <th>Billing Month</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceCode}</td>
                    <td>{invoice.billingMonth}</td>
                    <td>{invoice.dueDate}</td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td>{formatCurrency(invoice.paidAmount)}</td>
                    <td>
                      <span
                        className={`tenant-status-badge tenant-status-badge--${invoice.status}`}
                      >
                        {formatLabel(invoice.status)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`tenant-status-badge tenant-status-badge--${invoice.paymentStatus ?? (invoice.status === 'paid' ? 'paid' : 'unpaid')}`}
                      >
                        {formatLabel(invoice.paymentStatus ?? (invoice.status === 'paid' ? 'paid' : 'unpaid'))}
                      </span>
                      {invoice.status === 'paid' && invoice.paidAt ? (
                        <span className="tenant-paid-date">
                          Paid {formatDate(invoice.paidAt)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <div className="room-table-actions">
                        <button
                          className="table-action-button"
                          type="button"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          View Invoice
                        </button>
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => setPaymentInvoice(invoice)}
                          >
                            Pay with VietQR
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedInvoice ? (
        <TenantInvoiceViewModal
          invoice={selectedInvoice}
          onPay={setPaymentInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      ) : null}

      {paymentInvoice ? (
        <DemoQrPaymentModal
          invoice={paymentInvoice}
          processing={processingPayment}
          onClose={() => {
            if (!processingPayment) {
              setPaymentInvoice(null)
            }
          }}
          onSuccess={() => void handleDemoPaymentSuccess()}
        />
      ) : null}
    </div>
  )
}

export default MyInvoicesPage
