import type {
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  SentimentLabel,
} from './types'

export function getCategoryLabel(category: FeedbackCategory) {
  const labels: Record<FeedbackCategory, string> = {
    electricity: 'Electricity',
    water: 'Water',
    internet: 'Internet',
    security: 'Security',
    cleanliness: 'Cleanliness',
    maintenance: 'Maintenance',
    billing: 'Billing',
    other: 'Other',
  }

  return labels[category]
}

export function getPriorityLabel(priority: FeedbackPriority) {
  const labels: Record<FeedbackPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  }

  return labels[priority]
}

export function getStatusLabel(status: FeedbackStatus) {
  const labels: Record<FeedbackStatus, string> = {
    new: 'New',
    in_review: 'In Review',
    resolved: 'Resolved',
    rejected: 'Rejected',
  }

  return labels[status]
}

export function getSentimentLabel(sentiment: SentimentLabel) {
  const labels: Record<SentimentLabel, string> = {
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
  }

  return labels[sentiment]
}
