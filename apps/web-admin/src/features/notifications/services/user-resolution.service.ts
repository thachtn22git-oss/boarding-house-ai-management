import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'

export async function getUserUidByEmail(email: string): Promise<string | null> {
  if (!email.trim()) {
    return null
  }

  const usersQuery = query(
    collection(db, 'users'),
    where('email', '==', email.trim()),
    limit(1),
  )
  const snapshot = await getDocs(usersQuery)
  const userDocument = snapshot.docs[0]

  if (!userDocument) {
    return null
  }

  const uid = userDocument.data().uid

  return typeof uid === 'string' && uid ? uid : userDocument.id
}
