import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

type ChatMessageInputProps = {
  onSend: (text: string) => Promise<void> | void
  disabled?: boolean
  sending?: boolean
}

function ChatMessageInput({
  disabled,
  sending,
  onSend,
}: ChatMessageInputProps) {
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextMessage = message.trim()

    if (!nextMessage) {
      return
    }

    await onSend(nextMessage)
    setMessage('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()

      if (!message.trim() || disabled || sending) {
        return
      }

      void Promise.resolve(onSend(message.trim())).then(() => setMessage(''))
    }
  }

  return (
    <form className="chat-message-input" onSubmit={handleSubmit}>
      <textarea
        value={message}
        placeholder="Type a message..."
        rows={1}
        disabled={disabled || sending}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="primary-button"
        type="submit"
        disabled={disabled || sending || !message.trim()}
      >
        {sending ? 'Sending...' : 'Send'}
      </button>
    </form>
  )
}

export default ChatMessageInput
