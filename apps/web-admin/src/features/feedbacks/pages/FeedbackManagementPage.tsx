import { useCallback, useEffect, useMemo, useState } from 'react'

import { StatCard } from '../../../components/dashboard'
import { useAuth } from '../../auth/useAuth'
import { getRoomsByOwner } from '../../rooms/services/room.service'
import type { Room } from '../../rooms/types'
import { getTenantsByOwner } from '../../tenants/services/tenant.service'
import type { Tenant } from '../../tenants/types'
import FeedbackFormModal from '../components/FeedbackFormModal'
import FeedbackViewModal from '../components/FeedbackViewModal'
import {
  createFeedback,
  deleteFeedback,
  getFeedbacksByOwner,
  markFeedbackAsInReview,
  rejectFeedback,
  resolveFeedback,
  updateFeedback,
} from '../services/feedback.service'
import type {
  Feedback,
  FeedbackCategory,
  FeedbackFormValues,
  FeedbackPriority,
  FeedbackStatus,
  SentimentLabel,
} from '../types'
import {
  getCategoryLabel,
  getPriorityLabel,
  getSentimentLabel,
  getStatusLabel,
} from '../feedback.labels'
import '../../rooms/pages/RoomManagementPage.css'
import '../../tenants/pages/TenantManagementPage.css'
import '../../contracts/pages/ContractManagementPage.css'
import '../../invoices/pages/InvoiceManagementPage.css'
import '../../utilities/pages/UtilitiesManagementPage.css'
import './FeedbackManagementPage.css'

type CategoryFilter = 'all' | FeedbackCategory
type StatusFilter = 'all' | FeedbackStatus
type PriorityFilter = 'all' | FeedbackPriority
type SentimentFilter = 'all' | SentimentLabel

function getAiPriorityLabel(feedback: Feedback) {
  const priority = feedback.priority ?? feedback.aiSuggestedPriority

  return priority ? getPriorityLabel(priority) : 'Pending AI'
}

