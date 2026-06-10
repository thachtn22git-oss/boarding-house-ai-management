import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import {
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from '../../services/notification.service'
import type { Notification } from '../../types/notification'
import { formatRelativeTime } from '../../utils/format'
import type { TenantTabKey } from '../../constants/navigation'

interface NotificationsScreenProps {
  onNavigate: (tab: TenantTabKey) => void
}

export function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
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

  async function openNotification(notification: Notification) {
    if (!notification.read) await markNotificationAsRead(notification.id)

    switch (notification.actionUrl) {
      case '/tenant/my-invoices':
        onNavigate('invoices')
        break
      case '/tenant/my-utilities':
        onNavigate('utilities')
        break
      case '/tenant/my-feedback':
        onNavigate('feedback')
        break
      case '/tenant/my-contract':
        onNavigate('contract')
        break
      default:
        Alert.alert('Notification', 'No mobile destination is available for this notification.')
        break
    }
  }

  function confirmDelete(notificationId: string) {
    Alert.alert('Delete Notification', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteNotification(notificationId) },
    ])
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
              {notification.type} | {notification.priority} | {notification.read ? 'Read' : 'Unread'} |{' '}
              {formatRelativeTime(notification.createdAt)}
            </Text>
            {!notification.read ? (
              <PrimaryButton label="Mark as read" onPress={() => void markNotificationAsRead(notification.id)} variant="secondary" />
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton label="Open" onPress={() => void openNotification(notification)} />
              <PrimaryButton label="Delete" onPress={() => confirmDelete(notification.id)} variant="danger" />
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
