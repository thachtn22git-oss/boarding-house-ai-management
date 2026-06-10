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
  lastMessageAt?: unknown
  unreadCounts: Record<string, number>
  createdAt?: unknown
  updatedAt?: unknown
}

export interface ChatMessage {
  id: string
  chatRoomId: string
  senderId: string
  senderName: string
  senderRole: ChatParticipantRole
  text: string
  readBy: string[]
  createdAt?: unknown
}
