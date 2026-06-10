import { useState, type FormEvent } from 'react'

import type { Room } from '../../rooms/types'
import type { Tenant, TenantFormValues, TenantStatus } from '../types'

type TenantFormModalProps = {
  tenant: Tenant | null
  open: boolean
  rooms: Room[]
  submitting: boolean
  onClose: () => void
  onSubmit: (values: TenantFormValues) => Promise<void>
}

type TenantFormErrors = Partial<Record<keyof TenantFormValues, string>>

const statusOptions: Array<{ label: string; value: TenantStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Inactive', value: 'inactive' },
]

const defaultValues: TenantFormValues = {
  roomId: '',
  fullName: '',
  email: '',
  phone: '',
  identityNumber: '',
  dateOfBirth: '',
  address: '',
  status: 'active',
  moveInDate: '',
}

function getInitialValues(tenant: Tenant | null): TenantFormValues {
  if (!tenant) {
    return defaultValues
  }

  return {
    roomId: tenant.roomId,
    fullName: tenant.fullName,
    email: tenant.email,
    phone: tenant.phone,
    identityNumber: tenant.identityNumber,
    dateOfBirth: tenant.dateOfBirth ?? '',
    address: tenant.address ?? '',
    status: tenant.status,
    moveInDate: tenant.moveInDate,
  }
}

function validateTenant(values: TenantFormValues) {
  const errors: TenantFormErrors = {}
  const email = values.email.trim()

  if (!values.roomId) {
    errors.roomId = 'Room is required.'
  }

  if (!values.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if (!email) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.'
  }

  if (!values.phone.trim()) {
    errors.phone = 'Phone is required.'
  }

  if (!values.identityNumber.trim()) {
    errors.identityNumber = 'Identity number is required.'
  }

  if (!values.moveInDate) {
    errors.moveInDate = 'Move-in date is required.'
  }

  if (!values.status) {
    errors.status = 'Status is required.'
  }

  return errors
}

function TenantFormModal({
  tenant,
  open,
  rooms,
  submitting,
  onClose,
  onSubmit,
}: TenantFormModalProps) {
  const [values, setValues] = useState<TenantFormValues>(() =>
    getInitialValues(tenant),
  )
  const [errors, setErrors] = useState<TenantFormErrors>({})

  if (!open) {
    return null
  }

  const isEditing = Boolean(tenant)

  function updateValue<Field extends keyof TenantFormValues>(
    field: Field,
    value: TenantFormValues[Field],
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
    const nextErrors = validateTenant(values)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit({
      ...values,
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      identityNumber: values.identityNumber.trim(),
      address: values.address?.trim() || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
    })
  }

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-modal-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Tenant Management</p>
            <h2 id="tenant-modal-title">
              {isEditing ? 'Edit Tenant' : 'Create Tenant'}
            </h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close tenant form"
          >
            x
          </button>
        </div>

        <form className="room-form" onSubmit={handleSubmit}>
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
                  {room.roomNumber}
                </option>
              ))}
            </select>
            {errors.roomId ? (
              <small className="field-error">{errors.roomId}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Full name</span>
            <input
              value={values.fullName}
              disabled={submitting}
              aria-invalid={Boolean(errors.fullName)}
              onChange={(event) => updateValue('fullName', event.target.value)}
            />
            {errors.fullName ? (
              <small className="field-error">{errors.fullName}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Email</span>
            <input
              type="email"
              value={values.email}
              disabled={submitting}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => updateValue('email', event.target.value)}
            />
            {errors.email ? (
              <small className="field-error">{errors.email}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Phone</span>
            <input
              value={values.phone}
              disabled={submitting}
              aria-invalid={Boolean(errors.phone)}
              onChange={(event) => updateValue('phone', event.target.value)}
            />
            {errors.phone ? (
              <small className="field-error">{errors.phone}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Identity number</span>
            <input
              value={values.identityNumber}
              disabled={submitting}
              aria-invalid={Boolean(errors.identityNumber)}
              onChange={(event) =>
                updateValue('identityNumber', event.target.value)
              }
            />
            {errors.identityNumber ? (
              <small className="field-error">{errors.identityNumber}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Date of birth</span>
            <input
              type="date"
              value={values.dateOfBirth}
              disabled={submitting}
              onChange={(event) => updateValue('dateOfBirth', event.target.value)}
            />
          </label>

          <label className="room-form-field">
            <span>Move-in date</span>
            <input
              type="date"
              value={values.moveInDate}
              disabled={submitting}
              aria-invalid={Boolean(errors.moveInDate)}
              onChange={(event) => updateValue('moveInDate', event.target.value)}
            />
            {errors.moveInDate ? (
              <small className="field-error">{errors.moveInDate}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Status</span>
            <select
              value={values.status}
              disabled={submitting}
              aria-invalid={Boolean(errors.status)}
              onChange={(event) =>
                updateValue('status', event.target.value as TenantStatus)
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
            <span>Address</span>
            <textarea
              value={values.address}
              rows={3}
              disabled={submitting}
              onChange={(event) => updateValue('address', event.target.value)}
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
                  ? 'Update Tenant'
                  : 'Create Tenant'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default TenantFormModal
