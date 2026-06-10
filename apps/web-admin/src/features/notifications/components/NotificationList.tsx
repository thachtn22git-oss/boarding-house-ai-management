import { useNavigate } from 'react-router-dom'

import { formatDate } from '../../../utils/format'
import type { Notification } from '../types'
import {
  getNotificationPriorityLabel,
  getNotificationTypeIcon,
} from './notificationDisplay'
import './Notifications.css'

type NotificationListProps = {
  notifications: Notification[]
  emptyMessage?: string
  compact?: boolean
  onMarkRead?: (notificationId: string) => void
  onDelete?: (notificationId: string) => void
}

function NotificationList({
  notifications,
  emptyMessage = 'No notifications available.',
  compact = false,
  onMarkRead,
  onDelete,
}: NotificationListProps) {
  const navigate = useNavigate()

  function handleOpen(notification: Notification) {
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  if (notifications.length === 0) {
    return <p className="notification-empty">{emptyMessage}</p>
  }

  return (
    <ul className={compact ? 'notification-list compact' : 'notification-list'}>
      {notifications.map((notification) => (
        <li
          className={
            notification.read
              ? 'notification-item'
              : 'notification-item notification-item--unread'
          }
          key={notification.id}
        >
          <span className="notification-type-icon">
            {getNotificationTypeIcon(notification.type)}
          </span>
          <div className="notification-body">
            <div className="notification-title-row">
              <h3>{notification.title}</h3>
              <span
                className={`notification-priority-badge notification-priority-badge--${notification.priority}`}
              >
                {getNotificationPriorityLabel(notification.priority)}
              </span>
            </div>
            <p>{notification.message}</p>
            <div className="notification-meta">
              <span
                className={
                  notification.read
                    ? 'notification-read-badge notification-read-badge--read'
                    : 'notification-read-badge notification-read-badge--unread'
                }
              >
                {notification.read ? 'Read' : 'Unread'}
              </span>
              <span>{formatDate(notification.createdAt)}</span>
            </div>
            {compact ? null : (
              <div className="notification-actions">
                {!notification.read && onMarkRead ? (
                  <button
                    className="table-action-button"
                    type="button"
                    onClick={() => onMarkRead(notification.id)}
                  >
                    Mark Read
                  </button>
                ) : null}
                <button
                  className="table-action-button"
                  type="button"
                  disabled={!notification.actionUrl}
                  onClick={() => handleOpen(notification)}
                >
                  Open
                </button>
                {onDelete ? (
                  <button
                    className="table-action-button danger"
                    type="button"
                    onClick={() => onDelete(notification.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default NotificationList
