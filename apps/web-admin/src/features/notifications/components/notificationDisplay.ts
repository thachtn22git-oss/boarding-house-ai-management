import type {
  Notification,
  NotificationPriority,
  NotificationType,
} from '../types'

export function getNotificationTypeLabel(type: NotificationType) {
  if (type === 'invoice') return 'Invoice'
  if (type === 'contract') return 'Contract'
  if (type === 'feedback') return 'Feedback'
  if (type === 'utility') return 'Utility'
  return 'System'
}

export function getNotificationPriorityLabel(priority: NotificationPriority) {
  if (priority === 'low') return 'Low'
  if (priority === 'medium') return 'Medium'
  if (priority === 'high') return 'High'
  return 'Urgent'
}

export function getNotificationTypeIcon(type: NotificationType) {
  if (type === 'invoice') return '$'
  if (type === 'contract') return 'C'
  if (type === 'feedback') return 'F'
  if (type === 'utility') return 'U'
  return 'S'
}

export function getNotificationCenterPath(role: Notification['role']) {
  if (role === 'owner') return '/owner/notifications'
  if (role === 'tenant') return '/tenant/notifications'
  return '/admin/notifications'
}
