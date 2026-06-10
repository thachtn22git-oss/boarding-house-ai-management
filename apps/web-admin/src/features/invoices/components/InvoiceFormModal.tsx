import { useMemo, useState, type FormEvent } from 'react'

import type { Contract } from '../../contracts/types'
import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type {
  Invoice,
  InvoiceFormValues,
  InvoiceItem,
  InvoiceStatus,
} from '../types'

type InvoiceFormModalProps = {
  invoice: Invoice | null
  open: boolean
  rooms: Room[]
  tenants: Tenant[]
  contracts: Contract[]
  submitting: boolean
  onClose: () => void
  onSubmit: (values: InvoiceFormValues) => Promise<void>
}

type InvoiceFormErrors = Partial<
  Record<keyof InvoiceFormValues | `item-${number}`, string>
>

const itemNameOptions = [
  'Monthly rent',
  'Electricity',
  'Water',
  'Internet',
  'Service fee',
]

const statusOptions: Array<{ label: string; value: InvoiceStatus }> = [
  { label: 'Draft', value: 'draft' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
]

function createInvoiceItem(name = 'Monthly rent'): InvoiceItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    quantity: 1,
    unitPrice: 0,
    amount: 0,
  }
}

const defaultValues: InvoiceFormValues = {
  tenantId: '',
  roomId: '',
  contractId: '',
  invoiceCode: '',
  billingMonth: '',
  issueDate: '',
  dueDate: '',
  items: [createInvoiceItem()],
  discount: 0,
  paidAmount: 0,
  status: 'unpaid',
  note: '',
}

function calculateItem(item: InvoiceItem): InvoiceItem {
  const quantity = Number(item.quantity)
  const unitPrice = Number(item.unitPrice)

  return {
    ...item,
    quantity,
    unitPrice,
    amount: quantity * unitPrice,
  }
}

function getInitialValues(invoice: Invoice | null): InvoiceFormValues {
  if (!invoice) {
    return defaultValues
  }

  return {
    tenantId: invoice.tenantId,
    roomId: invoice.roomId,
    contractId: invoice.contractId ?? '',
    invoiceCode: invoice.invoiceCode,
    billingMonth: invoice.billingMonth,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    items: invoice.items.length > 0 ? invoice.items : [createInvoiceItem()],
    discount: invoice.discount,
    paidAmount: invoice.paidAmount,
    status: invoice.status,
    note: invoice.note ?? '',
  }
}

function getTotals(values: InvoiceFormValues) {
  const items = values.items.map(calculateItem)
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const totalAmount = Math.max(subtotal - Number(values.discount || 0), 0)
  const remainingAmount = Math.max(totalAmount - Number(values.paidAmount || 0), 0)

  return {
    items,
    subtotal,
    totalAmount,
    remainingAmount,
  }
}

