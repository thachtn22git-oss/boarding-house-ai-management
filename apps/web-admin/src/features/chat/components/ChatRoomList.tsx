import type { ChatRoom } from '../types'
import { formatChatDate, getConversationTitle } from './chatDisplay'

type ChatRoomListProps = {
  rooms: ChatRoom[]
  currentUserId: string
  selectedRoomId?: string
  onSelectRoom: (room: ChatRoom) => void
}

function ChatRoomList({
  rooms,
  currentUserId,
  selectedRoomId,
  onSelectRoom,
}: ChatRoomListProps) {
  if (rooms.length === 0) {
    return <p className="chat-muted">No conversations yet.</p>
  }

  return (
    <div className="chat-room-list">
      {rooms.map((room) => {
        const unreadCount = room.unreadCounts[currentUserId] ?? 0
        const isActive = selectedRoomId === room.id

        return (
          <button
            className={isActive ? 'chat-room-item active' : 'chat-room-item'}
            type="button"
            key={room.id}
            onClick={() => onSelectRoom(room)}
          >
            <span className="chat-room-avatar">
              {getConversationTitle(room, currentUserId).slice(0, 2).toUpperCase()}
            </span>
            <span className="chat-room-copy">
              <strong>{getConversationTitle(room, currentUserId)}</strong>
              <small>{room.lastMessage ?? 'No messages yet'}</small>
            </span>
            <span className="chat-room-meta">
              <em>{formatChatDate(room.lastMessageAt ?? room.updatedAt)}</em>
              {unreadCount > 0 ? (
                <span className="chat-unread-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default ChatRoomList
