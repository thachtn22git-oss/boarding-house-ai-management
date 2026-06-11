import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import { createNotification } from '../../notifications/services/notification.service'
import { getUserUidByEmail } from '../../notifications/services/user-resolution.service'
import type { FeedbackAIResult } from './feedback-ai.service'
import type {
  Feedback,
  FeedbackAIConfidence,
  FeedbackCategory,
  FeedbackFormValues,
  FeedbackPriority,
  FeedbackStatus,
  SentimentLabel,
} from '../types'

const feedbacksCollection = collection(db, 'feedbacks')

type TenantNotificationProfile = {
  id: string
  email: string
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

function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return (
    value === 'new' ||
    value === 'in_review' ||
    value === 'resolved' ||
    value === 'rejected'
  )
}

function isSentimentLabel(value: unknown): value is SentimentLabel {
  return value === 'positive' || value === 'neutral' || value === 'negative'
}

function mapAIConfidence(value: unknown): FeedbackAIConfidence | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as Record<string, unknown>

  return {
    sentiment:
      typeof raw.sentiment === 'number' ? raw.sentiment : undefined,
    category: typeof raw.category === 'number' ? raw.category : undefined,
    priority: typeof raw.priority === 'number' ? raw.priority : undefined,
  }
}

function mapFeedbackDocument(
  documentId: string,
  data: Record<string, unknown>,
): Feedback {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    roomId: typeof data.roomId === 'string' ? data.roomId : undefined,
    title: String(data.title ?? ''),
    content: String(data.content ?? ''),
    category: isFeedbackCategory(data.category) ? data.category : 'other',
    priority: isFeedbackPriority(data.priority) ? data.priority : null,
    status: isFeedbackStatus(data.status) ? data.status : 'new',
    sentiment: isSentimentLabel(data.sentiment) ? data.sentiment : null,
    aiGenerated: Boolean(data.aiGenerated),
    aiSuggestedCategory: isFeedbackCategory(data.aiSuggestedCategory)
      ? data.aiSuggestedCategory
      : null,
    aiSuggestedPriority: isFeedbackPriority(data.aiSuggestedPriority)
      ? data.aiSuggestedPriority
      : null,
    aiConfidence: mapAIConfidence(data.aiConfidence),
    aiError: typeof data.aiError === 'string' ? data.aiError : null,
    aiSummary: typeof data.aiSummary === 'string' ? data.aiSummary : null,
    ownerResponse:
      typeof data.ownerResponse === 'string' ? data.ownerResponse : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    resolvedAt: data.resolvedAt,
  }
}

async function getTenantNotificationProfile(
  tenantId: string | undefined,
): Promise<TenantNotificationProfile | null> {
  if (!tenantId) {
    return null
  }

  const tenantSnapshot = await getDoc(doc(db, 'tenants', tenantId))

  if (!tenantSnapshot.exists()) {
    return null
  }

  const tenant = tenantSnapshot.data()

  return {
    id: tenantSnapshot.id,
    email: String(tenant.email ?? ''),
  }
}

async function createTenantFeedbackStatusNotification(
  feedback: Feedback,
  outcome: 'resolved' | 'rejected',
) {
  try {
    const tenant = await getTenantNotificationProfile(feedback.tenantId)

    if (!tenant?.email) {
      console.warn('Tenant feedback notification skipped: tenant email was not found.')
      return
    }

    const tenantUserUid = await getUserUidByEmail(tenant.email)

    if (!tenantUserUid) {
      console.warn(
        `Tenant feedback notification skipped: no user found for ${tenant.email}.`,
      )
      return
    }

    await createNotification({
      userId: tenantUserUid,
      role: 'tenant',
      type: 'feedback',
      priority: 'medium',
      title: outcome === 'resolved' ? 'Feedback Resolved' : 'Feedback Reviewed',
      message:
        outcome === 'resolved'
          ? 'Your feedback has been reviewed and resolved.'
          : 'Your feedback has been reviewed.',
      actionUrl: '/tenant/my-feedback',
    })
  } catch (error) {
    console.warn('Failed to create tenant notification for feedback update.', error)
  }
}

