import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '../../auth/useAuth'
import {
  generateOwnerAssistantAnswer,
  getAssistantConversationTitle,
  type AssistantConversation,
  type AssistantMessageRecord,
} from '../services/ai-assistant.service'
import {
  createConversation,
  getConversationMessages,
  getAIHistoryUnavailableMessage,
  getLastAIHistoryError,
  isSupabaseConfigured,
  listConversations,
  logAIUsage,
  saveAssistantMessage,
  saveUserMessage,
  touchConversation,
  updateConversationTitle,
} from '../services/ai-history.service'
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

function createLocalConversation(ownerId: string, title = 'New Conversation'): AssistantConversation {
  const now = new Date().toISOString()

  return {
    id: `local-${Date.now()}-${Math.random()}`,
    ownerId,
    title,
    createdAt: now,
    updatedAt: now,
  }
}

function createLocalMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): AssistantMessageRecord {
  return {
    id: `${role}-${Date.now()}-${Math.random()}`,
    conversationId,
    role,
    content,
    createdAt: new Date().toISOString(),
  }
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
  const [historyWarning, setHistoryWarning] = useState('')
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
    setHistoryWarning('')

    try {
      if (!isSupabaseConfigured) {
        setHistoryWarning('AI conversation history is unavailable. You can still use temporary chat.')
        setLoadingConversations(false)
        return
      }

      const nextConversations = await listConversations(currentUser.uid)
      const historyError = getLastAIHistoryError()
      if (historyError) {
        setHistoryWarning(getAIHistoryUnavailableMessage(historyError))
      }
      setConversations(nextConversations)
      setSelectedConversation((current) => {
        if (current && nextConversations.some((item) => item.id === current.id)) {
          return nextConversations.find((item) => item.id === current.id) ?? current
        }

        return nextConversations[0] ?? null
      })
    } catch (loadError) {
      console.error('Unable to load AI conversations.', loadError)
      setHistoryWarning(getAIHistoryUnavailableMessage(loadError))
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
      if (!isSupabaseConfigured) {
        setLoadingMessages(false)
        return
      }

      const nextMessages = await getConversationMessages(selectedConversationId, currentUser?.uid ?? '')
      const historyError = getLastAIHistoryError()
      if (historyError) {
        setHistoryWarning(getAIHistoryUnavailableMessage(historyError))
      }
      setMessages(nextMessages)
      scrollToBottom()
    } catch (loadError) {
      console.error('Unable to load AI messages.', loadError)
      setHistoryWarning(getAIHistoryUnavailableMessage(loadError))
    } finally {
      setLoadingMessages(false)
    }
  }, [currentUser?.uid, scrollToBottom, selectedConversationId])

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

    const localConversation = createLocalConversation(currentUser.uid)
    setConversations((current) => [localConversation, ...current])
    setSelectedConversation(localConversation)
    setMessages([])

    if (!isSupabaseConfigured) {
      setHistoryWarning('AI conversation history is unavailable. You can still use temporary chat.')
      return
    }

    try {
      const conversation = await createConversation(currentUser.uid)

      if (!conversation) {
        setHistoryWarning(getAIHistoryUnavailableMessage(getLastAIHistoryError()))
        return
      }

      setConversations((current) => [
        conversation,
        ...current.filter((item) => item.id !== localConversation.id),
      ])
      setSelectedConversation(conversation)
    } catch (createError) {
      console.error('Unable to create AI conversation.', createError)
      setHistoryWarning(getAIHistoryUnavailableMessage(createError))
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
      const result = await generateOwnerAssistantAnswer(currentUser.uid, trimmedQuestion)
      let conversation = selectedConversation

      if (!conversation) {
        const title = getAssistantConversationTitle(result.intent, trimmedQuestion)
        conversation = isSupabaseConfigured
          ? (await createConversation(currentUser.uid, title)) ??
            createLocalConversation(currentUser.uid, title)
          : createLocalConversation(currentUser.uid, title)
      }

      if (!conversation) {
        throw new Error('Unable to create AI conversation.')
      }

      const nextTitle = conversation.title === 'New Conversation'
        ? getAssistantConversationTitle(result.intent, trimmedQuestion)
        : conversation.title
      const shouldPersist = isSupabaseConfigured && !conversation.id.startsWith('local-')
      const userMessage = shouldPersist
        ? await saveUserMessage(conversation.id, currentUser.uid, trimmedQuestion, result.intent)
        : createLocalMessage(conversation.id, 'user', trimmedQuestion)
      const assistantMessage = shouldPersist
        ? await saveAssistantMessage(conversation.id, currentUser.uid, result.answer, result.intent)
        : createLocalMessage(conversation.id, 'assistant', result.answer)

      const safeUserMessage =
        userMessage ?? createLocalMessage(conversation.id, 'user', trimmedQuestion)
      const safeAssistantMessage =
        assistantMessage ?? createLocalMessage(conversation.id, 'assistant', result.answer)

      if (!userMessage || !assistantMessage) {
        setHistoryWarning(getAIHistoryUnavailableMessage(getLastAIHistoryError()))
      }

      let updatedConversation: AssistantConversation = {
        ...conversation,
        title: nextTitle,
        updatedAt: new Date().toISOString(),
      }

      if (shouldPersist) {
        updatedConversation =
          (await updateConversationTitle(conversation.id, currentUser.uid, nextTitle)) ??
          updatedConversation
        updatedConversation =
          (await touchConversation(conversation.id, currentUser.uid)) ?? updatedConversation
        await logAIUsage(
          currentUser.uid,
          conversation.id,
          trimmedQuestion,
          result.intent,
          result.answer.slice(0, 240),
        )
      }

      setSelectedConversation(updatedConversation)
      setMessages((current) => [...current, safeUserMessage, safeAssistantMessage])
      setConversations((current) => {
        const withoutCurrent = current.filter((item) => item.id !== updatedConversation.id)

        return [updatedConversation, ...withoutCurrent]
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
        {historyWarning ? <div className="room-empty-state">{historyWarning}</div> : null}

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
