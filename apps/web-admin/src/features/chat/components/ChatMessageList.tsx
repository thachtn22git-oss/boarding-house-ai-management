import { useEffect, useRef } from 'react'

import type { ChatMessage } from '../types'
import { formatChatDate } from './chatDisplay'

type ChatMessageListProps = {
  messages: ChatMessage[]
  currentUserId: string
  loading: boolean
}

function ChatMessageList({
  messages,
  currentUserId,
  loading,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (loading) {
    return (
      <div className="chat-message-list">
        <div className="chat-message-state">Loading messages...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="chat-message-list">
        <div className="chat-message-state">
          No messages yet. Send the first message to start chatting.
        </div>
      </div>
    )
  }

  return (
    <div className="chat-message-list">
      {messages.map((message) => {
        const isOwnMessage = message.senderId === currentUserId

        return (
          <article
            className={isOwnMessage ? 'chat-message own' : 'chat-message'}
            key={message.id}
          >
            <div className="chat-message-bubble">
              {!isOwnMessage ? <strong>{message.senderName}</strong> : null}
              <p>{message.text}</p>
              <time>{formatChatDate(message.createdAt)}</time>
            </div>
          </article>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export default ChatMessageList
