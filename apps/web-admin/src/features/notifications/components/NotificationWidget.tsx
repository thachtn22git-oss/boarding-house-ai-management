import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../../auth/useAuth'
import {
  getNotificationsByUser,
  markAsRead,
} from '../services/notification.service'
import type { Notification } from '../types'
import NotificationList from './NotificationList'
import './Notifications.css'

type NotificationWidgetProps = {
  title?: string
  limit?: number
}

function NotificationWidget({
  title = 'Recent Notifications',
  limit = 5,
}: NotificationWidgetProps) {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const userNotifications = await getNotificationsByUser(currentUser.uid)
      setNotifications(userNotifications.slice(0, limit))
    } catch {
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, limit])

  useEffect(() => {
    void Promise.resolve().then(loadNotifications)
  }, [loadNotifications])

  async function handleMarkRead(notificationId: string) {
    await markAsRead(notificationId)
    await loadNotifications()
  }

  return (
    <section className="dashboard-card notification-widget">
      <h2>{title}</h2>
      {isLoading ? (
        <p className="notification-empty">Loading notifications...</p>
      ) : (
        <NotificationList
          notifications={notifications}
          compact
          emptyMessage="No notifications available."
          onMarkRead={handleMarkRead}
        />
      )}
    </section>
  )
}

export default NotificationWidget
