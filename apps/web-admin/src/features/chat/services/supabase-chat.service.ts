import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../../config/firebase'
import {
  getSupabaseErrorMessage,
  isSupabaseConfigured,
  logSupabaseError,
  supabase,
} from '../../../lib/supabase'
import type { AppUser, UserRole } from '../../../types/user'
import { createNotification } from '../../notifications/services/notification.service'
import type { Tenant } from '../../tenants/types'
import * as firestoreChat from './chat.service'
import type {
  ChatContact,
  ChatMessage,
  ChatParticipantRole,
  ChatRoom,
  ChatRoomType,
  ChatSender,
  ChatTenantProfile,
} from '../types'

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

const tenantsCollection = collection(db, 'tenants')
const usersCollection = collection(db, 'users')

function ensureSupabase() {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. AI history and chat persistence are disabled.')
    return null
  }

  return supabase
}

function mapChatRoom(row: ChatRoomRow): ChatRoom {
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

function mapChatMessage(row: ChatMessageRow): ChatMessage {
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

function createRealtimeChannelName(prefix: string, id: string) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_')

  return `${prefix}_${safeId}_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function mapTenantDocument(documentId: string, data: Record<string, unknown>): Tenant {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    roomId: String(data.roomId ?? ''),
    fullName: String(data.fullName ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    identityNumber: String(data.identityNumber ?? ''),
    dateOfBirth: typeof data.dateOfBirth === 'string' ? data.dateOfBirth : undefined,
    address: typeof data.address === 'string' ? data.address : undefined,
    status: data.status === 'inactive' || data.status === 'pending' ? data.status : 'active',
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
  return value === 'owner' || value === 'tenant' || value === 'admin' ? value : 'tenant'
}

async function getUserProfileByUid(userId: string) {
  const userSnapshot = await getDoc(doc(db, 'users', userId))

  if (!userSnapshot.exists()) return null

  const data = userSnapshot.data()

  return {
    uid: String(data.uid ?? userSnapshot.id),
    fullName: String(data.fullName ?? data.email ?? 'User'),
    email: String(data.email ?? ''),
    role: getUserRole(data.role) as UserRole,
  }
}

async function getUserProfileByEmail(email: string) {
  const usersQuery = query(usersCollection, where('email', '==', email))
  const snapshot = await getDocs(usersQuery)
  const userSnapshot = snapshot.docs[0]

  if (!userSnapshot) return null

  const data = userSnapshot.data()

  return {
    uid: String(data.uid ?? userSnapshot.id),
    fullName: String(data.fullName ?? data.email ?? 'User'),
    email: String(data.email ?? ''),
    role: getUserRole(data.role) as UserRole,
  }
}

async function getCurrentTenantProfile(currentUser: AppUser) {
  if (!currentUser.email) return null

  const tenantQuery = query(tenantsCollection, where('email', '==', currentUser.email))
  const snapshot = await getDocs(tenantQuery)
  const tenantSnapshot = snapshot.docs[0]

  return tenantSnapshot
    ? toTenantProfile(mapTenantDocument(tenantSnapshot.id, tenantSnapshot.data()))
    : null
}

async function findExistingChatRoom(
  type: ChatRoomType,
  participantIds: string[],
  ownerId?: string,
) {
  const client = ensureSupabase()
  if (!client) return null

  let roomQuery = client
    .from('chat_rooms')
    .select('*')
    .eq('type', type)

  if (ownerId) {
    roomQuery = roomQuery.eq('owner_id', ownerId)
  }

  const { data, error } = await roomQuery

  if (error) {
    logSupabaseError('Existing chat room query', error)
    throw new Error(getSupabaseErrorMessage(error))
  }

  console.info('Existing chat room query result:', {
    type,
    ownerId,
    resultCount: data?.length ?? 0,
  })

  return ((data ?? []) as ChatRoomRow[])
    .map(mapChatRoom)
    .find((room) => room.participantIds.length === participantIds.length) ?? null
}

export async function listChatRooms(userId: string) {
  const client = ensureSupabase()
  if (!client) return []

  const { data, error } = await client
    .from('chat_rooms')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    logSupabaseError('Listing chat rooms', error)
    throw new Error(getSupabaseErrorMessage(error))
  }

  return sortRooms(
    ((data ?? []) as ChatRoomRow[])
      .map(mapChatRoom)
      .filter((room) => room.participantIds.includes(userId)),
  )
}

export function subscribeToUserChatRooms(
  userId: string,
  callback: (rooms: ChatRoom[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const client = ensureSupabase()
  if (!client) {
    callback([])
    return () => undefined
  }

  let active = true

  const load = () => {
    void listChatRooms(userId)
      .then((rooms) => {
        if (active && Array.isArray(rooms)) callback(rooms)
      })
    .catch((error) => {
      logSupabaseError('Loading chat rooms', error)
      onError?.(error)
    })
  }

  load()

  const channel = client
    .channel(createRealtimeChannelName('chat_rooms', userId))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_rooms' },
      load,
    )
    .subscribe((status, error) => {
      if (error) onError?.(error)
      if (status === 'CHANNEL_ERROR') {
        onError?.(new Error('Unable to subscribe to chat rooms.'))
      }
    })

  return () => {
    active = false
    void client.removeChannel(channel)
  }
}

export async function listMessages(chatRoomId: string) {
  const client = ensureSupabase()
  if (!client) return []

  const { data, error } = await client
    .from('chat_messages')
    .select('*')
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: true })

  if (error) {
    logSupabaseError('Listing chat messages', error)
    throw new Error(getSupabaseErrorMessage(error))
  }

  return ((data ?? []) as ChatMessageRow[]).map(mapChatMessage)
}

export function subscribeToChatMessages(
  chatRoomId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const client = ensureSupabase()
  if (!client) {
    callback([])
    return () => undefined
  }

  let active = true
  const load = () => {
    void listMessages(chatRoomId)
      .then((messages) => {
        if (active) callback(messages)
      })
      .catch((error) => {
        logSupabaseError('Loading chat messages', error)
        onError?.(error)
      })
  }

  load()

  const channel = client
    .channel(createRealtimeChannelName('chat_messages', chatRoomId))
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
    .subscribe((status, error) => {
      if (error) onError?.(error)
      if (status === 'CHANNEL_ERROR') {
        onError?.(new Error('Unable to subscribe to chat messages.'))
      }
    })

  return () => {
    active = false
    void client.removeChannel(channel)
  }
}

export async function sendMessage(
  chatRoomId: string,
  sender: ChatSender,
  text: string,
) {
  const client = ensureSupabase()
  if (!client) return firestoreChat.sendMessage(chatRoomId, sender, text)

  const trimmedText = text.trim()
  if (!trimmedText) throw new Error('Message cannot be empty.')

  const { data: roomData, error: roomError } = await client
    .from('chat_rooms')
    .select('*')
    .eq('id', chatRoomId)
    .single<ChatRoomRow>()

  if (roomError) {
    logSupabaseError('Loading chat room for send', roomError)
    throw new Error(getSupabaseErrorMessage(roomError))
  }

  const room = mapChatRoom(roomData)
  if (!room.participantIds.includes(sender.uid)) {
    throw new Error('You are not allowed to access this conversation.')
  }

  const { error: messageError } = await client.from('chat_messages').insert({
    chat_room_id: chatRoomId,
    sender_id: sender.uid,
    sender_name: sender.fullName,
    sender_role: sender.role,
    text: trimmedText,
    read_by: [sender.uid],
  })

  if (messageError) {
    logSupabaseError('Sending chat message', messageError)
    throw new Error(getSupabaseErrorMessage(messageError))
  }

  const unreadCounts = { ...room.unreadCounts }
  room.participantIds.forEach((participantId) => {
    if (participantId !== sender.uid) {
      unreadCounts[participantId] = Number(unreadCounts[participantId] ?? 0) + 1
    }
  })

  const now = new Date().toISOString()
  const { error: updateError } = await client
    .from('chat_rooms')
    .update({
      last_message: trimmedText,
      last_message_sender_id: sender.uid,
      last_message_at: now,
      updated_at: now,
      unread_counts: unreadCounts,
    })
    .eq('id', chatRoomId)

  if (updateError) {
    logSupabaseError('Updating chat room after message', updateError)
    throw new Error(getSupabaseErrorMessage(updateError))
  }

  const preview = trimmedText.length > 80 ? `${trimmedText.slice(0, 77)}...` : trimmedText

  void Promise.allSettled(
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
              ? `/owner/chat?roomId=${chatRoomId}`
              : room.participantRoles[participantId] === 'admin'
                ? `/admin/chat?roomId=${chatRoomId}`
                : `/tenant/chat?roomId=${chatRoomId}`,
          read: false,
        }),
      ),
  ).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.warn('Chat notification failed:', result.reason)
      }
    })
  })
}

export async function markChatRoomAsRead(chatRoomId: string, userId: string) {
  const client = ensureSupabase()
  if (!client) return firestoreChat.markChatRoomAsRead(chatRoomId, userId)

  const { data, error } = await client
    .from('chat_rooms')
    .select('unread_counts, participant_ids')
    .eq('id', chatRoomId)
    .single<{ unread_counts: Record<string, number>; participant_ids: string[] }>()

  if (error) {
    logSupabaseError('Loading chat room unread counts', error)
    throw new Error(getSupabaseErrorMessage(error))
  }
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

  if (updateError) {
    logSupabaseError('Marking chat room as read', updateError)
    throw new Error(getSupabaseErrorMessage(updateError))
  }
}

export async function getOrCreateOwnerTenantChatRoom(
  ownerId: string,
  tenantUserId: string,
  tenantProfile: ChatTenantProfile,
) {
  const client = ensureSupabase()
  if (!client) return firestoreChat.getOrCreateOwnerTenantChatRoom(ownerId, tenantUserId, tenantProfile)

  console.info('Creating chat room...', {
    type: 'owner_tenant',
    ownerId,
    tenantUserId,
    tenantEmail: tenantProfile.email,
  })
  const existingRoom = await findExistingChatRoom('owner_tenant', [ownerId, tenantUserId], ownerId)
  if (existingRoom) return existingRoom

  const ownerProfile = await getUserProfileByUid(ownerId)
  const { data, error } = await client
    .from('chat_rooms')
    .insert({
      type: 'owner_tenant',
      owner_id: ownerId,
      room_id: tenantProfile.roomId || null,
      participant_ids: [ownerId, tenantUserId],
      participant_roles: {
        [ownerId]: 'owner',
        [tenantUserId]: 'tenant',
      },
      participant_names: {
        [ownerId]: ownerProfile?.fullName ?? 'Owner',
        [tenantUserId]: tenantProfile.fullName,
      },
      participant_emails: {
        [ownerId]: ownerProfile?.email ?? '',
        [tenantUserId]: tenantProfile.email,
      },
      unread_counts: {
        [ownerId]: 0,
        [tenantUserId]: 0,
      },
    })
    .select('*')
    .single<ChatRoomRow>()

  if (error) {
    logSupabaseError('Creating owner tenant chat room', error)
    throw new Error(getSupabaseErrorMessage(error))
  }

  console.info('Chat room created.', { id: data.id })
  return mapChatRoom(data)
}

export async function getOrCreateTenantTenantChatRoom(
  currentTenantUserId: string,
  targetTenantUserId: string,
  currentTenantProfile: ChatTenantProfile,
  targetTenantProfile: ChatTenantProfile,
) {
  const client = ensureSupabase()
  if (!client) {
    return firestoreChat.getOrCreateTenantTenantChatRoom(
      currentTenantUserId,
      targetTenantUserId,
      currentTenantProfile,
      targetTenantProfile,
    )
  }

  const participantIds = [currentTenantUserId, targetTenantUserId]
  const existingRoom = await findExistingChatRoom('tenant_tenant', participantIds, currentTenantProfile.ownerId)
  if (existingRoom) return existingRoom

  const { data, error } = await client
    .from('chat_rooms')
    .insert({
      type: 'tenant_tenant',
      owner_id: currentTenantProfile.ownerId,
      room_id: currentTenantProfile.roomId,
      participant_ids: participantIds,
      participant_roles: {
        [currentTenantUserId]: 'tenant',
        [targetTenantUserId]: 'tenant',
      },
      participant_names: {
        [currentTenantUserId]: currentTenantProfile.fullName,
        [targetTenantUserId]: targetTenantProfile.fullName,
      },
      participant_emails: {
        [currentTenantUserId]: currentTenantProfile.email,
        [targetTenantUserId]: targetTenantProfile.email,
      },
      unread_counts: {
        [currentTenantUserId]: 0,
        [targetTenantUserId]: 0,
      },
    })
    .select('*')
    .single<ChatRoomRow>()

  if (error) {
    logSupabaseError('Creating tenant tenant chat room', error)
    throw new Error(getSupabaseErrorMessage(error))
  }

  console.info('Chat room created.', { id: data.id })
  return mapChatRoom(data)
}

export async function getChatContacts(currentUser: AppUser): Promise<ChatContact[]> {
  if (currentUser.role === 'owner') {
    const tenantsQuery = query(tenantsCollection, where('ownerId', '==', currentUser.uid))
    const snapshot = await getDocs(tenantsQuery)
    const tenants = snapshot.docs.map((tenantDoc) =>
      mapTenantDocument(tenantDoc.id, tenantDoc.data()),
    )

    const contacts: Array<ChatContact | null> = await Promise.all(
      tenants.map(async (tenant) => {
        const userProfile = await getUserProfileByEmail(tenant.email)
        if (!userProfile) return null

        return {
          userId: userProfile.uid,
          role: 'tenant',
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
    if (!currentTenantProfile) return []

    const ownerProfile = await getUserProfileByUid(currentTenantProfile.ownerId)
    const tenantContactsQuery = query(tenantsCollection, where('ownerId', '==', currentTenantProfile.ownerId))
    const tenantsSnapshot = await getDocs(tenantContactsQuery)
    const tenantProfiles = tenantsSnapshot.docs
      .map((tenantDoc) => toTenantProfile(mapTenantDocument(tenantDoc.id, tenantDoc.data())))
      .filter((tenant) => tenant.email !== currentUser.email)

    const tenantContacts: Array<ChatContact | null> = await Promise.all(
      tenantProfiles.map(async (tenantProfile) => {
        const userProfile = await getUserProfileByEmail(tenantProfile.email)
        if (!userProfile) return null

        return {
          userId: userProfile.uid,
          role: 'tenant',
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
