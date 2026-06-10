import { useState, type FormEvent } from 'react'

import { formatDate } from '../../../utils/format'
import type {
  Feedback,
  FeedbackCategory,
  FeedbackPriority,
  SentimentLabel,
} from '../../feedbacks/types'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

const categoryOptions: FeedbackCategory[] = [
  'electricity',
  'water',
  'internet',
  'security',
  'cleanliness',
  'maintenance',
  'billing',
  'other',
]

const priorityOptions: FeedbackPriority[] = ['low', 'medium', 'high', 'urgent']
const sentimentOptions: SentimentLabel[] = ['positive', 'neutral', 'negative']

type FeedbackFormState = {
  title: string
  content: string
  category: FeedbackCategory
  priority: FeedbackPriority
  sentiment: SentimentLabel
}

const initialFeedbackForm: FeedbackFormState = {
  title: '',
  content: '',
  category: 'maintenance',
  priority: 'medium',
  sentiment: 'neutral',
}

function TenantFeedbackViewModal({
  feedback,
  onClose,
}: {
  feedback: Feedback
  onClose: () => void
}) {
  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal tenant-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-feedback-view-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Feedback Details</p>
            <h2 id="tenant-feedback-view-title">{feedback.title}</h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close feedback details"
          >
            x
          </button>
        </div>

        <div className="tenant-summary-card">
          <dl className="tenant-detail-list">
            <div className="tenant-detail-long">
              <dt>Content</dt>
              <dd>{feedback.content}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{formatLabel(feedback.category)}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{formatLabel(feedback.priority)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatLabel(feedback.status)}</dd>
            </div>
            <div>
              <dt>Sentiment</dt>
              <dd>{feedback.sentiment ? formatLabel(feedback.sentiment) : '-'}</dd>
            </div>
            <div>
              <dt>Created Date</dt>
              <dd>{formatDate(feedback.createdAt)}</dd>
            </div>
            <div className="tenant-detail-long">
              <dt>AI Summary</dt>
              <dd>{feedback.aiSummary || 'No AI summary yet.'}</dd>
            </div>
            <div>
              <dt>AI Suggested Category</dt>
              <dd>
                {feedback.aiSuggestedCategory
                  ? formatLabel(feedback.aiSuggestedCategory)
                  : '-'}
              </dd>
            </div>
            <div>
              <dt>AI Suggested Priority</dt>
              <dd>
                {feedback.aiSuggestedPriority
                  ? formatLabel(feedback.aiSuggestedPriority)
                  : '-'}
              </dd>
            </div>
            <div className="tenant-detail-long">
              <dt>Owner Response</dt>
              <dd>{feedback.ownerResponse || 'No owner response yet.'}</dd>
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

function MyFeedbackPage() {
  const { data, isLoading, error, reload, submitFeedback } = useTenantPortalData()
  const [form, setForm] = useState<FeedbackFormState>(initialFeedbackForm)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const feedbacks = data?.feedbacks ?? []

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.title.trim()) {
      setFormError('Title is required.')
      return
    }

    if (!form.content.trim()) {
      setFormError('Content is required.')
      return
    }

    if (!form.sentiment) {
      setFormError('Sentiment is required.')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      await submitFeedback({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        priority: form.priority,
        sentiment: form.sentiment,
      })
      setForm(initialFeedbackForm)
    } catch {
      setFormError('Unable to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Loading feedback"
          message="Fetching your feedback history."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tenant-portal-page">
        <TenantPortalStateView
          title="Feedback unavailable"
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
      <section className="dashboard-card tenant-form-card">
        <h2>Create Feedback</h2>
        {formError ? <div className="room-error">{formError}</div> : null}
        <form className="tenant-feedback-form" onSubmit={handleSubmit}>
          <label className="room-form-field">
            <span>Title</span>
            <input
              value={form.title}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Enter feedback title"
            />
          </label>
          <label className="room-form-field">
            <span>Category</span>
            <select
              value={form.category}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as FeedbackCategory,
                }))
              }
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {formatLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="room-form-field">
            <span>Priority</span>
            <select
              value={form.priority}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as FeedbackPriority,
                }))
              }
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {formatLabel(priority)}
                </option>
              ))}
            </select>
          </label>
          <label className="room-form-field">
            <span>Sentiment</span>
            <select
              value={form.sentiment}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sentiment: event.target.value as SentimentLabel,
                }))
              }
            >
              {sentimentOptions.map((sentiment) => (
                <option key={sentiment} value={sentiment}>
                  {formatLabel(sentiment)}
                </option>
              ))}
            </select>
          </label>
          <label className="room-form-field room-form-field--full">
            <span>Content</span>
            <textarea
              value={form.content}
              rows={5}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((current) => ({ ...current, content: event.target.value }))
              }
              placeholder="Describe your feedback"
            />
          </label>
          <div className="room-form-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Create Feedback'}
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-card room-table-card">
        {feedbacks.length === 0 ? (
          <div className="room-empty-state">
            <h2>No feedback found.</h2>
            <p>Your submitted feedback will appear here.</p>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Sentiment</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((feedback) => (
                  <tr key={feedback.id}>
                    <td>{feedback.title}</td>
                    <td>
                      <span
                        className={`tenant-category-badge tenant-category-badge--${feedback.category}`}
                      >
                        {formatLabel(feedback.category)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`tenant-priority-badge tenant-priority-badge--${feedback.priority}`}
                      >
                        {formatLabel(feedback.priority)}
                      </span>
                    </td>
                    <td>
                      {feedback.sentiment ? (
                        <span
                          className={`tenant-sentiment-badge tenant-sentiment-badge--${feedback.sentiment}`}
                        >
                          {formatLabel(feedback.sentiment)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span
                        className={`tenant-status-badge tenant-status-badge--${feedback.status}`}
                      >
                        {formatLabel(feedback.status)}
                      </span>
                    </td>
                    <td>{formatDate(feedback.createdAt)}</td>
                    <td>
                      <button
                        className="table-action-button"
                        type="button"
                        onClick={() => setSelectedFeedback(feedback)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedFeedback ? (
        <TenantFeedbackViewModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
        />
      ) : null}
    </div>
  )
}

export default MyFeedbackPage
