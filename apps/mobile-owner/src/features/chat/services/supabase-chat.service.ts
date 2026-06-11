import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import type { AppUser } from '../../../types/user'
import * as firestoreChat from '../../../services/chat.service'
import type { ChatMessage, ChatParticipantRole, ChatRoom, ChatRoomType } from '../chat.types'

type ChatRoomRow = {
  id: string
  type: ChatRoomType
  owner_id: string | null
  room_id: string | null
  participant_ids: string[]
  participant_roles: Record<string, ChatParticipantRole>
  participant_names: Record<string, string>
  participant_emails: Record<string, string>
  last_message: string | null
  last_message_sender_id: string | null
  last_message_at: string | null
  unread_counts: Record<string, number>
  created_at: string
  updated_at: string
}

type ChatMessageRow = {
  id: string
  chat_room_id: string
  sender_id: string
  sender_name: string
  sender_role: ChatParticipantRole
  text: string
  read_by: string[]
  created_at: string
}

function ensureSupabase() {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. AI history and chat persistence are disabled.')
    return null
  }

  return supabase
}

function mapRoom(row: ChatRoomRow): ChatRoom {
  return {
    id: row.id,
    type: row.type,
    ownerId: row.owner_id ?? undefined,
    roomId: row.room_id ?? undefined,
    participantIds: row.participant_ids ?? [],
    participantRoles: row.participant_roles ?? {},
    participantNames: row.participant_names ?? {},
    participantEmails: row.participant_emails ?? {},
    lastMessage: row.last_message ?? undefined,
    lastMessageSenderId: row.last_message_sender_id ?? undefined,
    lastMessageAt: row.last_message_at,
    unreadCounts: row.unread_counts ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    chatRoomId: row.chat_room_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    text: row.text,
    readBy: row.read_by ?? [],
    createdAt: row.created_at,
  }
}

function sortRooms(rooms: ChatRoom[]) {
  return [...rooms].sort((left, right) => {
    const leftTime = new Date(String(left.lastMessageAt ?? left.updatedAt ?? 0)).getTime()
    const rightTime = new Date(String(right.lastMessageAt ?? right.updatedAt ?? 0)).getTime()

    return rightTime - leftTime
  })
}

async function listRooms(userId: string) {
  const client = ensureSupabase()
  if (!client) return []

  const { data, error } = await client
    .from('chat_rooms')
    .select('*')
    .contains('participant_ids', [userId])
    .order('updated_at', { ascending: false })

  if (error) throw error

  return sortRooms(((data ?? []) as ChatRoomRow[]).map(mapRoom))
}

export function subscribeToUserChatRooms(
  userId: string,
  callback: (rooms: ChatRoom[]) => void,
  onError?: (error: unknown) => void,
) {
  const client = ensureSupabase()
  if (!client) return firestoreChat.subscribeToUserChatRooms(userId, callback, onError)

  let active = true
  const load = () => {
    void listRooms(userId)
      .then((rooms) => {
        if (active) callback(rooms)
      })
      .catch((error) => onError?.(error))
  }

  load()

  const channel = client
    .channel(`mobile_chat_rooms_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, load)
    .subscribe()

  return () => {
    active = false
    void client.removeChannel(channel)
  }
}

async function listMessages(chatRoomId: string) {
  const client = ensureSupabase()
  if (!client) return []

  const { data, error } = await client
    .from('chat_messages')
    .select('*')
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return ((data ?? []) as ChatMessageRow[]).map(mapMessage)
}

export function subscribeToChatMessages(
  chatRoomId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: unknown) => void,
) {
  const client = ensureSupabase()
  if (!client) return firestoreChat.subscribeToChatMessages(chatRoomId, callback, onError)

  let active = true
  const load = () => {
    void listMessages(chatRoomId)
      .then((messages) => {
        if (active) callback(messages)
      })
      .catch((error) => onError?.(error))
  }

  load()

  const channel = client
    .channel(`mobile_chat_messages_${chatRoomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_room_id=eq.${chatRoomId}`,
      },
      load,
    )
    .subscribe()

  return () => {
    active = false
    void client.removeChannel(channel)
  }
}

export async function markChatRoomAsRead(chatRoomId: string, userId: string) {
  const client = ensureSupabase()
  if (!client) return firestoreChat.markChatRoomAsRead(chatRoomId, userId)

  const { data, error } = await client
    .from('chat_rooms')
    .select('unread_counts, participant_ids')
    .eq('id', chatRoomId)
    .single<{ unread_counts: Record<string, number>; participant_ids: string[] }>()

  if (error) throw error
  if (!data.participant_ids.includes(userId)) {
    throw new Error('You are not allowed to access this conversation.')
  }

  const { error: updateError } = await client
    .from('chat_rooms')
    .update({
      unread_counts: {
        ...(data.unread_counts ?? {}),
        [userId]: 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', chatRoomId)

  if (updateError) throw updateError
}

export async function sendChatMessage(chatRoomId: string, sender: AppUser, text: string) {
  const client = ensureSupabase()
  if (!client) return firestoreChat.sendChatMessage(chatRoomId, sender, text)

  const trimmed = text.trim()
  if (!trimmed) throw new Error('Message cannot be empty.')

  const { data: roomData, error: roomError } = await client
    .from('chat_rooms')
    .select('*')
    .eq('id', chatRoomId)
    .single<ChatRoomRow>()

  if (roomError) throw roomError

  const room = mapRoom(roomData)
  if (!room.participantIds.includes(sender.uid)) {
    throw new Error('You are not allowed to access this conversation.')
  }

  const { error: messageError } = await client.from('chat_messages').insert({
    chat_room_id: chatRoomId,
    sender_id: sender.uid,
    sender_name: sender.fullName,
    sender_role: sender.role,
    text: trimmed,
    read_by: [sender.uid],
  })

  if (messageError) throw messageError

  const unreadCounts = { ...room.unreadCounts }
  room.participantIds.forEach((id) => {
    if (id !== sender.uid) unreadCounts[id] = Number(unreadCounts[id] ?? 0) + 1
  })

  const now = new Date().toISOString()
  const { error: updateError } = await client
    .from('chat_rooms')
    .update({
      last_message: trimmed,
      last_message_sender_id: sender.uid,
      last_message_at: now,
      updated_at: now,
      unread_counts: unreadCounts,
    })
    .eq('id', chatRoomId)

  if (updateError) throw updateError

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

export const getConversationTitle = firestoreChat.getConversationTitle
export const formatChatTime = firestoreChat.formatChatTime
