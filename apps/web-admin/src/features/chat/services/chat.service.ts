import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { AppUser, UserRole } from '../../../types/user'
import { createNotification } from '../../notifications/services/notification.service'
import type { Tenant } from '../../tenants/types'
import type {
  ChatContact,
  ChatMessage,
  ChatParticipantRole,
  ChatRoom,
  ChatRoomType,
  ChatSender,
  ChatTenantProfile,
} from '../types'

const chatRoomsCollection = collection(db, 'chatRooms')
const tenantsCollection = collection(db, 'tenants')
const usersCollection = collection(db, 'users')

function isParticipantRole(value: unknown): value is ChatParticipantRole {
  return value === 'owner' || value === 'tenant' || value === 'admin'
}

function isChatRoomType(value: unknown): value is ChatRoomType {
  return value === 'owner_tenant' || value === 'tenant_tenant'
}

function getRecordValue(data: unknown): Record<string, unknown> {
  return typeof data === 'object' && data !== null
    ? (data as Record<string, unknown>)
    : {}
}

function getStringRecord(data: unknown): Record<string, string> {
  const record = getRecordValue(data)

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, String(value ?? '')]),
  )
}

function getRoleRecord(data: unknown): Record<string, ChatParticipantRole> {
  const record = getRecordValue(data)
  const roles: Record<string, ChatParticipantRole> = {}

  Object.entries(record).forEach(([key, value]) => {
    roles[key] = isParticipantRole(value) ? value : 'tenant'
  })

  return roles
}

function getNumberRecord(data: unknown): Record<string, number> {
  const record = getRecordValue(data)

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, Number(value ?? 0)]),
  )
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

function sortRoomsByLastActivity(rooms: ChatRoom[]) {
  return [...rooms].sort(
    (left, right) =>
      getTimestampValue(right.lastMessageAt ?? right.updatedAt) -
      getTimestampValue(left.lastMessageAt ?? left.updatedAt),
  )
}

function mapChatRoomDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ChatRoom {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    type: isChatRoomType(data.type) ? data.type : 'owner_tenant',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    roomId: typeof data.roomId === 'string' ? data.roomId : undefined,
    participantIds: Array.isArray(data.participantIds)
      ? data.participantIds.map(String)
      : [],
    participantRoles: getRoleRecord(data.participantRoles),
    participantNames: getStringRecord(data.participantNames),
    participantEmails: getStringRecord(data.participantEmails),
    lastMessage:
      typeof data.lastMessage === 'string' ? data.lastMessage : undefined,
    lastMessageSenderId:
      typeof data.lastMessageSenderId === 'string'
        ? data.lastMessageSenderId
        : undefined,
    lastMessageAt: data.lastMessageAt,
    unreadCounts: getNumberRecord(data.unreadCounts),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapChatMessageDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ChatMessage {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    chatRoomId: String(data.chatRoomId ?? ''),
    senderId: String(data.senderId ?? ''),
    senderName: String(data.senderName ?? 'User'),
    senderRole: isParticipantRole(data.senderRole) ? data.senderRole : 'tenant',
    text: String(data.text ?? ''),
    readBy: Array.isArray(data.readBy) ? data.readBy.map(String) : [],
    createdAt: data.createdAt,
  }
}