async function getFeedbackById(feedbackId: string): Promise<Feedback> {
  const feedbackSnapshot = await getDoc(doc(db, 'feedbacks', feedbackId))

  if (!feedbackSnapshot.exists()) {
    throw new Error('Feedback not found.')
  }

  return mapFeedbackDocument(feedbackSnapshot.id, feedbackSnapshot.data())
}

async function getFeedbacksFromQuery(ownerId: string, sortByCreatedAt: boolean) {
  const feedbacksQuery = sortByCreatedAt
    ? query(
        feedbacksCollection,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
      )
    : query(feedbacksCollection, where('ownerId', '==', ownerId))
  const snapshot = await getDocs(feedbacksQuery)

  return snapshot.docs.map((feedbackDoc) =>
    mapFeedbackDocument(feedbackDoc.id, feedbackDoc.data()),
  )
}

export async function getFeedbacksByOwner(ownerId: string): Promise<Feedback[]> {
  try {
    return await getFeedbacksFromQuery(ownerId, true)
  } catch {
    return getFeedbacksFromQuery(ownerId, false)
  }
}

export async function createFeedback(
  ownerId: string,
  values: FeedbackFormValues,
): Promise<string> {
  const feedbackRef = await addDoc(feedbacksCollection, {
    ...values,
    tenantId: values.tenantId || null,
    roomId: values.roomId || null,
    sentiment: values.sentiment || null,
    ownerResponse: values.ownerResponse || null,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return feedbackRef.id
}

export async function updateFeedback(
  feedbackId: string,
  values: Partial<FeedbackFormValues>,
): Promise<void> {
  await updateDoc(doc(db, 'feedbacks', feedbackId), {
    ...values,
    tenantId: values.tenantId || null,
    roomId: values.roomId || null,
    sentiment: values.sentiment || null,
    ownerResponse: values.ownerResponse || null,
    updatedAt: serverTimestamp(),
  })
}

export async function updateFeedbackAIAnalysis(
  feedbackId: string,
  analysis: FeedbackAIResult,
): Promise<void> {
  await updateDoc(doc(db, 'feedbacks', feedbackId), {
    category: analysis.category,
    priority: analysis.priority,
    sentiment: analysis.sentiment,
    aiGenerated: true,
    aiSummary: analysis.summary || null,
    aiSuggestedCategory: analysis.category,
    aiSuggestedPriority: analysis.priority,
    aiConfidence: analysis.confidence,
    aiError: null,
    updatedAt: serverTimestamp(),
  })
}

export async function updateFeedbackAIError(
  feedbackId: string,
  message: string,
): Promise<void> {
  await updateDoc(doc(db, 'feedbacks', feedbackId), {
    aiError: message,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  await deleteDoc(doc(db, 'feedbacks', feedbackId))
}

export async function markFeedbackAsInReview(
  feedbackId: string,
): Promise<void> {
  await updateDoc(doc(db, 'feedbacks', feedbackId), {
    status: 'in_review',
    updatedAt: serverTimestamp(),
  })
}

export async function resolveFeedback(
  feedbackId: string,
  ownerResponse?: string,
): Promise<void> {
  const feedback = await getFeedbackById(feedbackId)

  await updateDoc(doc(db, 'feedbacks', feedbackId), {
    status: 'resolved',
    ownerResponse: ownerResponse || null,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await createTenantFeedbackStatusNotification(feedback, 'resolved')
}

export async function rejectFeedback(
  feedbackId: string,
  ownerResponse?: string,
): Promise<void> {
  const feedback = await getFeedbackById(feedbackId)

  await updateDoc(doc(db, 'feedbacks', feedbackId), {
    status: 'rejected',
    ownerResponse: ownerResponse || null,
    updatedAt: serverTimestamp(),
  })

  await createTenantFeedbackStatusNotification(feedback, 'rejected')
}
