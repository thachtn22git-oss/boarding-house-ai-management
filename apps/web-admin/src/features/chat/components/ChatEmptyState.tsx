import type { ReactNode } from 'react'

type ChatEmptyStateProps = {
  title: string
  message: string
  action?: ReactNode
}

function ChatEmptyState({ title, message, action }: ChatEmptyStateProps) {
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-icon">CH</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <div className="chat-empty-action">{action}</div> : null}
    </div>
  )
}

export default ChatEmptyState
