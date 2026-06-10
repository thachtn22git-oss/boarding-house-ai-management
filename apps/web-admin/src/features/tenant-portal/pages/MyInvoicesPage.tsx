import { useMemo, useState } from 'react'

import { DashboardSection, StatCard } from '../../../components/dashboard'
import { formatCurrency } from '../../../utils/format'
import type { Invoice } from '../../invoices/types'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

function TenantInvoiceViewModal({
  invoice,
  onClose,
}: {
  invoice: Invoice
  onClose: () => void
}) {
  const remainingAmount = Math.max(invoice.totalAmount - invoice.paidAmount, 0)

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
        </div>
      </section>
    </div>
  )
}

function MyInvoicesPage() {
  const { data, isLoading, error, reload } = useTenantPortalData()
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const invoices = useMemo(() => data?.invoices ?? [], [data?.invoices])

  const stats = useMemo(
    () => ({
      paid: invoices.filter((invoice) => invoice.status === 'paid').length,
      unpaid: invoices.filter((invoice) => invoice.status === 'unpaid').length,
      overdue: invoices.filter((invoice) => invoice.status === 'overdue').length,
    }),
    [invoices],
  )

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
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        View Invoice
                      </button>
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
          onClose={() => setSelectedInvoice(null)}
        />
      ) : null}
    </div>
  )
}

export default MyInvoicesPage
