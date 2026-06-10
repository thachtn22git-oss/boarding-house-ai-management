import { useState, type FormEvent } from 'react'

import { formatDate } from '../../../utils/format'
import type { Feedback } from '../../feedbacks/types'
import TenantPortalStateView from './TenantPortalStateView'
import { formatLabel } from './tenantPortalFormatting'
import { useTenantPortalData } from './useTenantPortalData'
import './TenantPortal.css'

type FeedbackFormState = {
  title: string
  content: string
}

const initialFeedbackForm: FeedbackFormState = {
  title: '',
  content: '',
}

function formatAiValue(value: string | null | undefined) {
  return value ? formatLabel(value) : 'Pending AI'
}

function getAiCategoryLabel(feedback: Feedback) {
  if (feedback.aiSuggestedCategory) {
    return formatLabel(feedback.aiSuggestedCategory)
  }

  if (feedback.category && feedback.category !== 'other') {
    return formatLabel(feedback.category)
  }

  return 'Pending AI'
}

function getAiPriorityLabel(feedback: Feedback) {
  return formatAiValue(feedback.priority ?? feedback.aiSuggestedPriority)
}

function formatConfidence(value: number | undefined) {
  if (typeof value !== 'number') {
    return 'Not available'
  }

  return `${Math.round(value * 100)}%`
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
              <dt>Status</dt>
              <dd>{formatLabel(feedback.status)}</dd>
            </div>
            <div className="tenant-detail-long">
              <dt>AI Analysis</dt>
              <dd>AI-generated classification details for this feedback.</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{getAiCategoryLabel(feedback)}</dd>
            </div>
            <div>
              <dt>Sentiment</dt>
              <dd>{formatAiValue(feedback.sentiment)}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{getAiPriorityLabel(feedback)}</dd>
            </div>
            <div className="tenant-detail-long">
              <dt>Summary</dt>
              <dd>{feedback.aiSummary || 'AI summary will be generated after analysis.'}</dd>
            </div>
            <div>
              <dt>Category Confidence</dt>
              <dd>{formatConfidence(feedback.aiConfidence?.category)}</dd>
            </div>
            <div>
              <dt>Sentiment Confidence</dt>
              <dd>{formatConfidence(feedback.aiConfidence?.sentiment)}</dd>
            </div>
            <div>
              <dt>Priority Confidence</dt>
              <dd>{formatConfidence(feedback.aiConfidence?.priority)}</dd>
            </div>
            <div>
              <dt>AI Generated</dt>
              <dd>{feedback.aiGenerated ? 'Yes' : 'No'}</dd>
            </div>
            {feedback.aiError ? (
              <div className="tenant-detail-long">
                <dt>AI Error</dt>
                <dd>{feedback.aiError}</dd>
              </div>
            ) : null}
            <div>
              <dt>Created Date</dt>
              <dd>{formatDate(feedback.createdAt)}</dd>
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
  const [formNotice, setFormNotice] = useState('')
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

    setIsSubmitting(true)
    setFormError('')
    setFormNotice('')

    try {
      const result = await submitFeedback({
        title: form.title.trim(),
        content: form.content.trim(),
      })
      setForm(initialFeedbackForm)
      setFormNotice(
        result.aiUnavailable
          ? 'Feedback submitted, but AI analysis is currently unavailable.'
          : 'Feedback submitted and analyzed by AI.',
      )
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
        <h2>Submit Feedback</h2>
        <p className="tenant-form-helper">
          Describe your issue and AI will classify it automatically.
        </p>
        {formError ? <div className="room-error">{formError}</div> : null}
        {formNotice ? <div className="room-success">{formNotice}</div> : null}
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
          <label className="room-form-field room-form-field--full">
            <span>Description</span>
            <textarea
              value={form.content}
              rows={5}
              disabled={isSubmitting}
              onChange={(event) =>
                setForm((current) => ({ ...current, content: event.target.value }))
              }
              placeholder="Describe your issue"
            />
          </label>
          <div className="room-form-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Analyzing...' : 'Submit Feedback'}
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
                  <th>AI Priority</th>
                  <th>AI Sentiment</th>
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
                      {feedback.aiSuggestedCategory ? (
                        <span
                          className={`tenant-category-badge tenant-category-badge--${feedback.aiSuggestedCategory}`}
                        >
                          {formatLabel(feedback.aiSuggestedCategory)}
                        </span>
                      ) : feedback.category && feedback.category !== 'other' ? (
                        <span
                          className={`tenant-category-badge tenant-category-badge--${feedback.category}`}
                        >
                          {formatLabel(feedback.category)}
                        </span>
                      ) : (
                        <span className="tenant-ai-pending-badge">Pending AI</span>
                      )}
                    </td>
                    <td>
                      {feedback.priority || feedback.aiSuggestedPriority ? (
                        <span
                          className={`tenant-priority-badge tenant-priority-badge--${feedback.priority ?? feedback.aiSuggestedPriority}`}
                        >
                          {getAiPriorityLabel(feedback)}
                        </span>
                      ) : (
                        <span className="tenant-ai-pending-badge">Pending AI</span>
                      )}
                    </td>
                    <td>
                      {feedback.sentiment ? (
                        <span
                          className={`tenant-sentiment-badge tenant-sentiment-badge--${feedback.sentiment}`}
                        >
                          {formatLabel(feedback.sentiment)}
                        </span>
                      ) : (
                        <span className="tenant-ai-pending-badge">Pending AI</span>
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
