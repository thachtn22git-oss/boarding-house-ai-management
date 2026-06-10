import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { UserRole } from '../../../types/user'
import { mapAdminUser } from './admin-dashboard.service'
import type { AdminUser } from '../types'

export type UpdateAdminUserValues = {
  fullName: string
  email: string
  role: UserRole
}

function sortUsersByCreatedAt(users: AdminUser[]) {
  return [...users].sort((left, right) => {
    const leftTime = getTimestampValue(left.createdAt)
    const rightTime = getTimestampValue(right.createdAt)

    return rightTime - leftTime
  })
}

function getTimestampValue(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  return 0
}

export function subscribeToAdminUsers(
  callback: (users: AdminUser[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const usersRef = collection(db, 'users')
  const orderedQuery = query(usersRef, orderBy('createdAt', 'desc'))
  let fallbackUnsubscribe: Unsubscribe | null = null

  const unsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((userDoc) => mapAdminUser(userDoc.id, userDoc.data())),
      )
    },
    (error) => {
      console.error('Unable to load ordered users for admin portal.', error)
      onError?.(error)

      fallbackUnsubscribe = onSnapshot(
        usersRef,
        (snapshot) => {
          callback(
            sortUsersByCreatedAt(
              snapshot.docs.map((userDoc) =>
                mapAdminUser(userDoc.id, userDoc.data()),
              ),
            ),
          )
        },
        (fallbackError) => {
          console.error('Unable to load users for admin portal.', fallbackError)
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

export async function updateAdminUser(
  userId: string,
  values: UpdateAdminUserValues,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    fullName: values.fullName,
    email: values.email,
    role: values.role,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAdminUserProfile(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId))
}
