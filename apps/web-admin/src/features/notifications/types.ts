import type { UserRole } from '../../types/user'

export type NotificationType =
  | 'invoice'
  | 'contract'
  | 'feedback'
  | 'utility'
  | 'system'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: string
  userId: string
  role: UserRole
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type CreateNotificationInput = Omit<
  Notification,
  'id' | 'createdAt' | 'updatedAt' | 'read'
> & {
  read?: boolean
}
