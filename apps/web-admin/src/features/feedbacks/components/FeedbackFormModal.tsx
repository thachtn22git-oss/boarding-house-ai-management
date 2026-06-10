import { useState, type FormEvent } from 'react'

import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type {
  Feedback,
  FeedbackCategory,
  FeedbackFormValues,
  FeedbackPriority,
  FeedbackStatus,
  SentimentLabel,
} from '../types'

type FeedbackFormModalProps = {
  feedback: Feedback | null
  open: boolean
  rooms: Room[]
  tenants: Tenant[]
  submitting: boolean
  onClose: () => void
  onSubmit: (values: FeedbackFormValues) => Promise<void>
}

type FeedbackFormErrors = Partial<Record<keyof FeedbackFormValues, string>>

const categoryOptions: Array<{ label: string; value: FeedbackCategory }> = [
  { label: 'Electricity', value: 'electricity' },
  { label: 'Water', value: 'water' },
  { label: 'Internet', value: 'internet' },
  { label: 'Security', value: 'security' },
  { label: 'Cleanliness', value: 'cleanliness' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Billing', value: 'billing' },
  { label: 'Other', value: 'other' },
]

const priorityOptions: Array<{ label: string; value: FeedbackPriority }> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

const statusOptions: Array<{ label: string; value: FeedbackStatus }> = [
  { label: 'New', value: 'new' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Rejected', value: 'rejected' },
]

const sentimentOptions: Array<{ label: string; value: SentimentLabel }> = [
  { label: 'Positive', value: 'positive' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Negative', value: 'negative' },
]

const defaultValues: FeedbackFormValues = {
  tenantId: '',
  roomId: '',
  title: '',
  content: '',
  category: 'other',
  priority: 'medium',
  status: 'new',
  sentiment: undefined,
  ownerResponse: '',
}

function getInitialValues(feedback: Feedback | null): FeedbackFormValues {
  if (!feedback) {
    return defaultValues
  }

  return {
    tenantId: feedback.tenantId ?? '',
    roomId: feedback.roomId ?? '',
    title: feedback.title,
    content: feedback.content,
    category: feedback.category,
    priority: feedback.priority,
    status: feedback.status,
    sentiment: feedback.sentiment,
    ownerResponse: feedback.ownerResponse ?? '',
  }
}

function validateFeedback(values: FeedbackFormValues) {
  const errors: FeedbackFormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (!values.content.trim()) {
    errors.content = 'Content is required.'
  }

  if (!values.category) {
    errors.category = 'Category is required.'
  }

  if (!values.priority) {
    errors.priority = 'Priority is required.'
  }

  if (!values.status) {
    errors.status = 'Status is required.'
  }

  return errors
}

function FeedbackFormModal({
  feedback,
  open,
  rooms,
  tenants,
  submitting,
  onClose,
  onSubmit,
}: FeedbackFormModalProps) {
  const [values, setValues] = useState<FeedbackFormValues>(() =>
    getInitialValues(feedback),
  )
  const [errors, setErrors] = useState<FeedbackFormErrors>({})

  if (!open) {
    return null
  }

  const isEditing = Boolean(feedback)

  function updateValue<Field extends keyof FeedbackFormValues>(
    field: Field,
    value: FeedbackFormValues[Field],
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
      roomId: values.roomId || undefined,
      title: values.title.trim(),
      content: values.content.trim(),
      sentiment: values.sentiment || undefined,
      ownerResponse: values.ownerResponse?.trim() || undefined,
    }
    const nextErrors = validateFeedback(nextValues)

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit(nextValues)
  }

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Feedback Management</p>
            <h2 id="feedback-modal-title">
              {isEditing ? 'Edit Feedback' : 'Create Feedback'}
            </h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close feedback form"
          >
            x
          </button>
        </div>

        <form className="room-form feedback-form" onSubmit={handleSubmit}>
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
            <span>Room</span>
            <select
              value={values.roomId}
              disabled={submitting}
              onChange={(event) => updateValue('roomId', event.target.value)}
            >
              <option value="">No room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - {room.roomType}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field room-form-field--full">
            <span>Title</span>
            <input
              value={values.title}
              disabled={submitting}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) => updateValue('title', event.target.value)}
            />
            {errors.title ? (
              <small className="field-error">{errors.title}</small>
            ) : null}
          </label>

          <label className="room-form-field room-form-field--full">
            <span>Content</span>
            <textarea
              value={values.content}
              rows={4}
              disabled={submitting}
              aria-invalid={Boolean(errors.content)}
              onChange={(event) => updateValue('content', event.target.value)}
            />
            {errors.content ? (
              <small className="field-error">{errors.content}</small>
            ) : null}
          </label>

          <label className="room-form-field">
            <span>Category</span>
            <select
              value={values.category}
              disabled={submitting}
              aria-invalid={Boolean(errors.category)}
              onChange={(event) =>
                updateValue('category', event.target.value as FeedbackCategory)
              }
            >
              {categoryOptions.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Priority</span>
            <select
              value={values.priority}
              disabled={submitting}
              aria-invalid={Boolean(errors.priority)}
              onChange={(event) =>
                updateValue('priority', event.target.value as FeedbackPriority)
              }
            >
              {priorityOptions.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Status</span>
            <select
              value={values.status}
              disabled={submitting}
              aria-invalid={Boolean(errors.status)}
              onChange={(event) =>
                updateValue('status', event.target.value as FeedbackStatus)
              }
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field">
            <span>Sentiment</span>
            <select
              value={values.sentiment ?? ''}
              disabled={submitting}
              onChange={(event) =>
                updateValue(
                  'sentiment',
                  (event.target.value || undefined) as SentimentLabel | undefined,
                )
              }
            >
              <option value="">No sentiment</option>
              {sentimentOptions.map((sentiment) => (
                <option key={sentiment.value} value={sentiment.value}>
                  {sentiment.label}
                </option>
              ))}
            </select>
          </label>

          <label className="room-form-field room-form-field--full">
            <span>Owner response</span>
            <textarea
              value={values.ownerResponse}
              rows={3}
              disabled={submitting}
              onChange={(event) =>
                updateValue('ownerResponse', event.target.value)
              }
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
                  ? 'Update Feedback'
                  : 'Create Feedback'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default FeedbackFormModal
