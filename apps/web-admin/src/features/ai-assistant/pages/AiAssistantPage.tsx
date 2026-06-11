import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../../auth/useAuth'
import {
  askOwnerAssistant,
  createAssistantConversation,
  getAssistantMessages,
  getOwnerAIConversations,
  type AssistantConversation,
  type AssistantMessageRecord,
} from '../services/ai-assistant.service'
import './AiAssistantPage.css'

const suggestedQuestions = [
  'How many rooms are available?',
  'How much revenue did I earn this month?',
  'Which invoices are overdue?',
  'Which contracts expire soon?',
  'Show urgent feedback.',
  'What are the main tenant complaints?',
]

function getTimestamp(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

function formatRelativeTime(value: unknown) {
  const time = getTimestamp(value)
  if (!time) return 'Recently'

  const seconds = Math.max(1, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
  }).format(new Date(time))
}

function AiAssistantPage() {
  const { currentUser } = useAuth()
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [selectedConversation, setSelectedConversation] =
    useState<AssistantConversation | null>(null)
  const [messages, setMessages] = useState<AssistantMessageRecord[]>([])
  const [question, setQuestion] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messageListRef = useRef<HTMLDivElement | null>(null)

  const selectedConversationId = selectedConversation?.id

  const canSend = useMemo(() => {
    return Boolean(question.trim()) && !sending
  }, [question, sending])

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (!messageListRef.current) return
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    })
  }, [])

  const loadConversations = useCallback(async () => {
    if (!currentUser) {
      setLoadingConversations(false)
      return
    }

    setLoadingConversations(true)
    setError('')

    try {
      const nextConversations = await getOwnerAIConversations(currentUser.uid)
      setConversations(nextConversations)
      setSelectedConversation((current) => {
        if (current && nextConversations.some((item) => item.id === current.id)) {
          return nextConversations.find((item) => item.id === current.id) ?? current
        }

        return nextConversations[0] ?? null
      })
    } catch (loadError) {
      console.error('Unable to load AI conversations.', loadError)
      setError('Unable to load AI conversations. Please try again.')
    } finally {
      setLoadingConversations(false)
    }
  }, [currentUser])

  const loadMessages = useCallback(async () => {
    if (!selectedConversationId) {
      setMessages([])
      return
    }

    setLoadingMessages(true)
    setError('')

    try {
      const nextMessages = await getAssistantMessages(selectedConversationId)
      setMessages(nextMessages)
      scrollToBottom()
    } catch (loadError) {
      console.error('Unable to load AI messages.', loadError)
      setError('Unable to load this conversation. Please try again.')
    } finally {
      setLoadingMessages(false)
    }
  }, [scrollToBottom, selectedConversationId])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function handleNewChat() {
    if (!currentUser || sending) return

    setError('')

    try {
      const conversation = await createAssistantConversation(currentUser.uid)
      setConversations((current) => [conversation, ...current])
      setSelectedConversation(conversation)
      setMessages([])
    } catch (createError) {
      console.error('Unable to create AI conversation.', createError)
      setError('Unable to create a new chat. Please try again.')
    }
  }

  async function submitQuestion(nextQuestion: string) {
    if (!currentUser) {
      setError('You must be signed in to use the AI Assistant.')
      return
    }

    const trimmedQuestion = nextQuestion.trim()
    if (!trimmedQuestion || sending) return

    setSending(true)
    setQuestion('')
    setError('')

    try {
      const result = await askOwnerAssistant({
        ownerId: currentUser.uid,
        question: trimmedQuestion,
        conversationId: selectedConversation?.id,
        conversationTitle: selectedConversation?.title,
      })

      setSelectedConversation(result.conversation)
      setMessages((current) => [...current, result.userMessage, result.assistantMessage])
      setConversations((current) => {
        const withoutCurrent = current.filter((item) => item.id !== result.conversation.id)

        return [result.conversation, ...withoutCurrent]
      })
    } catch (submitError) {
      console.error('Unable to answer AI Assistant question.', submitError)
      setQuestion(trimmedQuestion)
      setError('Unable to answer this question. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ai-assistant-page">
      <aside className="dashboard-card ai-assistant-sidebar">
        <div className="ai-assistant-sidebar-header">
          <div>
            <p className="page-eyebrow">AI Assistant</p>
            <h2>Recent Chats</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            disabled={sending}
            onClick={() => void handleNewChat()}
          >
            New Chat
          </button>
        </div>

        <div className="ai-conversation-list">
          {loadingConversations ? (
            <p className="ai-muted">Loading recent chats...</p>
          ) : conversations.length === 0 ? (
            <p className="ai-muted">No conversations yet.</p>
          ) : (
            conversations.map((conversation) => (
              <button
                className={
                  conversation.id === selectedConversationId
                    ? 'ai-conversation-item ai-conversation-item--active'
                    : 'ai-conversation-item'
                }
                key={conversation.id}
                type="button"
                onClick={() => setSelectedConversation(conversation)}
              >
                <span>{conversation.title}</span>
                <small>{formatRelativeTime(conversation.updatedAt ?? conversation.createdAt)}</small>
              </button>
            ))
          )}
        </div>

        <div className="ai-suggestion-panel">
          <h3>Suggested Questions</h3>
          <div className="ai-suggestion-list">
            {suggestedQuestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={sending}
                onClick={() => void submitQuestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="dashboard-card ai-assistant-chat">
        <div className="ai-assistant-header">
          <div>
            <p className="page-eyebrow">Owner Portal</p>
            <h1>{selectedConversation?.title ?? 'AI Assistant'}</h1>
            <p>Ask questions about rooms, tenants, invoices, contracts, utilities, and feedback.</p>
          </div>
        </div>

        {error ? <div className="room-error">{error}</div> : null}

        <div className="ai-message-list" ref={messageListRef}>
          {loadingMessages ? (
            <div className="ai-empty-state">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="ai-empty-state">
              Select a recent chat or ask a question to start a new conversation.
            </div>
          ) : (
            messages.map((message) => (
              <article
                className={`ai-message ai-message--${message.role}`}
                key={message.id}
              >
                <div>
                  <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
                  <small>{formatRelativeTime(message.createdAt)}</small>
                </div>
                <p>{message.content}</p>
              </article>
            ))
          )}

          {sending ? (
            <article className="ai-message ai-message--assistant">
              <div>
                <span>Assistant</span>
              </div>
              <p>Checking your data...</p>
            </article>
          ) : null}
        </div>

        <form
          className="ai-composer"
          onSubmit={(event) => {
            event.preventDefault()
            void submitQuestion(question)
          }}
        >
          <textarea
            placeholder="Ask about revenue, invoices, rooms, utilities, or feedback..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submitQuestion(question)
              }
            }}
          />
          <button className="primary-button" type="submit" disabled={!canSend}>
            {sending ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default AiAssistantPage
