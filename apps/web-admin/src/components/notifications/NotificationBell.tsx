import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../features/auth/useAuth'
import {
  markAllAsRead,
  markAsRead,
  subscribeToNotifications,
} from '../../features/notifications/services/notification.service'
import type {
  Notification,
  NotificationType,
} from '../../features/notifications/types'
import '../../features/notifications/components/Notifications.css'

function getTimestampValue(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  return 0
}

function formatRelativeTime(value: unknown) {
  const timestamp = getTimestampValue(value)

  if (!timestamp) {
    return 'Recently'
  }

  const now = Date.now()
  const diffMs = Math.max(now - timestamp, 0)
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const notificationDate = new Date(timestamp)
  const today = new Date()

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (notificationDate.toDateString() === today.toDateString()) return 'Today'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
  }).format(notificationDate)
}

function getNotificationCenterPath(role: Notification['role'] | undefined) {
  if (role === 'owner') return '/owner/notifications'
  if (role === 'tenant') return '/tenant/notifications'
  if (role === 'admin') return '/admin/notifications'
  return '/login'
}

function getTypeIcon(type: NotificationType) {
  if (type === 'invoice') return '$'
  if (type === 'contract') return 'C'
  if (type === 'feedback') return 'F'
  if (type === 'utility') return 'U'
  return 'S'
}

function NotificationBell() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!currentUser) {
      void Promise.resolve().then(() => setNotifications([]))
      return undefined
    }

    return subscribeToNotifications(
      currentUser.uid,
      setNotifications,
      (error) => {
        console.warn('Unable to subscribe to notification updates.', error)
      },
    )
  }, [currentUser])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )
  const latestNotifications = notifications.slice(0, 5)
  const notificationCenterPath = getNotificationCenterPath(currentUser?.role)

  async function handleMarkAllRead() {
    if (!currentUser) {
      return
    }

    await markAllAsRead(currentUser.uid)
  }

  async function handleOpen(notification: Notification) {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    setIsOpen(false)

    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  return (
    <div className="notification-bell-wrap" ref={wrapperRef}>
      <button
        className="notification-bell-button"
        type="button"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Bell size={21} strokeWidth={2.2} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="notification-bell-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="notification-dropdown" aria-label="Notifications">
          <header className="notification-dropdown-header">
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount} unread</span>
            </div>
          </header>

          <div className="notification-dropdown-list">
            {latestNotifications.length === 0 ? (
              <p className="notification-empty">No notifications available.</p>
            ) : (
              latestNotifications.map((notification) => (
                <button
                  className={
                    notification.read
                      ? 'notification-dropdown-item'
                      : 'notification-dropdown-item unread'
                  }
                  type="button"
                  key={notification.id}
                  onClick={() => handleOpen(notification)}
                >
                  <span>{getTypeIcon(notification.type)}</span>
                  <div>
                    <strong>{notification.title}</strong>
                    <small>{notification.message}</small>
                    <em>{formatRelativeTime(notification.createdAt)}</em>
                  </div>
                </button>
              ))
            )}
          </div>

          <footer className="notification-dropdown-footer">
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </button>
            <Link
              to={notificationCenterPath}
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </footer>
        </section>
      ) : null}
    </div>
  )
}

export default NotificationBell
