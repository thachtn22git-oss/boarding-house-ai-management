import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  doc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Notification } from '../types/notification'

function sortNotifications(notifications: Notification[]) {
  return [...notifications].sort((a, b) => {
    const aTime = getMillis(a.createdAt)
    const bTime = getMillis(b.createdAt)
    return bTime - aTime
  })
}

function getMillis(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime()
  }

  return 0
}

function mapSnapshot(docs: { id: string; data: () => Record<string, unknown> }[]) {
  return sortNotifications(docs.map((item) => ({ id: item.id, ...item.data() }) as Notification))
}

export async function getNotifications(userId: string) {
  const snapshot = await getDocs(query(collection(db, 'notifications'), where('userId', '==', userId)))
  return mapSnapshot(snapshot.docs)
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  onError?: (error: unknown) => void,
) {
  const orderedQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )

  let activeUnsubscribe: Unsubscribe | undefined

  activeUnsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => callback(mapSnapshot(snapshot.docs)),
    (error) => {
      console.warn('Ordered notification listener failed. Falling back to client-side sorting.', error)

      const fallbackQuery = query(collection(db, 'notifications'), where('userId', '==', userId))
      activeUnsubscribe?.()
      activeUnsubscribe = onSnapshot(
        fallbackQuery,
        (snapshot) => callback(mapSnapshot(snapshot.docs)),
        (fallbackError) => onError?.(fallbackError),
      )
    },
  )

  return () => activeUnsubscribe?.()
}

export async function markNotificationAsRead(notificationId: string) {
  await updateDoc(doc(db, 'notifications', notificationId), {
    read: true,
    updatedAt: serverTimestamp(),
  })
}

export async function markAllNotificationsAsRead(userId: string) {
  const snapshot = await getDocs(query(collection(db, 'notifications'), where('userId', '==', userId)))
  const batch = writeBatch(db)

  snapshot.docs.forEach((item) => {
    batch.update(item.ref, {
      read: true,
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}