function validateInvoice(values: InvoiceFormValues) {
  const errors: InvoiceFormErrors = {}
  const totals = getTotals(values)

  if (!values.invoiceCode.trim()) {
    errors.invoiceCode = 'Invoice code is required.'
  }

  if (!values.billingMonth) {
    errors.billingMonth = 'Billing month is required.'
  }

  if (!values.tenantId) {
    errors.tenantId = 'Tenant is required.'
  }

  if (!values.roomId) {
    errors.roomId = 'Room is required.'
  }

  if (!values.issueDate) {
    errors.issueDate = 'Issue date is required.'
  }

  if (!values.dueDate) {
    errors.dueDate = 'Due date is required.'
  } else if (
    values.issueDate &&
    new Date(values.dueDate).getTime() < new Date(values.issueDate).getTime()
  ) {
    errors.dueDate = 'Due date must be after or equal to issue date.'
  }

  if (values.items.length === 0) {
    errors.items = 'At least one invoice item is required.'
  }

  values.items.forEach((item, index) => {
    if (!item.name.trim()) {
      errors[`item-${index}`] = 'Item name is required.'
    } else if (Number.isNaN(item.quantity) || item.quantity <= 0) {
      errors[`item-${index}`] = 'Quantity must be greater than 0.'
    } else if (Number.isNaN(item.unitPrice) || item.unitPrice < 0) {
      errors[`item-${index}`] = 'Unit price must be 0 or greater.'
    }
  })

  if (Number.isNaN(values.discount) || values.discount < 0) {
    errors.discount = 'Discount must be 0 or greater.'
  }

  if (Number.isNaN(values.paidAmount) || values.paidAmount < 0) {
    errors.paidAmount = 'Paid amount must be 0 or greater.'
  } else if (values.paidAmount > totals.totalAmount) {
    errors.paidAmount = 'Paid amount cannot exceed total amount.'
  }

  if (!values.status) {
    errors.status = 'Status is required.'
  }

  return errors
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function InvoiceFormModal({
  invoice,
  open,
  rooms,
  tenants,
  contracts,
  submitting,
  onClose,
  onSubmit,
}: InvoiceFormModalProps) {
  const [values, setValues] = useState<InvoiceFormValues>(() =>
    getInitialValues(invoice),
  )
  const [errors, setErrors] = useState<InvoiceFormErrors>({})
  const totals = useMemo(() => getTotals(values), [values])

  if (!open) {
    return null
  }

  const isEditing = Boolean(invoice)

  function updateValue<Field extends keyof InvoiceFormValues>(
    field: Field,
    value: InvoiceFormValues[Field],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  function updateItem(index: number, updates: Partial<InvoiceItem>) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? calculateItem({ ...item, ...updates }) : item,
      ),
    }))
    setErrors((current) => ({
      ...current,
      [`item-${index}`]: undefined,
    }))
  }

  function addItem() {
    setValues((current) => ({
      ...current,
      items: [...current.items, createInvoiceItem('Service fee')],
    }))
  }

  function removeItem(index: number) {
    setValues((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextValues = {
      ...values,
      items: totals.items,
      invoiceCode: values.invoiceCode.trim(),
      note: values.note?.trim() || undefined,
      contractId: values.contractId || undefined,
    }
    const nextErrors = validateInvoice(nextValues)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit(nextValues)
  }

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal invoice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-modal-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Invoice Management</p>
            <h2 id="invoice-modal-title">
              {isEditing ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close invoice form"
          >
            x
          </button>
        </div>

        <form className="room-form invoice-form" onSubmit={handleSubmit}>
          <label className="room-form-field">
            <span>Invoice code</span>
            <input
              value={values.invoiceCode}
              disabled={submitting}
              aria-invalid={Boolean(errors.invoiceCode)}
              onChange={(event) => updateValue('invoiceCode', event.target.value)}
            />
            {errors.invoiceCode ? (
              <small className="field-error">{errors.invoiceCode}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Billing month</span>
            <input
              type="month"
              value={values.billingMonth}
              disabled={submitting}
              aria-invalid={Boolean(errors.billingMonth)}
              onChange={(event) => updateValue('billingMonth', event.target.value)}
            />
            {errors.billingMonth ? (
              <small className="field-error">{errors.billingMonth}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Tenant</span>
            <select
              value={values.tenantId}
              disabled={submitting}
              aria-invalid={Boolean(errors.tenantId)}
              onChange={(event) => updateValue('tenantId', event.target.value)}
            >
              <option value="">Select a tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.fullName} - {tenant.email}
                </option>
              ))}
            </select>
            {errors.tenantId ? (
              <small className="field-error">{errors.tenantId}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Room</span>
            <select
              value={values.roomId}
              disabled={submitting}
              aria-invalid={Boolean(errors.roomId)}
              onChange={(event) => updateValue('roomId', event.target.value)}
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - {room.roomType}
                </option>
              ))}
            </select>
            {errors.roomId ? (
              <small className="field-error">{errors.roomId}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Contract</span>
            <select
              value={values.contractId}
              disabled={submitting}
              onChange={(event) => updateValue('contractId', event.target.value)}
            >
              <option value="">No contract</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractCode}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Issue date</span>
            <input
              type="date"
              value={values.issueDate}
              disabled={submitting}
              aria-invalid={Boolean(errors.issueDate)}
              onChange={(event) => updateValue('issueDate', event.target.value)}
            />
            {errors.issueDate ? (
              <small className="field-error">{errors.issueDate}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Due date</span>
            <input
              type="date"
              value={values.dueDate}
              disabled={submitting}
              aria-invalid={Boolean(errors.dueDate)}
              onChange={(event) => updateValue('dueDate', event.target.value)}
            />
            {errors.dueDate ? (
              <small className="field-error">{errors.dueDate}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Status</span>
            <select
              value={values.status}
              disabled={submitting}
              aria-invalid={Boolean(errors.status)}
              onChange={(event) =>
                updateValue('status', event.target.value as InvoiceStatus)
              }
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <section className="invoice-items-section">
            <div className="invoice-items-header">
              <div>
                <h3>Invoice items</h3>
                <p>Add one or more charges for this invoice.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={addItem}
                disabled={submitting}
              >
                Add item
              </button>
            </div>

            {errors.items ? (
              <small className="field-error">{errors.items}</small>
            ) : null}

            <div className="invoice-items-list">
              {values.items.map((item, index) => (
                <div className="invoice-item-row" key={item.id}>
                  <label className="room-form-field">
                    <span>Name</span>
                    <input
                      list="invoice-item-options"
                      value={item.name}
                      disabled={submitting}
                      onChange={(event) =>
                        updateItem(index, { name: event.target.value })
                      }
                    />
                  </label>
                  <label className="room-form-field">
                    <span>Quantity</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      disabled={submitting}
                      onChange={(event) =>
                        updateItem(index, { quantity: event.target.valueAsNumber })
                      }
                    />
                  </label>
                  <label className="room-form-field">
                    <span>Unit price</span>
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      disabled={submitting}
                      onChange={(event) =>
                        updateItem(index, { unitPrice: event.target.valueAsNumber })
                      }
                    />
                  </label>
                  <div className="invoice-item-amount">
                    <span>Amount</span>
                    <strong>{currencyFormatter.format(item.amount)}</strong>
                  </div>
                  <button
                    className="table-action-button danger"
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={submitting || values.items.length === 1}
                  >
                    Remove
                  </button>
                  {errors[`item-${index}`] ? (
                    <small className="field-error invoice-item-error">
                      {errors[`item-${index}`]}
                    </small>
                  ) : null}
                </div>
              ))}
            </div>

            <datalist id="invoice-item-options">
              {itemNameOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </section>

          <label className="room-form-field">
            <span>Discount</span>
            <input
              type="number"
              min="0"
              value={values.discount}
              disabled={submitting}
              aria-invalid={Boolean(errors.discount)}
              onChange={(event) =>
                updateValue('discount', event.target.valueAsNumber)
              }
            />
            {errors.discount ? (
              <small className="field-error">{errors.discount}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Paid amount</span>
            <input
              type="number"
              min="0"
              value={values.paidAmount}
              disabled={submitting}
              aria-invalid={Boolean(errors.paidAmount)}
              onChange={(event) =>
                updateValue('paidAmount', event.target.valueAsNumber)
              }
            />
            {errors.paidAmount ? (
              <small className="field-error">{errors.paidAmount}</small>
            ) : null}
          </label>

          <div className="invoice-total-card">
            <span>Subtotal</span>
            <strong>{currencyFormatter.format(totals.subtotal)}</strong>
            <span>Total amount</span>
            <strong>{currencyFormatter.format(totals.totalAmount)}</strong>
            <span>Remaining</span>
            <strong>{currencyFormatter.format(totals.remainingAmount)}</strong>
          </div>

          <label className="room-form-field room-form-field--full">
            <span>Note</span>
            <textarea
              value={values.note}
              rows={3}
              disabled={submitting}
              onChange={(event) => updateValue('note', event.target.value)}
            />
          </label>

          <div className="room-form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Invoice'
                  : 'Create Invoice'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default InvoiceFormModal
