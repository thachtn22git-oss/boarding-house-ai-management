import { useState, type FormEvent } from 'react'

import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type { Contract, ContractFormValues, ContractStatus } from '../types'

type ContractFormModalProps = {
  contract: Contract | null
  open: boolean
  rooms: Room[]
  tenants: Tenant[]
  submitting: boolean
  onClose: () => void
  onSubmit: (values: ContractFormValues) => Promise<void>
}

type ContractFormErrors = Partial<Record<keyof ContractFormValues, string>>

const statusOptions: Array<{ label: string; value: ContractStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Expired', value: 'expired' },
  { label: 'Terminated', value: 'terminated' },
]

const defaultValues: ContractFormValues = {
  tenantId: '',
  roomId: '',
  contractCode: '',
  startDate: '',
  endDate: '',
  monthlyRent: 0,
  deposit: 0,
  paymentDueDay: 1,
  status: 'pending',
  terms: '',
}

function getInitialValues(contract: Contract | null): ContractFormValues {
  if (!contract) {
    return defaultValues
  }

  return {
    tenantId: contract.tenantId,
    roomId: contract.roomId,
    contractCode: contract.contractCode,
    startDate: contract.startDate,
    endDate: contract.endDate,
    monthlyRent: contract.monthlyRent,
    deposit: contract.deposit,
    paymentDueDay: contract.paymentDueDay,
    status: contract.status,
    terms: contract.terms ?? '',
  }
}

function validateContract(values: ContractFormValues) {
  const errors: ContractFormErrors = {}

  if (!values.contractCode.trim()) {
    errors.contractCode = 'Contract code is required.'
  }

  if (!values.tenantId) {
    errors.tenantId = 'Tenant is required.'
  }

  if (!values.roomId) {
    errors.roomId = 'Room is required.'
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required.'
  }

  if (!values.endDate) {
    errors.endDate = 'End date is required.'
  } else if (
    values.startDate &&
    new Date(values.endDate).getTime() <= new Date(values.startDate).getTime()
  ) {
    errors.endDate = 'End date must be after start date.'
  }

  if (Number.isNaN(values.monthlyRent) || values.monthlyRent <= 0) {
    errors.monthlyRent = 'Monthly rent must be greater than 0.'
  }

  if (Number.isNaN(values.deposit) || values.deposit < 0) {
    errors.deposit = 'Deposit must be 0 or greater.'
  }

  if (
    Number.isNaN(values.paymentDueDay) ||
    values.paymentDueDay < 1 ||
    values.paymentDueDay > 31
  ) {
    errors.paymentDueDay = 'Payment due day must be between 1 and 31.'
  }

  if (!values.status) {
    errors.status = 'Status is required.'
  }

  return errors
}

function ContractFormModal({
  contract,
  open,
  rooms,
  tenants,
  submitting,
  onClose,
  onSubmit,
}: ContractFormModalProps) {
  const [values, setValues] = useState<ContractFormValues>(() =>
    getInitialValues(contract),
  )
  const [errors, setErrors] = useState<ContractFormErrors>({})

  if (!open) {
    return null
  }

  const isEditing = Boolean(contract)

  function updateValue<Field extends keyof ContractFormValues>(
    field: Field,
    value: ContractFormValues[Field],
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
    const nextErrors = validateContract(values)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit({
      ...values,
      contractCode: values.contractCode.trim(),
      terms: values.terms?.trim() || undefined,
    })
  }

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-modal-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Contract Management</p>
            <h2 id="contract-modal-title">
              {isEditing ? 'Edit Contract' : 'Create Contract'}
            </h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close contract form"
          >
            x
          </button>
        </div>

        <form className="room-form" onSubmit={handleSubmit}>
          <label className="room-form-field">
            <span>Contract code</span>
            <input
              value={values.contractCode}
              disabled={submitting}
              aria-invalid={Boolean(errors.contractCode)}
              onChange={(event) =>
                updateValue('contractCode', event.target.value)
              }
            />
            {errors.contractCode ? (
              <small className="field-error">{errors.contractCode}</small>
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
            <span>Start date</span>
            <input
              type="date"
              value={values.startDate}
              disabled={submitting}
              aria-invalid={Boolean(errors.startDate)}
              onChange={(event) => updateValue('startDate', event.target.value)}
            />
            {errors.startDate ? (
              <small className="field-error">{errors.startDate}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>End date</span>
            <input
              type="date"
              value={values.endDate}
              disabled={submitting}
              aria-invalid={Boolean(errors.endDate)}
              onChange={(event) => updateValue('endDate', event.target.value)}
            />
            {errors.endDate ? (
              <small className="field-error">{errors.endDate}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Monthly rent</span>
            <input
              type="number"
              min="0"
              value={values.monthlyRent}
              disabled={submitting}
              aria-invalid={Boolean(errors.monthlyRent)}
              onChange={(event) =>
                updateValue('monthlyRent', event.target.valueAsNumber)
              }
            />
            {errors.monthlyRent ? (
              <small className="field-error">{errors.monthlyRent}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Deposit</span>
            <input
              type="number"
              min="0"
              value={values.deposit}
              disabled={submitting}
              aria-invalid={Boolean(errors.deposit)}
              onChange={(event) =>
                updateValue('deposit', event.target.valueAsNumber)
              }
            />
            {errors.deposit ? (
              <small className="field-error">{errors.deposit}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Payment due day</span>
            <input
              type="number"
              min="1"
              max="31"
              value={values.paymentDueDay}
              disabled={submitting}
              aria-invalid={Boolean(errors.paymentDueDay)}
              onChange={(event) =>
                updateValue('paymentDueDay', event.target.valueAsNumber)
              }
            />
            {errors.paymentDueDay ? (
              <small className="field-error">{errors.paymentDueDay}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Status</span>
            <select
              value={values.status}
              disabled={submitting}
              aria-invalid={Boolean(errors.status)}
              onChange={(event) =>
                updateValue('status', event.target.value as ContractStatus)
              }
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            {errors.status ? (
              <small className="field-error">{errors.status}</small>
            ) : null}
          </label>

          <label className="room-form-field room-form-field--full">
            <span>Terms</span>
            <textarea
              value={values.terms}
              rows={4}
              disabled={submitting}
              onChange={(event) => updateValue('terms', event.target.value)}
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
                  ? 'Update Contract'
                  : 'Create Contract'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ContractFormModal
