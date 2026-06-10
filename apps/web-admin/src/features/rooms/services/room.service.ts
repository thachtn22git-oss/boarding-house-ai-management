import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { Room, RoomFormValues } from '../types'

const roomsCollection = collection(db, 'rooms')

function mapRoomDocument(documentId: string, data: Record<string, unknown>): Room {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    boardingHouseId:
      typeof data.boardingHouseId === 'string' ? data.boardingHouseId : undefined,
    roomNumber: String(data.roomNumber ?? ''),
    floor: Number(data.floor ?? 0),
    roomType: String(data.roomType ?? ''),
    area: Number(data.area ?? 0),
    price: Number(data.price ?? 0),
    deposit: Number(data.deposit ?? 0),
    maxTenants: Number(data.maxTenants ?? 0),
    status:
      data.status === 'occupied' || data.status === 'maintenance'
        ? data.status
        : 'available',
    description:
      typeof data.description === 'string' ? data.description : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

async function getRoomsFromQuery(ownerId: string, sortByCreatedAt: boolean) {
  const roomsQuery = sortByCreatedAt
    ? query(
        roomsCollection,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
      )
    : query(roomsCollection, where('ownerId', '==', ownerId))
  const snapshot = await getDocs(roomsQuery)

  return snapshot.docs.map((roomDoc) =>
    mapRoomDocument(roomDoc.id, roomDoc.data()),
  )
}

export async function getRoomsByOwner(ownerId: string): Promise<Room[]> {
  try {
    return await getRoomsFromQuery(ownerId, true)
  } catch {
    return getRoomsFromQuery(ownerId, false)
  }
}

export async function createRoom(
  ownerId: string,
  values: RoomFormValues,
): Promise<string> {
  const roomRef = await addDoc(roomsCollection, {
    ...values,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return roomRef.id
}

export async function updateRoom(
  roomId: string,
  values: Partial<RoomFormValues>,
): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomId), {
    ...values,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRoom(roomId: string): Promise<void> {
  await deleteDoc(doc(db, 'rooms', roomId))
}
