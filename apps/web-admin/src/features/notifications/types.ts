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
  ownerId?: string
  tenantId?: string
  role: UserRole
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  status?: 'unread' | 'read'
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