function mapTenantDocument(documentId: string, data: DocumentData): Tenant {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    roomId: String(data.roomId ?? ''),
    fullName: String(data.fullName ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    identityNumber: String(data.identityNumber ?? ''),
    dateOfBirth:
      typeof data.dateOfBirth === 'string' ? data.dateOfBirth : undefined,
    address: typeof data.address === 'string' ? data.address : undefined,
    status:
      data.status === 'inactive' || data.status === 'pending'
        ? data.status
        : 'active',
    moveInDate: String(data.moveInDate ?? ''),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function toTenantProfile(tenant: Tenant): ChatTenantProfile {
  return {
    id: tenant.id,
    ownerId: tenant.ownerId,
    roomId: tenant.roomId,
    fullName: tenant.fullName,
    email: tenant.email,
  }
}

function isChatContact(contact: ChatContact | null): contact is ChatContact {
  return contact !== null
}

function getUserRole(value: unknown): ChatParticipantRole {
  return isParticipantRole(value) ? value : 'tenant'
}

function mapUserProfile(
  documentId: string,
  data: DocumentData,
): Pick<AppUser, 'uid' | 'fullName' | 'email' | 'role'> {
  return {
    uid: String(data.uid ?? documentId),
    fullName: String(data.fullName ?? data.email ?? 'User'),
    email: String(data.email ?? ''),
    role: getUserRole(data.role) as UserRole,
  }
}

async function getUserProfileByUid(userId: string) {
  const userSnapshot = await getDoc(doc(db, 'users', userId))

  if (!userSnapshot.exists()) {
    return null
  }

  return mapUserProfile(userSnapshot.id, userSnapshot.data())
}

async function getUserProfileByEmail(email: string) {
  const usersQuery = query(usersCollection, where('email', '==', email))
  const snapshot = await getDocs(usersQuery)
  const userSnapshot = snapshot.docs[0]

  return userSnapshot
    ? mapUserProfile(userSnapshot.id, userSnapshot.data())
    : null
}

async function getCurrentTenantProfile(currentUser: AppUser) {
  if (!currentUser.email) {
    return null
  }

  const tenantQuery = query(
    tenantsCollection,
    where('email', '==', currentUser.email),
  )
  const snapshot = await getDocs(tenantQuery)
  const tenantSnapshot = snapshot.docs[0]

  return tenantSnapshot
    ? toTenantProfile(mapTenantDocument(tenantSnapshot.id, tenantSnapshot.data()))
    : null
}

async function findExistingChatRoom(
  type: ChatRoomType,
  participantIds: string[],
) {
  const roomsQuery = query(
    chatRoomsCollection,
    where('participantIds', 'array-contains', participantIds[0]),
  )
  const snapshot = await getDocs(roomsQuery)

  return snapshot.docs
    .map(mapChatRoomDocument)
    .find(
      (room) =>
        room.type === type &&
        participantIds.every((participantId) =>
          room.participantIds.includes(participantId),
        ) &&
        room.participantIds.length === participantIds.length,
    )
}

function buildOwnerTenantRoomId(ownerId: string, tenantUserId: string) {
  return `owner_tenant_${ownerId}_${tenantUserId}`
}

function buildTenantTenantRoomId(firstUserId: string, secondUserId: string) {
  return `tenant_tenant_${[firstUserId, secondUserId].sort().join('_')}`
}

export function subscribeToUserChatRooms(
  userId: string,
  callback: (rooms: ChatRoom[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const roomsQuery = query(
    chatRoomsCollection,
    where('participantIds', 'array-contains', userId),
  )

  return onSnapshot(
    roomsQuery,
    (snapshot) => {
      callback(sortRoomsByLastActivity(snapshot.docs.map(mapChatRoomDocument)))
    },
    (error) => {
      onError?.(error)
    },
  )
}

export function subscribeToChatMessages(
  chatRoomId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const messagesQuery = query(
    collection(db, 'chatRooms', chatRoomId, 'messages'),
    orderBy('createdAt', 'asc'),
  )

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      callback(snapshot.docs.map(mapChatMessageDocument))
    },
    (error) => {
      onError?.(error)
    },
  )
}

export async function sendMessage(
  chatRoomId: string,
  sender: ChatSender,
  text: string,
): Promise<void> {
  const trimmedText = text.trim()

  if (!trimmedText) {
    throw new Error('Message cannot be empty.')
  }

  const roomRef = doc(db, 'chatRooms', chatRoomId)
  const roomSnapshot = await getDoc(roomRef)

  if (!roomSnapshot.exists()) {
    throw new Error('Conversation was not found.')
  }

  const room = mapChatRoomDocument(roomSnapshot)

  if (!room.participantIds.includes(sender.uid)) {
    throw new Error('You are not allowed to access this conversation.')
  }

  const messageRef = doc(collection(db, 'chatRooms', chatRoomId, 'messages'))

  await setDoc(messageRef, {
    id: messageRef.id,
    chatRoomId,
    senderId: sender.uid,
    senderName: sender.fullName,
    senderRole: sender.role,
    text: trimmedText,
    readBy: [sender.uid],
    createdAt: serverTimestamp(),
  })

  const unreadUpdates = Object.fromEntries(
    room.participantIds
      .filter((participantId) => participantId !== sender.uid)
      .map((participantId) => [`unreadCounts.${participantId}`, increment(1)]),
  )

  await updateDoc(roomRef, {
    lastMessage: trimmedText,
    lastMessageSenderId: sender.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...unreadUpdates,
  })

  const preview =
    trimmedText.length > 80 ? `${trimmedText.slice(0, 77)}...` : trimmedText

  await Promise.allSettled(
    room.participantIds
      .filter((participantId) => participantId !== sender.uid)
      .map((participantId) =>
        createNotification({
          userId: participantId,
          role: room.participantRoles[participantId] ?? 'tenant',
          type: 'system',
          priority: 'medium',
          title: 'New Message',
          message: `${sender.fullName}: ${preview}`,
          actionUrl:
            room.participantRoles[participantId] === 'owner'
              ? '/owner/chat'
              : room.participantRoles[participantId] === 'admin'
                ? '/admin/chat'
                : '/tenant/chat',
          read: false,
        }),
      ),
  ).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.warn('Unable to create chat notification.', result.reason)
      }
    })
  })
}

export async function markChatRoomAsRead(
  chatRoomId: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, 'chatRooms', chatRoomId), {
    [`unreadCounts.${userId}`]: 0,
    updatedAt: serverTimestamp(),
  })
}

