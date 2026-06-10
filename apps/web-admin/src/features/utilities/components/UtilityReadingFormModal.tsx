import { useMemo, useState, type FormEvent } from 'react'

import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type {
  UtilityReading,
  UtilityReadingFormValues,
  UtilityReadingStatus,
  UtilityType,
} from '../types'

type UtilityReadingFormModalProps = {
  reading: UtilityReading | null
  open: boolean
  rooms: Room[]
  tenants: Tenant[]
  submitting: boolean
  onClose: () => void
  onSubmit: (values: UtilityReadingFormValues) => Promise<void>
}

type UtilityReadingFormErrors = Partial<Record<keyof UtilityReadingFormValues, string>>

const utilityTypeOptions: Array<{ label: string; value: UtilityType }> = [
  { label: 'Electricity', value: 'electricity' },
  { label: 'Water', value: 'water' },
]

const statusOptions: Array<{ label: string; value: UtilityReadingStatus }> = [
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Billed', value: 'billed' },
]

const defaultValues: UtilityReadingFormValues = {
  roomId: '',
  tenantId: '',
  utilityType: 'electricity',
  billingMonth: '',
  previousReading: 0,
  currentReading: 0,
  unitPrice: 0,
  status: 'draft',
  note: '',
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function getInitialValues(
  reading: UtilityReading | null,
): UtilityReadingFormValues {
  if (!reading) {
    return defaultValues
  }

  return {
    roomId: reading.roomId,
    tenantId: reading.tenantId ?? '',
    utilityType: reading.utilityType,
    billingMonth: reading.billingMonth,
    previousReading: reading.previousReading,
    currentReading: reading.currentReading,
    unitPrice: reading.unitPrice,
    status: reading.status,
    note: reading.note ?? '',
  }
}

function getCalculatedValues(values: UtilityReadingFormValues) {
  const usage = Number(values.currentReading) - Number(values.previousReading)
  const totalAmount = usage * Number(values.unitPrice)

  return {
    usage,
    totalAmount,
  }
}

function validateReading(values: UtilityReadingFormValues) {
  const errors: UtilityReadingFormErrors = {}

  if (!values.roomId) {
    errors.roomId = 'Room is required.'
  }

  if (!values.utilityType) {
    errors.utilityType = 'Utility type is required.'
  }

  if (!values.billingMonth) {
    errors.billingMonth = 'Billing month is required.'
  }

  if (Number.isNaN(values.previousReading) || values.previousReading < 0) {
    errors.previousReading = 'Previous reading must be 0 or greater.'
  }

  if (
    Number.isNaN(values.currentReading) ||
    values.currentReading < values.previousReading
  ) {
    errors.currentReading =
      'Current reading must be greater than or equal to previous reading.'
  }

  if (Number.isNaN(values.unitPrice) || values.unitPrice <= 0) {
    errors.unitPrice = 'Unit price must be greater than 0.'
  }

  if (!values.status) {
    errors.status = 'Status is required.'
  }

  return errors
}

function UtilityReadingFormModal({
  reading,
  open,
  rooms,
  tenants,
  submitting,
  onClose,
  onSubmit,
}: UtilityReadingFormModalProps) {
  const [values, setValues] = useState<UtilityReadingFormValues>(() =>
    getInitialValues(reading),
  )
  const [errors, setErrors] = useState<UtilityReadingFormErrors>({})
  const calculatedValues = useMemo(() => getCalculatedValues(values), [values])

  if (!open) {
    return null
  }

  const isEditing = Boolean(reading)

  function updateValue<Field extends keyof UtilityReadingFormValues>(
    field: Field,
    value: UtilityReadingFormValues[Field],
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextValues = {
      ...values,
      tenantId: values.tenantId || undefined,
      note: values.note?.trim() || undefined,
    }
    const nextErrors = validateReading(nextValues)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit(nextValues)
  }

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal utility-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="utility-modal-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Utilities Management</p>
            <h2 id="utility-modal-title">
              {isEditing ? 'Edit Reading' : 'Create Reading'}
            </h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close utility reading form"
          >
            x
          </button>
        </div>

        <form className="room-form utility-form" onSubmit={handleSubmit}>
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
            <span>Tenant</span>
            <select
              value={values.tenantId}
              disabled={submitting}
              onChange={(event) => updateValue('tenantId', event.target.value)}
            >
              <option value="">No tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.fullName} - {tenant.email}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Utility type</span>
            <select
              value={values.utilityType}
              disabled={submitting}
              aria-invalid={Boolean(errors.utilityType)}
              onChange={(event) =>
                updateValue('utilityType', event.target.value as UtilityType)
              }
            >
              {utilityTypeOptions.map((utilityType) => (
                <option key={utilityType.value} value={utilityType.value}>
                  {utilityType.label}
                </option>
              ))}
            </select>
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
            <span>Previous reading</span>
            <input
              type="number"
              min="0"
              value={values.previousReading}
              disabled={submitting}
              aria-invalid={Boolean(errors.previousReading)}
              onChange={(event) =>
                updateValue('previousReading', event.target.valueAsNumber)
              }
            />
            {errors.previousReading ? (
              <small className="field-error">{errors.previousReading}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Current reading</span>
            <input
              type="number"
              min="0"
              value={values.currentReading}
              disabled={submitting}
              aria-invalid={Boolean(errors.currentReading)}
              onChange={(event) =>
                updateValue('currentReading', event.target.valueAsNumber)
              }
            />
            {errors.currentReading ? (
              <small className="field-error">{errors.currentReading}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Unit price</span>
            <input
              type="number"
              min="0"
              value={values.unitPrice}
              disabled={submitting}
              aria-invalid={Boolean(errors.unitPrice)}
              onChange={(event) =>
                updateValue('unitPrice', event.target.valueAsNumber)
              }
            />
            {errors.unitPrice ? (
              <small className="field-error">{errors.unitPrice}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Status</span>
            <select
              value={values.status}
              disabled={submitting}
              aria-invalid={Boolean(errors.status)}
              onChange={(event) =>
                updateValue('status', event.target.value as UtilityReadingStatus)
              }
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="invoice-total-card utility-total-card">
            <span>Usage</span>
            <strong>{Math.max(calculatedValues.usage, 0)}</strong>
            <span>Total Amount</span>
            <strong>
              {currencyFormatter.format(Math.max(calculatedValues.totalAmount, 0))}
            </strong>
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
                  ? 'Update Reading'
                  : 'Create Reading'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default UtilityReadingFormModal
