import {
  addDoc,
  collection,
  doc,
  getDoc,
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
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { AppUser } from '../types/user'
import type { ChatMessage, ChatParticipantRole, ChatRoom, ChatRoomType } from '../features/chat/chat.types'

function isParticipantRole(value: unknown): value is ChatParticipantRole {
  return value === 'owner' || value === 'tenant' || value === 'admin'
}

function isChatRoomType(value: unknown): value is ChatRoomType {
  return value === 'owner_tenant' || value === 'tenant_tenant'
}

function mapRecord(data: unknown) {
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}
}

function mapStringRecord(data: unknown) {
  return Object.fromEntries(Object.entries(mapRecord(data)).map(([key, value]) => [key, String(value ?? '')]))
}

function mapNumberRecord(data: unknown) {
  return Object.fromEntries(Object.entries(mapRecord(data)).map(([key, value]) => [key, Number(value ?? 0)]))
}

function mapRoleRecord(data: unknown) {
  const roles: Record<string, ChatParticipantRole> = {}
  Object.entries(mapRecord(data)).forEach(([key, value]) => {
    roles[key] = isParticipantRole(value) ? value : 'tenant'
  })
  return roles
}

function getMillis(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime()
  }

  return 0
}

function sortRooms(rooms: ChatRoom[]) {
  return [...rooms].sort((a, b) => getMillis(b.lastMessageAt ?? b.updatedAt) - getMillis(a.lastMessageAt ?? a.updatedAt))
}

function mapRoom(snapshot: QueryDocumentSnapshot<DocumentData>): ChatRoom {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    type: isChatRoomType(data.type) ? data.type : 'owner_tenant',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    roomId: typeof data.roomId === 'string' ? data.roomId : undefined,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds.map(String) : [],
    participantRoles: mapRoleRecord(data.participantRoles),
    participantNames: mapStringRecord(data.participantNames),
    participantEmails: mapStringRecord(data.participantEmails),
    lastMessage: typeof data.lastMessage === 'string' ? data.lastMessage : undefined,
    lastMessageSenderId: typeof data.lastMessageSenderId === 'string' ? data.lastMessageSenderId : undefined,
    lastMessageAt: data.lastMessageAt,
    unreadCounts: mapNumberRecord(data.unreadCounts),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapMessage(snapshot: QueryDocumentSnapshot<DocumentData>): ChatMessage {
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

export function subscribeToUserChatRooms(
  userId: string,
  callback: (rooms: ChatRoom[]) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    query(collection(db, 'chatRooms'), where('participantIds', 'array-contains', userId)),
    (snapshot) => callback(sortRooms(snapshot.docs.map(mapRoom))),
    (error) => onError?.(error),
  )
}

export function subscribeToChatMessages(
  chatRoomId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    query(collection(db, 'chatRooms', chatRoomId, 'messages'), orderBy('createdAt', 'asc')),
    (snapshot) => callback(snapshot.docs.map(mapMessage)),
    (error) => onError?.(error),
  )
}

export async function markChatRoomAsRead(chatRoomId: string, userId: string) {
  await updateDoc(doc(db, 'chatRooms', chatRoomId), {
    [`unreadCounts.${userId}`]: 0,
    updatedAt: serverTimestamp(),
  })
}

export async function sendChatMessage(chatRoomId: string, sender: AppUser, text: string) {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Message cannot be empty.')

  const roomRef = doc(db, 'chatRooms', chatRoomId)
  const roomSnapshot = await getDoc(roomRef)
  if (!roomSnapshot.exists()) throw new Error('Conversation was not found.')

  const room = mapRoom(roomSnapshot)
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
    text: trimmed,
    readBy: [sender.uid],
    createdAt: serverTimestamp(),
  })

  await updateDoc(roomRef, {
    lastMessage: trimmed,
    lastMessageSenderId: sender.uid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...Object.fromEntries(
      room.participantIds.filter((id) => id !== sender.uid).map((id) => [`unreadCounts.${id}`, increment(1)]),
    ),
  })

  const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed
  const notificationResults = await Promise.allSettled(
    room.participantIds
      .filter((id) => id !== sender.uid)
      .map((receiverId) => {
        const receiverRole = room.participantRoles[receiverId] ?? 'tenant'
        return addDoc(collection(db, 'notifications'), {
          userId: receiverId,
          role: receiverRole,
          type: 'system',
          priority: 'medium',
          title: 'New Message',
          message: `${sender.fullName}: ${preview}`,
          read: false,
          actionUrl:
            receiverRole === 'owner'
              ? `/owner/chat?roomId=${chatRoomId}`
              : receiverRole === 'admin'
                ? `/admin/chat?roomId=${chatRoomId}`
                : `/tenant/chat?roomId=${chatRoomId}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }),
  )

  notificationResults.forEach((result) => {
    if (result.status === 'rejected') {
      console.warn('Unable to create chat notification.', result.reason)
    }
  })
}

export function getConversationTitle(room: ChatRoom, currentUserId: string) {
  const names = room.participantIds
    .filter((id) => id !== currentUserId)
    .map((id) => room.participantNames[id])
    .filter(Boolean)
  return names.length ? names.join(', ') : 'Conversation'
}

export function formatChatTime(value: unknown) {
  const millis = getMillis(value)
  if (!millis) return 'Recently'

  const date = new Date(millis)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date)
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date)
}
