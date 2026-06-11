import { useMemo, useState, type FormEvent } from 'react'

import { useAuth } from '../../auth/useAuth'
import {
  answerOwnerQuestion,
  type AssistantIntent,
} from '../services/ai-assistant.service'
import './AiAssistantPage.css'

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  intent?: AssistantIntent
}

const suggestedQuestions = [
  'How many rooms are available?',
  'How much revenue did I earn this month?',
  'Which invoices are overdue?',
  'Which contracts expire soon?',
  'Show urgent feedback.',
  'What are the main tenant complaints?',
]

function createMessage(
  role: AssistantMessage['role'],
  content: string,
  intent?: AssistantIntent,
): AssistantMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random()}`,
    role,
    content,
    intent,
  }
}

function AiAssistantPage() {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => Boolean(question.trim()) && !loading,
    [loading, question],
  )

  async function askAssistant(nextQuestion: string) {
    if (!currentUser) {
      setError('You must be signed in to use the AI Assistant.')
      return
    }

    const trimmedQuestion = nextQuestion.trim()

    if (!trimmedQuestion) return

    setMessages((current) => [...current, createMessage('user', trimmedQuestion)])
    setQuestion('')
    setLoading(true)
    setError('')

    try {
      const result = await answerOwnerQuestion(currentUser.uid, trimmedQuestion)

      setMessages((current) => [
        ...current,
        createMessage('assistant', result.answer, result.intent),
      ])
    } catch (assistantError) {
      console.error('AI assistant failed.', assistantError)
      setError('Unable to answer this question. Please try again.')
      setMessages((current) => [
        ...current,
        createMessage(
          'assistant',
          'Unable to answer this question right now. Please try again.',
          'unknown',
        ),
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void askAssistant(question)
  }

  return (
    <div className="ai-assistant-page">
      <aside className="dashboard-card ai-assistant-suggestions">
        <div>
          <p className="page-eyebrow">Owner Assistant</p>
          <h2>Suggested Questions</h2>
          <p>
            Ask about rooms, tenants, invoices, contracts, utilities, and
            feedback.
          </p>
        </div>
        <div className="ai-suggestion-list">
          {suggestedQuestions.map((suggestedQuestion) => (
            <button
              key={suggestedQuestion}
              type="button"
              disabled={loading}
              onClick={() => void askAssistant(suggestedQuestion)}
            >
              {suggestedQuestion}
            </button>
          ))}
        </div>
      </aside>

      <section className="dashboard-card ai-assistant-chat">
        <div className="ai-assistant-header">
          <div>
            <p className="page-eyebrow">AI Assistant</p>
            <h1>AI Assistant</h1>
            <p>
              Ask questions about rooms, tenants, invoices, contracts,
              utilities, and feedback.
            </p>
          </div>
        </div>

        <div className="ai-message-list" aria-live="polite">
          {messages.length === 0 ? (
            <div className="ai-empty-state">
              Ask your assistant about your boarding house data.
            </div>
          ) : null}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`ai-message ai-message--${message.role}`}
            >
              <div>
                <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
                {message.intent && message.intent !== 'unknown' ? (
                  <small>{message.intent.replaceAll('_', ' ')}</small>
                ) : null}
              </div>
              <p>{message.content}</p>
            </article>
          ))}
          {loading ? (
            <article className="ai-message ai-message--assistant">
              <div>
                <span>Assistant</span>
              </div>
              <p>Checking your boarding house data...</p>
            </article>
          ) : null}
        </div>

        {error ? <div className="room-error">{error}</div> : null}

        <form className="ai-composer" onSubmit={handleSubmit}>
          <textarea
            value={question}
            rows={2}
            disabled={loading}
            placeholder="Ask a question about your boarding house..."
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default AiAssistantPage