function FeedbackManagementPage() {
  const { currentUser } = useAuth()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null)
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>('all')

  const ownerFeedbacks = useMemo(
    () => feedbacks.filter((feedback) => feedback.ownerId === currentUser?.uid),
    [feedbacks, currentUser?.uid],
  )
  const ownerRooms = useMemo(
    () => rooms.filter((room) => room.ownerId === currentUser?.uid),
    [rooms, currentUser?.uid],
  )
  const ownerTenants = useMemo(
    () => tenants.filter((tenant) => tenant.ownerId === currentUser?.uid),
    [tenants, currentUser?.uid],
  )

  const filteredFeedbacks = useMemo(() => {
    return ownerFeedbacks.filter((feedback) => {
      const effectiveCategory = feedback.aiSuggestedCategory ?? feedback.category
      const effectivePriority = feedback.priority ?? feedback.aiSuggestedPriority
      const matchesCategory =
        categoryFilter === 'all' || effectiveCategory === categoryFilter
      const matchesStatus =
        statusFilter === 'all' || feedback.status === statusFilter
      const matchesPriority =
        priorityFilter === 'all' || effectivePriority === priorityFilter
      const matchesSentiment =
        sentimentFilter === 'all' || feedback.sentiment === sentimentFilter

      return (
        matchesCategory && matchesStatus && matchesPriority && matchesSentiment
      )
    })
  }, [categoryFilter, ownerFeedbacks, priorityFilter, sentimentFilter, statusFilter])

  const tenantById = useMemo(
    () => new Map(ownerTenants.map((tenant) => [tenant.id, tenant])),
    [ownerTenants],
  )
  const roomById = useMemo(
    () => new Map(ownerRooms.map((room) => [room.id, room])),
    [ownerRooms],
  )

  const stats = useMemo(
    () => ({
      total: ownerFeedbacks.length,
      new: ownerFeedbacks.filter((feedback) => feedback.status === 'new').length,
      inReview: ownerFeedbacks.filter(
        (feedback) => feedback.status === 'in_review',
      ).length,
      resolved: ownerFeedbacks.filter(
        (feedback) => feedback.status === 'resolved',
      ).length,
      negative: ownerFeedbacks.filter(
        (feedback) => feedback.sentiment === 'negative',
      ).length,
      urgent: ownerFeedbacks.filter((feedback) => feedback.priority === 'urgent')
        .length,
    }),
    [ownerFeedbacks],
  )

  const loadFeedbackData = useCallback(async () => {
    if (!currentUser) {
      setError('You must be signed in to manage feedback.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [nextFeedbacks, nextRooms, nextTenants] = await Promise.all([
        getFeedbacksByOwner(currentUser.uid),
        getRoomsByOwner(currentUser.uid),
        getTenantsByOwner(currentUser.uid),
      ])

      setFeedbacks(
        nextFeedbacks.filter((feedback) => feedback.ownerId === currentUser.uid),
      )
      setRooms(nextRooms.filter((room) => room.ownerId === currentUser.uid))
      setTenants(
        nextTenants.filter((tenant) => tenant.ownerId === currentUser.uid),
      )
    } catch {
      setError('Unable to load feedback. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void Promise.resolve().then(loadFeedbackData)
  }, [loadFeedbackData])

  function openCreateModal() {
    setEditingFeedback(null)
    setModalOpen(true)
  }

  function openEditModal(feedback: Feedback) {
    setEditingFeedback(feedback)
    setModalOpen(true)
  }

  async function handleSubmit(values: FeedbackFormValues) {
    if (!currentUser) {
      setError('You must be signed in to manage feedback.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingFeedback) {
        if (editingFeedback.ownerId !== currentUser.uid) {
          throw new Error('You can only update your own feedback.')
        }

        await updateFeedback(editingFeedback.id, values)
      } else {
        await createFeedback(currentUser.uid, values)
      }

      setModalOpen(false)
      setEditingFeedback(null)
      await loadFeedbackData()
    } catch {
      setError('Unable to save this feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInReview(feedback: Feedback) {
    if (!currentUser || feedback.ownerId !== currentUser.uid) {
      setError('You can only update your own feedback.')
      return
    }

    try {
      await markFeedbackAsInReview(feedback.id)
      await loadFeedbackData()
    } catch {
      setError('Unable to update this feedback. Please try again.')
    }
  }

  async function handleResolve(feedback: Feedback) {
    if (!currentUser || feedback.ownerId !== currentUser.uid) {
      setError('You can only update your own feedback.')
      return
    }

    const response = window.prompt('Optional response for this feedback:')

    try {
      await resolveFeedback(feedback.id, response?.trim() || undefined)
      await loadFeedbackData()
    } catch {
      setError('Unable to resolve this feedback. Please try again.')
    }
  }

  async function handleReject(feedback: Feedback) {
    if (!currentUser || feedback.ownerId !== currentUser.uid) {
      setError('You can only update your own feedback.')
      return
    }

    const response = window.prompt('Optional response for this feedback:')

    try {
      await rejectFeedback(feedback.id, response?.trim() || undefined)
      await loadFeedbackData()
    } catch {
      setError('Unable to reject this feedback. Please try again.')
    }
  }

  async function handleDelete(feedback: Feedback) {
    if (!currentUser) {
      setError('You must be signed in to manage feedback.')
      return
    }

    if (feedback.ownerId !== currentUser.uid) {
      setError('You can only delete your own feedback.')
      return
    }

    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return
    }

    try {
      await deleteFeedback(feedback.id)
      await loadFeedbackData()
    } catch {
      setError('Unable to delete this feedback. Please try again.')
    }
  }

  const selectedTenant = viewingFeedback?.tenantId
    ? tenantById.get(viewingFeedback.tenantId)
    : undefined
  const selectedRoom = viewingFeedback?.roomId
    ? roomById.get(viewingFeedback.roomId)
    : undefined

  return (
    <div className="room-management-page">
      <div className="room-page-actions utilities-actions">
        <button
          className="secondary-button"
          type="button"
          disabled
          title="AI analysis coming soon"
        >
          AI analysis coming soon
        </button>
        <button className="primary-button" type="button" onClick={openCreateModal}>
          Add Feedback
        </button>
      </div>

      <div className="feedback-ai-panel">
        AI analysis will classify sentiment, detect issue category, and suggest
        priority in a later phase.
      </div>

      <div className="stats-grid utilities-stats-grid">
        <StatCard label="Total Feedback" value={String(stats.total)} tone="primary" />
        <StatCard label="New" value={String(stats.new)} tone="primary" />
        <StatCard
          label="In Review"
          value={String(stats.inReview)}
          tone="warning"
        />
        <StatCard label="Resolved" value={String(stats.resolved)} tone="success" />
        <StatCard
          label="Negative Sentiment"
          value={String(stats.negative)}
          tone="danger"
        />
        <StatCard
          label="Urgent Priority"
          value={String(stats.urgent)}
          tone="danger"
        />
      </div>

      <section className="dashboard-card feedback-filter-card">
        <label>
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as CategoryFilter)
            }
          >
            <option value="all">All</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water</option>
            <option value="internet">Internet</option>
            <option value="security">Security</option>
            <option value="cleanliness">Cleanliness</option>
            <option value="maintenance">Maintenance</option>
            <option value="billing">Billing</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value as PriorityFilter)
            }
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label>
          <span>Sentiment</span>
          <select
            value={sentimentFilter}
            onChange={(event) =>
              setSentimentFilter(event.target.value as SentimentFilter)
            }
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </label>
      </section>

      {error ? <div className="room-error">{error}</div> : null}

      <section className="dashboard-card room-table-card">
        {loading ? (
          <div className="room-loading">Loading feedback...</div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="room-empty-state">
            <h2>No feedback found.</h2>
            <p>Create your first feedback to track tenant issues and sentiment.</p>
            <button className="primary-button" type="button" onClick={openCreateModal}>
              Add your first feedback
            </button>
          </div>
        ) : (
          <div className="room-table-wrap">
            <table className="room-table feedback-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Tenant</th>
                  <th>Room</th>
                  <th>Category</th>
                  <th>AI Priority</th>
                  <th>AI Sentiment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((feedback) => {
                  const tenant = feedback.tenantId
                    ? tenantById.get(feedback.tenantId)
                    : undefined
                  const room = feedback.roomId
                    ? roomById.get(feedback.roomId)
                    : undefined

                  return (
                    <tr key={feedback.id}>
                      <td>{feedback.title}</td>
                      <td>{tenant?.fullName ?? '-'}</td>
                      <td>{room ? `${room.roomNumber} - ${room.roomType}` : '-'}</td>
                      <td>
                        {feedback.aiSuggestedCategory ? (
                          <span
                            className={`status-badge feedback-category-badge--${feedback.aiSuggestedCategory}`}
                          >
                            {getCategoryLabel(feedback.aiSuggestedCategory)}
                          </span>
                        ) : feedback.category && feedback.category !== 'other' ? (
                          <span
                            className={`status-badge feedback-category-badge--${feedback.category}`}
                          >
                            {getCategoryLabel(feedback.category)}
                          </span>
                        ) : (
                          <span className="status-badge feedback-ai-pending-badge">
                            Pending AI
                          </span>
                        )}
                      </td>
                      <td>
                        {feedback.priority || feedback.aiSuggestedPriority ? (
                          <span
                            className={`status-badge feedback-priority-badge--${feedback.priority ?? feedback.aiSuggestedPriority}`}
                          >
                            {getAiPriorityLabel(feedback)}
                          </span>
                        ) : (
                          <span className="status-badge feedback-ai-pending-badge">
                            Pending AI
                          </span>
                        )}
                      </td>
                      <td>
                        {feedback.sentiment ? (
                          <span
                            className={`status-badge feedback-sentiment-badge--${feedback.sentiment}`}
                          >
                            {getSentimentLabel(feedback.sentiment)}
                          </span>
                        ) : (
                          <span className="status-badge feedback-ai-pending-badge">
                            Pending AI
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge feedback-status-badge--${feedback.status}`}
                        >
                          {getStatusLabel(feedback.status)}
                        </span>
                      </td>
                      <td>
                        <div className="room-table-actions">
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => setViewingFeedback(feedback)}
                          >
                            View
                          </button>
                          <button
                            className="table-action-button"
                            type="button"
                            onClick={() => openEditModal(feedback)}
                          >
                            Edit
                          </button>
                          {feedback.status === 'new' ? (
                            <button
                              className="table-action-button"
                              type="button"
                              onClick={() => void handleInReview(feedback)}
                            >
                              In Review
                            </button>
                          ) : null}
                          {feedback.status === 'new' ||
                          feedback.status === 'in_review' ? (
                            <>
                              <button
                                className="table-action-button"
                                type="button"
                                onClick={() => void handleResolve(feedback)}
                              >
                                Resolve
                              </button>
                              <button
                                className="table-action-button"
                                type="button"
                                onClick={() => void handleReject(feedback)}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          <button
                            className="table-action-button danger"
                            type="button"
                            onClick={() => void handleDelete(feedback)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <FeedbackFormModal
          key={editingFeedback?.id ?? 'create-feedback'}
          feedback={editingFeedback}
          open={modalOpen}
          rooms={ownerRooms}
          tenants={ownerTenants}
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setModalOpen(false)
              setEditingFeedback(null)
            }
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {viewingFeedback ? (
        <FeedbackViewModal
          feedback={viewingFeedback}
          tenant={selectedTenant}
          room={selectedRoom}
          onClose={() => setViewingFeedback(null)}
        />
      ) : null}
    </div>
  )
}

export default FeedbackManagementPage
