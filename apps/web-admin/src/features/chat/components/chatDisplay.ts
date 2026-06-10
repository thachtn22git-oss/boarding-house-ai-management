import type { ChatRoom } from '../types'

export function formatChatDate(value: unknown) {
  if (!value) {
    return ''
  }

  const date =
    typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : typeof value === 'string'
        ? new Date(value)
        : value instanceof Date
          ? value
          : null

  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
  }).format(date)
}

export function getConversationTitle(room: ChatRoom, currentUserId: string) {
  const names = room.participantIds
    .filter((participantId) => participantId !== currentUserId)
    .map((participantId) => room.participantNames[participantId])
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : 'Conversation'
}

export function getRoomTypeLabel(type: ChatRoom['type']) {
  return type === 'owner_tenant' ? 'Owner and tenant' : 'Tenant conversation'
}
