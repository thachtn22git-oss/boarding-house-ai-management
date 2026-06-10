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
}

function FeedbackViewModal({
  feedback,
  tenant,
  room,
  onClose,
}: FeedbackViewModalProps) {
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
              <dt>Category</dt>
              <dd>{getCategoryLabel(feedback.category)}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{getPriorityLabel(feedback.priority)}</dd>
            </div>
            <div>
              <dt>Sentiment</dt>
              <dd>
                {feedback.sentiment
                  ? getSentimentLabel(feedback.sentiment)
                  : 'No sentiment'}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{getStatusLabel(feedback.status)}</dd>
            </div>
            <div>
              <dt>AI suggested category</dt>
              <dd>
                {feedback.aiSuggestedCategory
                  ? getCategoryLabel(feedback.aiSuggestedCategory)
                  : 'Not analyzed'}
              </dd>
            </div>
            <div>
              <dt>AI suggested priority</dt>
              <dd>
                {feedback.aiSuggestedPriority
                  ? getPriorityLabel(feedback.aiSuggestedPriority)
                  : 'Not analyzed'}
              </dd>
            </div>
            <div className="contract-summary-full">
              <dt>AI summary</dt>
              <dd>{feedback.aiSummary || 'Not analyzed'}</dd>
            </div>
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
