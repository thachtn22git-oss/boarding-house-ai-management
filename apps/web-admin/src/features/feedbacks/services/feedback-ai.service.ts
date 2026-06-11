import type {
  FeedbackAIConfidence,
  FeedbackCategory,
  FeedbackPriority,
  SentimentLabel,
} from '../types'

export type FeedbackAIResult = {
  category: FeedbackCategory
  sentiment: SentimentLabel
  priority: FeedbackPriority
  summary: string
  confidence: FeedbackAIConfidence
}

const DEFAULT_AI_SERVER_URL = 'http://localhost:8000'
const REQUEST_TIMEOUT_MS = 10_000

function getAiServerUrl() {
  return (
    import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') ??
    DEFAULT_AI_SERVER_URL
  )
}

function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    value === 'electricity' ||
    value === 'water' ||
    value === 'internet' ||
    value === 'security' ||
    value === 'cleanliness' ||
    value === 'maintenance' ||
    value === 'billing' ||
    value === 'other'
  )
}

function isFeedbackPriority(value: unknown): value is FeedbackPriority {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'urgent'
}

function isSentimentLabel(value: unknown): value is SentimentLabel {
  return value === 'positive' || value === 'neutral' || value === 'negative'
}

function getConfidence(value: unknown): FeedbackAIConfidence {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const raw = value as Record<string, unknown>

  return {
    sentiment:
      typeof raw.sentiment === 'number' ? raw.sentiment : undefined,
    category: typeof raw.category === 'number' ? raw.category : undefined,
    priority: typeof raw.priority === 'number' ? raw.priority : undefined,
  }
}

export async function analyzeFeedbackWithAI(
  content: string,
): Promise<FeedbackAIResult> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${getAiServerUrl()}/api/feedback/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`AI server responded with ${response.status}.`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const category = payload.category
    const sentiment = payload.sentiment
    const priority = payload.priority

    if (
      !isFeedbackCategory(category) ||
      !isSentimentLabel(sentiment) ||
      !isFeedbackPriority(priority)
    ) {
      throw new Error('AI server returned an invalid feedback analysis payload.')
    }

    return {
      category,
      sentiment,
      priority,
      summary: typeof payload.summary === 'string' ? payload.summary : '',
      confidence: getConfidence(payload.confidence),
    }
  } catch (error) {
    console.error('Feedback AI analysis failed.', error)
    throw new Error('AI server is unavailable.')
  } finally {
    window.clearTimeout(timeoutId)
  }
}
