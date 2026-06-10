import type { Timestamp } from 'firebase/firestore'

import type { UserRole } from '../../types/user'

export type ChatRoomType = 'owner_tenant' | 'tenant_tenant'
export type ChatParticipantRole = Extract<UserRole, 'owner' | 'tenant' | 'admin'>

export interface ChatRoom {
  id: string
  type: ChatRoomType
  ownerId?: string
  roomId?: string
  participantIds: string[]
  participantRoles: Record<string, ChatParticipantRole>
  participantNames: Record<string, string>
  participantEmails: Record<string, string>
  lastMessage?: string
  lastMessageSenderId?: string
  lastMessageAt?: Timestamp | unknown
  unreadCounts: Record<string, number>
  createdAt?: Timestamp | unknown
  updatedAt?: Timestamp | unknown
}

export interface ChatMessage {
  id: string
  chatRoomId: string
  senderId: string
  senderName: string
  senderRole: ChatParticipantRole
  text: string
  readBy: string[]
  createdAt?: Timestamp | unknown
}

export interface ChatTenantProfile {
  id: string
  ownerId: string
  roomId?: string
  fullName: string
  email: string
}

export interface ChatContact {
  userId: string
  role: ChatParticipantRole
  name: string
  email: string
  label: string
  description?: string
  tenantProfile?: ChatTenantProfile
  currentTenantProfile?: ChatTenantProfile
}

export interface ChatSender {
  uid: string
  fullName: string
  email: string
  role: ChatParticipantRole
}