export async function getOrCreateOwnerTenantChatRoom(
  ownerId: string,
  tenantUserId: string,
  tenantProfile: ChatTenantProfile,
): Promise<ChatRoom> {
  const existingRoom = await findExistingChatRoom('owner_tenant', [
    ownerId,
    tenantUserId,
  ])

  if (existingRoom) {
    return existingRoom
  }

  const ownerProfile = await getUserProfileByUid(ownerId)
  const roomId = buildOwnerTenantRoomId(ownerId, tenantUserId)
  const roomRef = doc(db, 'chatRooms', roomId)
  const room: ChatRoom = {
    id: roomId,
    type: 'owner_tenant',
    ownerId,
    roomId: tenantProfile.roomId,
    participantIds: [ownerId, tenantUserId],
    participantRoles: {
      [ownerId]: 'owner',
      [tenantUserId]: 'tenant',
    },
    participantNames: {
      [ownerId]: ownerProfile?.fullName ?? 'Owner',
      [tenantUserId]: tenantProfile.fullName,
    },
    participantEmails: {
      [ownerId]: ownerProfile?.email ?? '',
      [tenantUserId]: tenantProfile.email,
    },
    unreadCounts: {
      [ownerId]: 0,
      [tenantUserId]: 0,
    },
  }

  await setDoc(roomRef, {
    ...room,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return room
}

export async function getOrCreateTenantTenantChatRoom(
  currentTenantUserId: string,
  targetTenantUserId: string,
  currentTenantProfile: ChatTenantProfile,
  targetTenantProfile: ChatTenantProfile,
): Promise<ChatRoom> {
  const participantIds = [currentTenantUserId, targetTenantUserId]
  const existingRoom = await findExistingChatRoom('tenant_tenant', participantIds)

  if (existingRoom) {
    return existingRoom
  }

  const roomId = buildTenantTenantRoomId(currentTenantUserId, targetTenantUserId)
  const room: ChatRoom = {
    id: roomId,
    type: 'tenant_tenant',
    ownerId: currentTenantProfile.ownerId,
    roomId: currentTenantProfile.roomId,
    participantIds,
    participantRoles: {
      [currentTenantUserId]: 'tenant',
      [targetTenantUserId]: 'tenant',
    },
    participantNames: {
      [currentTenantUserId]: currentTenantProfile.fullName,
      [targetTenantUserId]: targetTenantProfile.fullName,
    },
    participantEmails: {
      [currentTenantUserId]: currentTenantProfile.email,
      [targetTenantUserId]: targetTenantProfile.email,
    },
    unreadCounts: {
      [currentTenantUserId]: 0,
      [targetTenantUserId]: 0,
    },
  }

  await setDoc(doc(db, 'chatRooms', roomId), {
    ...room,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return room
}

export async function getChatContacts(
  currentUser: AppUser,
): Promise<ChatContact[]> {
  if (currentUser.role === 'owner') {
    const tenantsQuery = query(
      tenantsCollection,
      where('ownerId', '==', currentUser.uid),
    )
    const snapshot = await getDocs(tenantsQuery)
    const tenants = snapshot.docs.map((tenantDoc) =>
      mapTenantDocument(tenantDoc.id, tenantDoc.data()),
    )

    const contacts: Array<ChatContact | null> = await Promise.all(
      tenants.map(async (tenant) => {
        const userProfile = await getUserProfileByEmail(tenant.email)

        if (!userProfile) {
          return null
        }

        return {
          userId: userProfile.uid,
          role: 'tenant' as const,
          name: tenant.fullName,
          email: tenant.email,
          label: tenant.fullName,
          description: tenant.email,
          tenantProfile: toTenantProfile(tenant),
        }
      }),
    )

    return contacts.filter(isChatContact)
  }

  if (currentUser.role === 'tenant') {
    const currentTenantProfile = await getCurrentTenantProfile(currentUser)

    if (!currentTenantProfile) {
      return []
    }

    const ownerProfile = await getUserProfileByUid(currentTenantProfile.ownerId)
    const tenantContactsQuery = query(
      tenantsCollection,
      where('ownerId', '==', currentTenantProfile.ownerId),
    )
    const tenantsSnapshot = await getDocs(tenantContactsQuery)
    const tenantProfiles = tenantsSnapshot.docs
      .map((tenantDoc) =>
        toTenantProfile(mapTenantDocument(tenantDoc.id, tenantDoc.data())),
      )
      .filter((tenant) => tenant.email !== currentUser.email)

    const tenantContacts: Array<ChatContact | null> = await Promise.all(
      tenantProfiles.map(async (tenantProfile) => {
        const userProfile = await getUserProfileByEmail(tenantProfile.email)

        if (!userProfile) {
          return null
        }

        return {
          userId: userProfile.uid,
          role: 'tenant' as const,
          name: tenantProfile.fullName,
          email: tenantProfile.email,
          label: tenantProfile.fullName,
          description: 'Tenant',
          tenantProfile,
          currentTenantProfile,
        }
      }),
    )

    const contacts: ChatContact[] = []

    if (ownerProfile) {
      contacts.push({
        userId: ownerProfile.uid,
        role: 'owner',
        name: ownerProfile.fullName,
        email: ownerProfile.email,
        label: ownerProfile.fullName,
        description: 'Owner',
        currentTenantProfile,
      })
    }

    contacts.push(...tenantContacts.filter(isChatContact))

    return contacts
  }

  return []
}
