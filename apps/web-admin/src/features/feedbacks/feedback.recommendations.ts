import type { Feedback } from './types'
import { getRecommendationFromData } from './feedback.recommendation-rules'

export function getFeedbackRecommendation(feedback: Feedback) {
  return getRecommendationFromData(feedback as unknown as Record<string, unknown>)
}

export function getFeedbackRecommendationPreview(feedback: Feedback) {
  return getFeedbackRecommendation(feedback).suggestedResolution
}
