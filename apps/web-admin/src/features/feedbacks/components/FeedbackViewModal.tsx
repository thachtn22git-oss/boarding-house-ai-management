import type { Room } from '../../rooms/types'
import type { Tenant } from '../../tenants/types'
import type { Feedback } from '../types'
import {
  getCategoryLabel,
  getPriorityLabel,
  getSentimentLabel,
  getStatusLabel,
} from '../feedback.labels'

type FeedbackViewModalProps = {
  feedback: Feedback
  tenant?: Tenant
  room?: Room
  onClose: () => void
  onReanalyze?: () => void
  reanalyzing?: boolean
}

function formatConfidence(value: number | undefined) {
  if (typeof value !== 'number') {
    return 'Not available'
  }

  return `${Math.round(value * 100)}%`
}

function ConfidenceRow({
  label,
  value,
}: {
  label: string
  value: number | undefined
}) {
  const percent = typeof value === 'number' ? Math.round(value * 100) : 0

  return (
    <div className="feedback-confidence-row">
      <span>{label}</span>
      <div className="feedback-confidence-track" aria-hidden="true">
        <div
          className="feedback-confidence-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <strong>{formatConfidence(value)}</strong>
    </div>
  )
}

function FeedbackViewModal({
  feedback,
  tenant,
  room,
  onClose,
  onReanalyze,
  reanalyzing = false,
}: FeedbackViewModalProps) {
  const categoryLabel = feedback.aiSuggestedCategory
    ? getCategoryLabel(feedback.aiSuggestedCategory)
    : feedback.category && feedback.category !== 'other'
      ? getCategoryLabel(feedback.category)
      : 'Pending AI'
  const sentimentLabel = feedback.sentiment
    ? getSentimentLabel(feedback.sentiment)
    : 'Pending AI'
  const priorityValue = feedback.priority ?? feedback.aiSuggestedPriority
  const priorityLabel = priorityValue ? getPriorityLabel(priorityValue) : 'Pending AI'

  return (
    <div className="room-modal-backdrop" role="presentation">
      <section
        className="room-modal feedback-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-view-title"
      >
        <div className="room-modal-header">
          <div>
            <p className="page-eyebrow">Feedback Summary</p>
            <h2 id="feedback-view-title">{feedback.title}</h2>
          </div>
          <button
            className="room-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close feedback summary"
          >
            x
          </button>
        </div>

        <div className="contract-summary feedback-summary">
          <dl>
            <div className="contract-summary-full">
              <dt>Content</dt>
              <dd>{feedback.content}</dd>
            </div>
            <div>
              <dt>Tenant details</dt>
              <dd>
                {tenant
                  ? `${tenant.fullName} - ${tenant.email}`
                  : 'No tenant linked'}
              </dd>
            </div>
            <div>
              <dt>Room details</dt>
              <dd>{room ? `${room.roomNumber} - ${room.roomType}` : 'No room linked'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{getStatusLabel(feedback.status)}</dd>
            </div>
            <div className="contract-summary-full feedback-ai-section-title">
              <dt>AI Analysis</dt>
              <dd>
                {feedback.aiGenerated
                  ? 'AI-generated classification details for this feedback.'
                  : 'AI analysis is pending or unavailable for this feedback.'}
              </dd>
            </div>
            <div>
              <dt>Sentiment</dt>
              <dd>{sentimentLabel}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{categoryLabel}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{priorityLabel}</dd>
            </div>
            <div>
              <dt>AI Generated</dt>
              <dd>{feedback.aiGenerated ? 'Yes' : 'No'}</dd>
            </div>
            <div className="contract-summary-full">
              <dt>Summary</dt>
              <dd>{feedback.aiSummary || 'AI summary will be generated after analysis.'}</dd>
            </div>
            <div className="contract-summary-full">
              <dt>Confidence</dt>
              <dd className="feedback-confidence-list">
                <ConfidenceRow
                  label="Category"
                  value={feedback.aiConfidence?.category}
                />
                <ConfidenceRow
                  label="Sentiment"
                  value={feedback.aiConfidence?.sentiment}
                />
                <ConfidenceRow
                  label="Priority"
                  value={feedback.aiConfidence?.priority}
                />
              </dd>
            </div>
            {feedback.aiError ? (
              <div className="contract-summary-full">
                <dt>AI Error</dt>
                <dd className="feedback-ai-error">{feedback.aiError}</dd>
              </div>
            ) : null}
            <div className="contract-summary-full">
              <dt>Owner response</dt>
              <dd>{feedback.ownerResponse || 'No response yet.'}</dd>
            </div>
          </dl>
        </div>

        <div className="room-form-actions contract-view-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          {onReanalyze ? (
            <button
              className="secondary-button"
              type="button"
              disabled={reanalyzing}
              onClick={onReanalyze}
            >
              {reanalyzing ? 'Analyzing...' : 'Re-analyze with AI'}
            </button>
          ) : null}
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

export default FeedbackViewModal
