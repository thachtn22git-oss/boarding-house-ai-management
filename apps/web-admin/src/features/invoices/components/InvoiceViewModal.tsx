import type { Contract } from '../../contracts/types'
import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type { Invoice, InvoiceStatus } from '../types'

type InvoiceViewModalProps = {
  invoice: Invoice
  tenant?: Tenant
  room?: Room
  contract?: Contract
  onClose: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getStatusLabel(status: InvoiceStatus) {
  if (status === 'draft') return 'Draft'
  if (status === 'unpaid') return 'Unpaid'
  if (status === 'paid') return 'Paid'
  if (status === 'overdue') return 'Overdue'
  return 'Cancelled'
}

function formatDate(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function InvoiceViewModal({
  invoice,
  tenant,
  room,
  contract,
  onClose,
}: InvoiceViewModalProps) {
  const remainingAmount = Math.max(invoice.totalAmount - invoice.paidAmount, 0)

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal invoice-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-view-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Invoice Summary</p>
            <h2 id="invoice-view-title">{invoice.invoiceCode}</h2>
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

        <div className="contract-summary invoice-summary">
          <dl>
            <div>
              <dt>Invoice code</dt>
              <dd>{invoice.invoiceCode}</dd>
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
              <dt>Contract</dt>
              <dd>{contract?.contractCode ?? 'No contract'}</dd>
            </div>
            <div>
              <dt>Billing month</dt>
              <dd>{invoice.billingMonth}</dd>
            </div>
            <div>
              <dt>Issue date</dt>
              <dd>{formatDate(invoice.issueDate)}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{formatDate(invoice.dueDate)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{getStatusLabel(invoice.status)}</dd>
            </div>
          </dl>

          <div className="invoice-view-items">
            <h3>Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{currencyFormatter.format(item.unitPrice)}</td>
                    <td>{currencyFormatter.format(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="invoice-summary-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{currencyFormatter.format(invoice.subtotal)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>{currencyFormatter.format(invoice.discount)}</dd>
            </div>
            <div>
              <dt>Total amount</dt>
              <dd>{currencyFormatter.format(invoice.totalAmount)}</dd>
            </div>
            <div>
              <dt>Paid amount</dt>
              <dd>{currencyFormatter.format(invoice.paidAmount)}</dd>
            </div>
            <div>
              <dt>Remaining amount</dt>
              <dd>{currencyFormatter.format(remainingAmount)}</dd>
            </div>
            <div>
              <dt>Note</dt>
              <dd>{invoice.note || 'No note provided.'}</dd>
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

export default InvoiceViewModal
