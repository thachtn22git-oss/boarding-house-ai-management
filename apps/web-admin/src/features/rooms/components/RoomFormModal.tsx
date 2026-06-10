import { useState, type FormEvent } from 'react'

import type { Room, RoomFormValues, RoomStatus } from '../types'

type RoomFormModalProps = {
  room: Room | null
  open: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (values: RoomFormValues) => Promise<void>
}

type RoomFormErrors = Partial<Record<keyof RoomFormValues, string>>

const roomTypeOptions = ['Standard', 'Studio', 'Shared', 'Premium']

const statusOptions: Array<{ label: string; value: RoomStatus }> = [
  { label: 'Available', value: 'available' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Maintenance', value: 'maintenance' },
]

const defaultValues: RoomFormValues = {
  roomNumber: '',
  floor: 0,
  roomType: 'Standard',
  area: 0,
  price: 0,
  deposit: 0,
  maxTenants: 1,
  status: 'available',
  description: '',
}

function getInitialValues(room: Room | null): RoomFormValues {
  if (!room) {
    return defaultValues
  }

  return {
    roomNumber: room.roomNumber,
    floor: room.floor,
    roomType: room.roomType,
    area: room.area,
    price: room.price,
    deposit: room.deposit,
    maxTenants: room.maxTenants,
    status: room.status,
    description: room.description ?? '',
  }
}

function validateRoom(values: RoomFormValues) {
  const errors: RoomFormErrors = {}

  if (!values.roomNumber.trim()) {
    errors.roomNumber = 'Room number is required.'
  }

  if (Number.isNaN(values.floor) || values.floor < 0) {
    errors.floor = 'Floor must be 0 or greater.'
  }

  if (Number.isNaN(values.area) || values.area <= 0) {
    errors.area = 'Area must be greater than 0.'
  }

  if (Number.isNaN(values.price) || values.price <= 0) {
    errors.price = 'Monthly price must be greater than 0.'
  }

  if (Number.isNaN(values.deposit) || values.deposit < 0) {
    errors.deposit = 'Deposit must be 0 or greater.'
  }

  if (Number.isNaN(values.maxTenants) || values.maxTenants <= 0) {
    errors.maxTenants = 'Max tenants must be greater than 0.'
  }

  if (!values.status) {
    errors.status = 'Status is required.'
  }

  return errors
}

function RoomFormModal({
  room,
  open,
  submitting,
  onClose,
  onSubmit,
}: RoomFormModalProps) {
  const [values, setValues] = useState<RoomFormValues>(() =>
    getInitialValues(room),
  )
  const [errors, setErrors] = useState<RoomFormErrors>({})

  if (!open) {
    return null
  }

  const isEditing = Boolean(room)

  function updateValue<Field extends keyof RoomFormValues>(
    field: Field,
    value: RoomFormValues[Field],
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
    const nextErrors = validateRoom(values)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit({
      ...values,
      roomNumber: values.roomNumber.trim(),
      description: values.description?.trim() || undefined,
    })
  }

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-modal-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Room Management</p>
            <h2 id="room-modal-title">
              {isEditing ? 'Edit Room' : 'Create Room'}
            </h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close room form"
          >
            x
          </button>
        </div>

        <form className="room-form" onSubmit={handleSubmit}>
          <label className="room-form-field">
            <span>Room number</span>
            <input
              value={values.roomNumber}
              disabled={submitting}
              aria-invalid={Boolean(errors.roomNumber)}
              onChange={(event) => updateValue('roomNumber', event.target.value)}
            />
            {errors.roomNumber ? (
              <small className="field-error">{errors.roomNumber}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Floor</span>
            <input
              type="number"
              min="0"
              value={values.floor}
              disabled={submitting}
              aria-invalid={Boolean(errors.floor)}
              onChange={(event) => updateValue('floor', event.target.valueAsNumber)}
            />
            {errors.floor ? <small className="field-error">{errors.floor}</small> : null}
          </label>

          <label className="room-form-field">
            <span>Room type</span>
            <select
              value={values.roomType}
              disabled={submitting}
              onChange={(event) => updateValue('roomType', event.target.value)}
            >
              {roomTypeOptions.map((roomType) => (
                <option key={roomType} value={roomType}>
                  {roomType}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Area</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={values.area}
              disabled={submitting}
              aria-invalid={Boolean(errors.area)}
              onChange={(event) => updateValue('area', event.target.valueAsNumber)}
            />
            {errors.area ? <small className="field-error">{errors.area}</small> : null}
          </label>

          <label className="room-form-field">
            <span>Monthly price</span>
            <input
              type="number"
              min="0"
              value={values.price}
              disabled={submitting}
              aria-invalid={Boolean(errors.price)}
              onChange={(event) => updateValue('price', event.target.valueAsNumber)}
            />
            {errors.price ? <small className="field-error">{errors.price}</small> : null}
          </label>

          <label className="room-form-field">
            <span>Deposit</span>
            <input
              type="number"
              min="0"
              value={values.deposit}
              disabled={submitting}
              aria-invalid={Boolean(errors.deposit)}
              onChange={(event) => updateValue('deposit', event.target.valueAsNumber)}
            />
            {errors.deposit ? (
              <small className="field-error">{errors.deposit}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Max tenants</span>
            <input
              type="number"
              min="1"
              value={values.maxTenants}
              disabled={submitting}
              aria-invalid={Boolean(errors.maxTenants)}
              onChange={(event) =>
                updateValue('maxTenants', event.target.valueAsNumber)
              }
            />
            {errors.maxTenants ? (
              <small className="field-error">{errors.maxTenants}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Status</span>
            <select
              value={values.status}
              disabled={submitting}
              aria-invalid={Boolean(errors.status)}
              onChange={(event) =>
                updateValue('status', event.target.value as RoomStatus)
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
            <span>Description</span>
            <textarea
              value={values.description}
              rows={3}
              disabled={submitting}
              onChange={(event) => updateValue('description', event.target.value)}
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
                  ? 'Update Room'
                  : 'Create Room'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default RoomFormModal
