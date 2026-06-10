export type NotificationType = 'invoice' | 'contract' | 'feedback' | 'utility' | 'system'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: string
  userId: string
  role: 'owner' | 'tenant' | 'admin'
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt?: unknown
  updatedAt?: unknown
}
