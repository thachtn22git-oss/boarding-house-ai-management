import { useState } from 'react'
import type { FormEvent } from 'react'

type ChatMessageInputProps = {
  disabled?: boolean
  sending: boolean
  onSend: (text: string) => Promise<void>
}

function ChatMessageInput({
  disabled,
  sending,
  onSend,
}: ChatMessageInputProps) {
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!message.trim()) {
      return
    }

    await onSend(message)
    setMessage('')
  }

  return (
    <form className="chat-message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={message}
        placeholder="Type a message"
        disabled={disabled || sending}
        onChange={(event) => setMessage(event.target.value)}
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
