export type FeedbackStatus = 'new' | 'in_review' | 'resolved' | 'rejected'

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

export type FeedbackCategory =
  | 'electricity'
  | 'water'
  | 'internet'
  | 'security'
  | 'cleanliness'
  | 'maintenance'
  | 'billing'
  | 'other'

export type SentimentLabel = 'positive' | 'neutral' | 'negative'

export interface Feedback {
  id: string
  ownerId: string
  tenantId?: string
  roomId?: string
  title: string
  content: string
  category: FeedbackCategory
  priority?: FeedbackPriority | null
  status: FeedbackStatus
  sentiment?: SentimentLabel | null
  aiGenerated?: boolean
  aiSuggestedCategory?: FeedbackCategory | null
  aiSuggestedPriority?: FeedbackPriority | null
  aiSummary?: string | null
  ownerResponse?: string
  createdAt?: unknown
  updatedAt?: unknown
  resolvedAt?: unknown
}

export interface FeedbackFormValues {
  tenantId?: string
  roomId?: string
  title: string
  content: string
  category: FeedbackCategory
  priority?: FeedbackPriority | null
  status: FeedbackStatus
  sentiment?: SentimentLabel | null
  ownerResponse?: string
}
