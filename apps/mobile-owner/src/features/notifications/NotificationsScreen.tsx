import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { confirmAction } from '../../components/common/ConfirmDialog'
import { colors, spacing } from '../../constants/theme'
import {
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from '../../services/notification.service'
import type { Notification } from '../../types/notification'
import { formatRelativeTime } from '../../utils/format'
import { useOwnerNavigation } from '../../components/layout/useOwnerNavigation'

export function NotificationsScreen() {
  const { currentUser } = useAuth()
  const navigate = useOwnerNavigation()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser) return undefined

    setLoading(true)
    const unsubscribe = subscribeToNotifications(
      currentUser.uid,
      (items) => {
        setNotifications(items)
        setLoading(false)
      },
      (listenerError) => {
        console.warn('Notification listener failed.', listenerError)
        setError('Unable to load notifications.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [currentUser])

  async function handleMarkAllRead() {
    if (!currentUser) return
    await markAllNotificationsAsRead(currentUser.uid)
  }

  async function openNotification(notification: Notification) {
    if (!notification.read) await markNotificationAsRead(notification.id)

    switch (notification.actionUrl) {
      case '/owner/feedback':
        navigate('feedback')
        break
      case '/owner/invoices':
        navigate('invoices')
        break
      case '/owner/utilities':
        navigate('utilities')
        break
      case '/owner/chat':
        router.push(notification.actionUrl as Href)
        break
      case '/owner/rooms':
        navigate('rooms')
        break
      case '/owner/contracts':
        Alert.alert('Contracts', 'Contracts are available on web for now.')
        break
      default:
        if (notification.actionUrl?.startsWith('/owner/chat')) {
          router.push(notification.actionUrl as Href)
          return
        }
        Alert.alert('Notification', 'No mobile destination is available for this notification.')
        break
    }
  }

  return (
    <Screen loading={loading} subtitle="Realtime alerts for important owner activity." title="Notifications">
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
              <PrimaryButton
                label="Mark as read"
                onPress={() => void markNotificationAsRead(notification.id)}
                variant="secondary"
              />
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton label="Open" onPress={() => void openNotification(notification)} />
              <PrimaryButton
                label="Delete"
                onPress={() =>
                  confirmAction('Delete Notification', 'This action cannot be undone.', () => {
                    void deleteNotification(notification.id)
                  })
                }
                variant="danger"
              />
            </View>
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
})
