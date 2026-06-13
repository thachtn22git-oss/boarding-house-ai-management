import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { UserRole } from '../../../types/user'
import type {
  CreateNotificationInput,
  Notification,
  NotificationPriority,
  NotificationType,
} from '../types'

const notificationsCollection = collection(db, 'notifications')

function isNotificationType(value: unknown): value is NotificationType {
  return (
    value === 'invoice' ||
    value === 'contract' ||
    value === 'feedback' ||
    value === 'utility' ||
    value === 'system'
  )
}

function isNotificationPriority(value: unknown): value is NotificationPriority {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'urgent'
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'owner' || value === 'tenant' || value === 'admin'
}

function mapNotificationDocument(
  documentId: string,
  data: DocumentData,
): Notification {
  return {
    id: documentId,
    userId: String(data.userId ?? ''),
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    role: isUserRole(data.role) ? data.role : 'tenant',
    type: isNotificationType(data.type) ? data.type : 'system',
    priority: isNotificationPriority(data.priority) ? data.priority : 'low',
    title: String(data.title ?? ''),
    message: String(data.message ?? ''),
    status: data.status === 'read' || data.status === 'unread' ? data.status : undefined,
    read: Boolean(data.read),
    actionUrl:
      typeof data.actionUrl === 'string' ? data.actionUrl : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function getTimestampValue(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

function sortNotificationsByCreatedAt(notifications: Notification[]) {
  return [...notifications].sort(
    (left, right) =>
      getTimestampValue(right.createdAt) - getTimestampValue(left.createdAt),
  )
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const orderedQuery = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )
  let fallbackUnsubscribe: Unsubscribe | null = null

  const unsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((notificationDoc) =>
          mapNotificationDocument(notificationDoc.id, notificationDoc.data()),
        ),
      )
    },
    (error) => {
      onError?.(error)

      const fallbackQuery = query(
        notificationsCollection,
        where('userId', '==', userId),
      )

      fallbackUnsubscribe = onSnapshot(
        fallbackQuery,
        (snapshot) => {
          callback(
            sortNotificationsByCreatedAt(
              snapshot.docs.map((notificationDoc) =>
                mapNotificationDocument(notificationDoc.id, notificationDoc.data()),
              ),
            ),
          )
        },
        (fallbackError) => {
          onError?.(fallbackError)
        },
      )
    },
  )

  return () => {
    unsubscribe()
    fallbackUnsubscribe?.()
  }
}

async function getNotificationsFromQuery(userId: string, sortByCreatedAt: boolean) {
  const notificationsQuery = sortByCreatedAt
    ? query(
        notificationsCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      )
    : query(notificationsCollection, where('userId', '==', userId))
  const snapshot = await getDocs(notificationsQuery)

  const notifications = snapshot.docs.map((notificationDoc) =>
    mapNotificationDocument(notificationDoc.id, notificationDoc.data()),
  )

  return sortByCreatedAt ? notifications : sortNotificationsByCreatedAt(notifications)
}

export async function getNotificationsByUser(
  userId: string,
): Promise<Notification[]> {
  try {
    return await getNotificationsFromQuery(userId, true)
  } catch {
    return getNotificationsFromQuery(userId, false)
  }
}

export async function createNotification(
  notification: CreateNotificationInput,
): Promise<string> {
  const notificationRef = await addDoc(notificationsCollection, {
    ...notification,
    actionUrl: notification.actionUrl || null,
    read: notification.read ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return notificationRef.id
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), {
    read: true,
    updatedAt: serverTimestamp(),
  })
}

export async function markAllAsRead(userId: string): Promise<void> {
  const unreadQuery = query(
    notificationsCollection,
    where('userId', '==', userId),
    where('read', '==', false),
  )
  const snapshot = await getDocs(unreadQuery)
  const batch = writeBatch(db)

  snapshot.docs.forEach((notificationDoc) => {
    batch.update(notificationDoc.ref, {
      read: true,
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'notifications', notificationId))
}
