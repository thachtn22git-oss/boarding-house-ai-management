import { useEffect, useMemo, useState } from 'react'

import { DashboardSection, StatCard } from '../../../components/dashboard'
import { useAuth } from '../../auth/useAuth'
import NotificationList from '../components/NotificationList'
import {
  getNotificationPriorityLabel,
  getNotificationTypeLabel,
} from '../components/notificationDisplay'
import '../components/Notifications.css'
import {
  deleteNotification,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from '../services/notification.service'
import type {
  Notification,
  NotificationPriority,
  NotificationType,
} from '../types'

type TypeFilter = NotificationType | 'all'
type PriorityFilter = NotificationPriority | 'all'
type StatusFilter = 'all' | 'read' | 'unread'

const typeOptions: TypeFilter[] = [
  'all',
  'invoice',
  'contract',
  'feedback',
  'utility',
  'system',
]
const priorityOptions: PriorityFilter[] = [
  'all',
  'low',
  'medium',
  'high',
  'urgent',
]
const statusOptions: StatusFilter[] = ['all', 'read', 'unread']

function getStatusLabel(status: StatusFilter) {
  if (status === 'read') return 'Read'
  if (status === 'unread') return 'Unread'
  return 'All'
}

function NotificationCenterPage() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!currentUser) {
      void Promise.resolve().then(() => {
        setNotifications([])
        setError('You must be signed in to view notifications.')
        setIsLoading(false)
      })
      return undefined
    }

    void Promise.resolve().then(() => {
      setIsLoading(true)
      setError('')
    })

    return subscribeToNotifications(
      currentUser.uid,
      (nextNotifications) => {
        setNotifications(nextNotifications)
        setError('')
        setIsLoading(false)
      },
      () => {
        setError('Unable to load notifications. Please try again.')
        setIsLoading(false)
      },
    )
  }, [currentUser, retryKey])

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const matchesType =
          typeFilter === 'all' || notification.type === typeFilter
        const matchesPriority =
          priorityFilter === 'all' || notification.priority === priorityFilter
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'read' && notification.read) ||
          (statusFilter === 'unread' && !notification.read)

        return matchesType && matchesPriority && matchesStatus
      }),
    [notifications, priorityFilter, statusFilter, typeFilter],
  )

  const stats = useMemo(
    () => ({
      unread: notifications.filter((notification) => !notification.read).length,
      highPriority: notifications.filter(
        (notification) => notification.priority === 'high',
      ).length,
      urgent: notifications.filter(
        (notification) => notification.priority === 'urgent',
      ).length,
    }),
    [notifications],
  )

  async function handleMarkRead(notificationId: string) {
    await markAsRead(notificationId)
  }

  async function handleMarkAllRead() {
    if (!currentUser) {
      return
    }

    await markAllAsRead(currentUser.uid)
  }

  async function handleDelete(notificationId: string) {
    await deleteNotification(notificationId)
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>Loading notifications</h2>
            <p>Fetching your latest alerts and system updates.</p>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-card dashboard-state-card">
          <div>
            <h2>Notifications unavailable</h2>
            <p>{error}</p>
            <button
              className="dashboard-refresh-button"
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              Refresh
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <DashboardSection
        title="Notification Statistics"
        description="Current unread alerts and priority notifications."
      >
        <div className="stats-grid">
          <StatCard
            label="Total Notifications"
            value={String(notifications.length)}
            tone="primary"
          />
          <StatCard label="Unread" value={String(stats.unread)} tone="success" />
          <StatCard
            label="High Priority"
            value={String(stats.highPriority)}
            tone="warning"
          />
          <StatCard label="Urgent" value={String(stats.urgent)} tone="danger" />
        </div>
      </DashboardSection>

      <section className="dashboard-card notification-filter-card">
        <label>
          <span>Type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All' : getNotificationTypeLabel(type)}
              </option>
            ))}
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
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority === 'all'
                  ? 'All'
                  : getNotificationPriorityLabel(priority)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <div className="notification-filter-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={notifications.length === 0}
            onClick={handleMarkAllRead}
          >
            Mark All Read
          </button>
        </div>
      </section>

      <section className="dashboard-card notification-center-card">
        {notifications.length === 0 ? (
          <div className="room-empty-state">
            <h2>No notifications available.</h2>
            <p>Important updates and alerts will appear here.</p>
          </div>
        ) : (
          <NotificationList
            notifications={filteredNotifications}
            emptyMessage="No notifications match the selected filters."
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
          />
        )}
      </section>
    </div>
  )
}

export default NotificationCenterPage
