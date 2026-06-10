import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from '../../services/notification.service'
import type { Notification } from '../../types/notification'
import { formatRelativeTime } from '../../utils/format'

export function NotificationsScreen() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return undefined

    setLoading(true)
    return subscribeToNotifications(
      currentUser.uid,
      (items) => {
        setNotifications(items)
        setLoading(false)
      },
      (listenerError) => {
        console.warn('Tenant notifications listener failed.', listenerError)
        setError('Unable to load notifications.')
        setLoading(false)
      },
    )
  }, [currentUser])

  async function handleMarkAllRead() {
    if (!currentUser) return
    await markAllNotificationsAsRead(currentUser.uid)
  }

  return (
    <Screen loading={loading} subtitle="Realtime tenant alerts and updates." title="Notifications">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Mark all as read" onPress={handleMarkAllRead} variant="secondary" />
      {!notifications.length ? <Text style={styles.empty}>No notifications available.</Text> : null}
      {notifications.map((notification) => (
        <ListCard key={notification.id} title={notification.title}>
          <View style={[styles.notification, !notification.read ? styles.unread : null]}>
            <Text style={styles.message}>{notification.message}</Text>
            <Text style={styles.meta}>
              {notification.priority} | {notification.read ? 'Read' : 'Unread'} | {formatRelativeTime(notification.createdAt)}
            </Text>
            {!notification.read ? (
              <PrimaryButton label="Mark as read" onPress={() => void markNotificationAsRead(notification.id)} variant="secondary" />
            ) : null}
          </View>
        </ListCard>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  notification: {
    gap: spacing.sm,
  },
  unread: {
    borderLeftColor: colors.success,
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
  },
  message: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
})
