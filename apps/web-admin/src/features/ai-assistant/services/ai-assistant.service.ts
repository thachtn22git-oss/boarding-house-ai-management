import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import { getRecommendationFromData } from '../../feedbacks/feedback.recommendation-rules'
import { formatVndAmount } from '../../../utils/demo-payment'
import { formatCurrency } from '../../../utils/format'

export type AssistantIntent =
  | 'room_availability'
  | 'monthly_revenue'
  | 'overdue_invoices'
  | 'expiring_contracts'
  | 'urgent_feedback'
  | 'feedback_summary'
  | 'feedback_actions'
  | 'maintenance_issues'
  | 'resolution_statistics'
  | 'utility_summary'
  | 'ocr_readings'
  | 'tenant_count'
  | 'unknown'

export type AssistantAnswer = {
  intent: AssistantIntent
  answer: string
}

export type AssistantMessageRole = 'user' | 'assistant'

export type AssistantConversation = {
  id: string
  ownerId: string
  title: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type AssistantMessageRecord = {
  id: string
  conversationId: string
  role: AssistantMessageRole
  content: string
  createdAt?: unknown
}

export type AskOwnerAssistantResult = AssistantAnswer & {
  conversation: AssistantConversation
  userMessage: AssistantMessageRecord
  assistantMessage: AssistantMessageRecord
}

type Row = {
  id: string
  data: DocumentData
}

const conversationsCollection = collection(db, 'ai_conversations')
const messagesCollection = collection(db, 'ai_messages')

function normalizeQuestion(question: string) {
  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword))
}

export function detectAssistantIntent(question: string): AssistantIntent {
  const text = normalizeQuestion(question)
  const hasRoomKeyword = hasAny(text, [
    'room',
    'rooms',
  ])
  const hasAvailabilityKeyword = hasAny(text, [
    'available',
    'availability',
    'vacant',
    'vacancy',
    'empty',
  ])
  const hasInvoiceKeyword = hasAny(text, [
    'invoice',
    'invoices',
    'payment',
    'payments',
    'bill',
    'bills',
  ])
  const hasOverdueKeyword = hasAny(text, [
    'overdue',
    'unpaid',
    'late',
    'not paid',
  ])

  if (
    (hasRoomKeyword && hasAvailabilityKeyword) ||
    text === 'available rooms' ||
    text === 'vacant rooms'
  ) {
    return 'room_availability'
  }

  if (
    text.includes('revenue this month') ||
    text.includes('monthly revenue') ||
    text.includes('earn this month') ||
    text.includes('earned this month')
  ) {
    return 'monthly_revenue'
  }

  if (
    (hasInvoiceKeyword && hasOverdueKeyword) ||
    text.includes('who has not paid') ||
    text.includes('late payments') ||
    text.includes('unpaid bills') ||
    text.includes('overdue bills')
  ) {
    return 'overdue_invoices'
  }

  if (
    text.includes('expire soon') ||
    text.includes('expiring') ||
    text.includes('ending soon') ||
    text.includes('expiring this month')
  ) {
    return 'expiring_contracts'
  }

  if (
    text.includes('urgent feedback') ||
    text.includes('needs attention') ||
    text.includes('immediate action') ||
    text.includes('serious complaint') ||
    text.includes('serious complaints')
  ) {
    return 'urgent_feedback'
  }

  if (
    text.includes('main tenant complaints') ||
    text.includes('summarize feedback') ||
    text.includes('common issues') ||
    text.includes('feedback summary')
  ) {
    return 'feedback_summary'
  }

  if (
    text.includes('what actions should i take') ||
    text.includes('recommended resolutions') ||
    text.includes('recommended actions') ||
    text.includes('actions for tenant complaints')
  ) {
    return 'feedback_actions'
  }

  if (
    text.includes('common maintenance issues') ||
    text.includes('most common maintenance issues') ||
    text.includes('maintenance complaints')
  ) {
    return 'maintenance_issues'
  }

  if (
    text.includes('resolution statistics') ||
    text.includes('resolution stats') ||
    text.includes('summarize ai resolution')
  ) {
    return 'resolution_statistics'
  }

  if (
    text.includes('used ocr') ||
    text.includes('ocr detected') ||
    text.includes('ocr reading') ||
    text.includes('ocr readings') ||
    text.includes('manually corrected')
  ) {
    return 'ocr_readings'
  }

  if (
    text.includes('electricity usage') ||
    text.includes('water usage') ||
    text.includes('utility cost') ||
    text.includes('utility summary')
  ) {
    return 'utility_summary'
  }

  if (
    text.includes('how many tenants') ||
    text.includes('tenant count') ||
    text.includes('active tenants')
  ) {
    return 'tenant_count'
  }

  return 'unknown'
}

async function getOwnerRows(collectionName: string, ownerId: string): Promise<Row[]> {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where('ownerId', '==', ownerId)),
  )

  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    data: documentSnapshot.data(),
  }))
}

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

function sortByUpdatedAtDesc(
  left: Pick<AssistantConversation, 'updatedAt' | 'createdAt'>,
  right: Pick<AssistantConversation, 'updatedAt' | 'createdAt'>,
) {
  const leftTime = getTimestamp(left.updatedAt) || getTimestamp(left.createdAt)
  const rightTime = getTimestamp(right.updatedAt) || getTimestamp(right.createdAt)

  return rightTime - leftTime
}

function sortByCreatedAtAsc(
  left: Pick<AssistantMessageRecord, 'createdAt'>,
  right: Pick<AssistantMessageRecord, 'createdAt'>,
) {
  return getTimestamp(left.createdAt) - getTimestamp(right.createdAt)
}

function mapConversation(id: string, data: DocumentData): AssistantConversation {
  return {
    id,
    ownerId: String(data.ownerId ?? ''),
    title: String(data.title ?? 'New Conversation'),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function mapMessage(id: string, data: DocumentData): AssistantMessageRecord {
  return {
    id,
    conversationId: String(data.conversationId ?? ''),
    role: data.role === 'user' ? 'user' : 'assistant',
    content: String(data.content ?? ''),
    createdAt: data.createdAt,
  }
}

function isCurrentMonth(value: unknown) {
  const time = getTimestamp(value)
  if (!time) return false

  const date = new Date(time)
  const now = new Date()

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function formatList(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n')
}

function formatLabel(value: unknown) {
  return String(value || 'Not available')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isAvailableStatus(status: unknown) {
  return status === 'available' || status === 'vacant' || status === 'empty'
}

function isInvoicePaid(data: DocumentData) {
  return data.status === 'paid' || data.paymentStatus === 'paid'
}

function getInvoicePaidAmount(data: DocumentData) {
  const paidAmount = Number(data.paidAmount ?? 0)
  return paidAmount > 0 ? paidAmount : Number(data.totalAmount ?? 0)
}

function isInvoiceOverdue(data: DocumentData) {
  if (data.paymentStatus === 'paid') return false
  if (data.status === 'overdue') return true
  if (data.status === 'paid') return false

  const dueTime = getTimestamp(data.dueDate)

  return Boolean(dueTime && dueTime < startOfToday().getTime())
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today
}

export function getAssistantConversationTitle(intent: AssistantIntent, question: string) {
  const text = normalizeQuestion(question)

  if (intent === 'monthly_revenue' || text.includes('revenue')) return 'Revenue Analysis'
  if (intent === 'overdue_invoices' || text.includes('overdue')) return 'Overdue Invoices'
  if (intent === 'feedback_summary' || text.includes('complaint')) return 'Tenant Complaints'
  if (intent === 'feedback_actions') return 'Feedback Actions'
  if (intent === 'maintenance_issues') return 'Maintenance Issues'
  if (intent === 'resolution_statistics') return 'Resolution Statistics'
  if (intent === 'room_availability') return 'Room Availability'
  if (intent === 'expiring_contracts') return 'Expiring Contracts'
  if (intent === 'urgent_feedback') return 'Feedback Review'
  if (intent === 'utility_summary') return 'Utility Summary'
  if (intent === 'ocr_readings') return 'OCR Readings'
  if (intent === 'tenant_count') return 'Tenant Overview'

  const fallbackTitle = question.trim().replace(/\s+/g, ' ').slice(0, 40)

  return fallbackTitle || 'New Conversation'
}

function formatDueDate(value: unknown) {
  const time = getTimestamp(value)

  if (!time) return 'no due date'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(time))
}

function getEffectiveCategory(data: DocumentData) {
  return String(data.aiSuggestedCategory ?? data.category ?? 'other')
}

function getEffectivePriority(data: DocumentData) {
  return String(data.priority ?? data.aiSuggestedPriority ?? '')
}

function getTenantName(tenantById: Map<string, Row>, tenantId: unknown) {
  if (typeof tenantId !== 'string') return 'Unknown tenant'

  return String(tenantById.get(tenantId)?.data.fullName ?? 'Unknown tenant')
}

function getRoomName(roomById: Map<string, Row>, roomId: unknown) {
  if (typeof roomId !== 'string') return 'Unknown room'

  return String(roomById.get(roomId)?.data.roomNumber ?? 'Unknown room')
}

async function answerRoomAvailability(ownerId: string) {
  const rooms = await getOwnerRows('rooms', ownerId)
  const availableRooms = rooms.filter((room) => {
    return isAvailableStatus(room.data.status)
  })
  const occupiedCount = rooms.filter((room) => room.data.status === 'occupied').length
  const maintenanceCount = rooms.filter((room) => room.data.status === 'maintenance').length
  const roomNumbers = availableRooms
    .map((room) => String(room.data.roomNumber ?? room.id))
    .filter(Boolean)

  if (availableRooms.length === 0) {
    return 'All rooms are currently occupied or unavailable.'
  }

  return [
    `You currently have ${availableRooms.length} available rooms out of ${rooms.length} total rooms.`,
    '',
    'Available rooms:',
    formatList(roomNumbers),
    '',
    `Occupied rooms: ${occupiedCount}. Maintenance rooms: ${maintenanceCount}.`,
  ].join('\n')
}

async function answerMonthlyRevenue(ownerId: string) {
  const invoices = await getOwnerRows('invoices', ownerId)
  const paidThisMonth = invoices.filter(
    (invoice) =>
      isInvoicePaid(invoice.data) &&
      isCurrentMonth(invoice.data.paidAt ?? invoice.data.updatedAt ?? invoice.data.issueDate ?? invoice.data.createdAt),
  )
  const revenue = paidThisMonth.reduce(
    (sum, invoice) => sum + getInvoicePaidAmount(invoice.data),
    0,
  )

  return `Your paid revenue this month is ${formatCurrency(revenue)} from ${paidThisMonth.length} paid invoice(s).`
}

async function answerOverdueInvoices(ownerId: string) {
  const [invoices, tenants] = await Promise.all([
    getOwnerRows('invoices', ownerId),
    getOwnerRows('tenants', ownerId),
  ])
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
  const overdue = invoices.filter((invoice) => isInvoiceOverdue(invoice.data))

  if (overdue.length === 0) {
    return 'There are no overdue invoices.'
  }

  return [
    `There are ${overdue.length} overdue invoices:`,
    formatList(
      overdue.slice(0, 10).map((invoice) => {
        const tenantName = getTenantName(tenantById, invoice.data.tenantId)
        const fallbackTenantName =
          typeof invoice.data.tenantName === 'string'
            ? invoice.data.tenantName
            : 'Unknown tenant'
        const displayTenantName =
          tenantName === 'Unknown tenant' ? fallbackTenantName : tenantName

        return `${String(invoice.data.invoiceCode ?? invoice.id)}: ${displayTenantName}, ${formatCurrency(Number(invoice.data.totalAmount ?? 0))}, due ${formatDueDate(invoice.data.dueDate)}`
      }),
    ),
  ].join('\n')
}

async function answerExpiringContracts(ownerId: string) {
  const [contracts, tenants, rooms] = await Promise.all([
    getOwnerRows('contracts', ownerId),
    getOwnerRows('tenants', ownerId),
    getOwnerRows('rooms', ownerId),
  ])
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const now = Date.now()
  const inThirtyDays = new Date()
  inThirtyDays.setDate(inThirtyDays.getDate() + 30)
  const expiring = contracts.filter((contract) => {
    const endTime = getTimestamp(contract.data.endDate)

    return contract.data.status === 'active' && endTime >= now && endTime <= inThirtyDays.getTime()
  })

  if (expiring.length === 0) {
    return 'No active contracts expire within the next 30 days.'
  }

  return [
    `${expiring.length} active contract(s) expire within the next 30 days:`,
    formatList(
      expiring.slice(0, 10).map((contract) => {
        const tenantName = getTenantName(tenantById, contract.data.tenantId)
        const roomName = getRoomName(roomById, contract.data.roomId)

        return `${String(contract.data.contractCode ?? contract.id)}: ${tenantName}, room ${roomName}, ends ${String(contract.data.endDate ?? '-')}`
      }),
    ),
  ].join('\n')
}

async function answerUrgentFeedback(ownerId: string) {
  const feedbacks = await getOwnerRows('feedbacks', ownerId)
  const urgent = feedbacks.filter(
    (feedback) => getEffectivePriority(feedback.data) === 'urgent',
  )

  if (urgent.length === 0) {
    return 'There is no urgent feedback right now.'
  }

  return [
    `${urgent.length} urgent feedback item(s) need attention:`,
    formatList(
      urgent.slice(0, 10).map((feedback) => {
        const sentiment = feedback.data.sentiment
          ? formatLabel(feedback.data.sentiment)
          : 'Pending AI'

        return `${String(feedback.data.title ?? feedback.id)}: ${formatLabel(feedback.data.status)}, ${sentiment}`
      }),
    ),
  ].join('\n')
}

async function answerFeedbackSummary(ownerId: string) {
  const feedbacks = await getOwnerRows('feedbacks', ownerId)
  const categoryCounts = new Map<string, number>()
  const sentimentCounts = new Map<string, number>()

  feedbacks.forEach((feedback) => {
    const category = getEffectiveCategory(feedback.data)
    const sentiment = String(feedback.data.sentiment ?? 'pending')

    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    sentimentCounts.set(sentiment, (sentimentCounts.get(sentiment) ?? 0) + 1)
  })

  const topCategories = [...categoryCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)

  if (topCategories.length === 0) {
    return 'No tenant feedback has been submitted yet.'
  }

  return [
    'The most common feedback categories are:',
    ...topCategories.map(
      ([category, count], index) => `${index + 1}. ${formatLabel(category)}: ${count} report(s)`,
    ),
    `Sentiment: Positive ${sentimentCounts.get('positive') ?? 0}, Neutral ${sentimentCounts.get('neutral') ?? 0}, Negative ${sentimentCounts.get('negative') ?? 0}, Pending AI ${sentimentCounts.get('pending') ?? 0}.`,
  ].join('\n')
}

async function answerFeedbackActions(ownerId: string) {
  const feedbacks = await getOwnerRows('feedbacks', ownerId)
  const unresolved = feedbacks.filter((feedback) => {
    const status = String(feedback.data.status ?? 'new')
    return status === 'new' || status === 'in_review'
  })
  const actionCounts = new Map<string, number>()

  unresolved.forEach((feedback) => {
    const action = getRecommendationFromData(feedback.data).actionLabel
    actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1)
  })

  const topActions = [...actionCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)

  if (topActions.length === 0) {
    return 'There are no unresolved feedback actions right now.'
  }

  return [
    'Recommended actions for current tenant complaints:',
    ...topActions.map(([action, count], index) => `${index + 1}. ${action}: ${count} feedback item(s)`),
  ].join('\n')
}

async function answerMaintenanceIssues(ownerId: string) {
  const feedbacks = await getOwnerRows('feedbacks', ownerId)
  const maintenanceFeedback = feedbacks.filter((feedback) => {
    const recommendation = getRecommendationFromData(feedback.data)
    const category = getEffectiveCategory(feedback.data)

    return recommendation.actionLabel === 'Maintenance Inspection' || category === 'maintenance'
  })

  if (maintenanceFeedback.length === 0) {
    return 'No maintenance-related feedback has been detected yet.'
  }

  return [
    `${maintenanceFeedback.length} maintenance-related feedback item(s) were found.`,
    'Most recent maintenance issues:',
    formatList(
      maintenanceFeedback.slice(0, 8).map((feedback) => {
        const recommendation = getRecommendationFromData(feedback.data)
        return `${String(feedback.data.title ?? feedback.id)}: ${recommendation.suggestedResolution}`
      }),
    ),
  ].join('\n')
}

async function answerResolutionStatistics(ownerId: string) {
  const feedbacks = await getOwnerRows('feedbacks', ownerId)
  const actionCounts = new Map<string, number>()

  feedbacks.forEach((feedback) => {
    const action = getRecommendationFromData(feedback.data).actionLabel
    actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1)
  })

  const rows = [...actionCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)

  if (rows.length === 0) {
    return 'No AI resolution statistics are available yet.'
  }

  return [
    'AI resolution statistics:',
    ...rows.map(([action, count]) => `- ${action}: ${count}`),
  ].join('\n')
}

async function answerUtilitySummary(ownerId: string) {
  const readings = await getOwnerRows('utilityReadings', ownerId)
  const currentMonthReadings = readings.filter((reading) =>
    isCurrentMonth(reading.data.billingMonth ?? reading.data.createdAt),
  )
  const electricityUsage = currentMonthReadings
    .filter((reading) => reading.data.utilityType === 'electricity')
    .reduce((sum, reading) => sum + Number(reading.data.usage ?? 0), 0)
  const waterUsage = currentMonthReadings
    .filter((reading) => reading.data.utilityType === 'water')
    .reduce((sum, reading) => sum + Number(reading.data.usage ?? 0), 0)
  const totalCost = currentMonthReadings.reduce(
    (sum, reading) => sum + Number(reading.data.totalAmount ?? 0),
    0,
  )
  const paidAmount = currentMonthReadings
    .filter((reading) => reading.data.paymentStatus === 'paid' || reading.data.status === 'paid')
    .reduce(
      (sum, reading) =>
        sum + Number(reading.data.paidAmount ?? reading.data.totalAmount ?? 0),
      0,
    )
  const unpaidReadings = currentMonthReadings.filter(
    (reading) => reading.data.paymentStatus !== 'paid' && reading.data.status !== 'paid',
  )
  const unpaidAmount = unpaidReadings.reduce(
    (sum, reading) => sum + Number(reading.data.totalAmount ?? 0),
    0,
  )

  return `This month, electricity usage is ${electricityUsage} unit(s), water usage is ${waterUsage} unit(s). Total utility charges are ${formatVndAmount(totalCost)}. Paid amount is ${formatVndAmount(paidAmount)} and unpaid amount is ${formatVndAmount(unpaidAmount)} across ${unpaidReadings.length} unpaid utility bill(s).`
}

async function answerOCRReadings(ownerId: string) {
  const readings = await getOwnerRows('utilityReadings', ownerId)
  const ocrReadings = readings.filter((reading) => {
    const ocr = reading.data.ocr as Record<string, unknown> | undefined
    return Boolean(ocr?.used)
  })

  if (ocrReadings.length === 0) {
    return 'No utility readings have used OCR yet.'
  }

  const correctedReadings = ocrReadings.filter((reading) => {
    const ocr = reading.data.ocr as Record<string, unknown> | undefined
    return Number(ocr?.detectedReading ?? reading.data.currentReading) !== Number(reading.data.currentReading)
  })
  const averageConfidence =
    ocrReadings.reduce((sum, reading) => {
      const ocr = reading.data.ocr as Record<string, unknown> | undefined
      return sum + Number(ocr?.confidence ?? 0)
    }, 0) / ocrReadings.length

  return [
    `${ocrReadings.length} utility reading(s) used OCR.`,
    `Average OCR confidence: ${Math.round(averageConfidence * 100)}%.`,
    `${correctedReadings.length} reading(s) were manually corrected after OCR detection.`,
    '',
    'Recent OCR detected readings:',
    formatList(
      ocrReadings.slice(0, 8).map((reading) => {
        const ocr = reading.data.ocr as Record<string, unknown> | undefined
        return `${formatLabel(reading.data.utilityType)} ${String(reading.data.billingMonth ?? '')}: detected ${String(ocr?.detectedReading ?? '-')}, final ${String(reading.data.currentReading ?? '-')}`
      }),
    ),
  ].join('\n')
}

async function answerTenantCount(ownerId: string) {
  const tenants = await getOwnerRows('tenants', ownerId)
  const activeTenants = tenants.filter((tenant) => tenant.data.status === 'active')

  return `You have ${tenants.length} tenant(s), including ${activeTenants.length} active tenant(s).`
}

async function generateOwnerAnswer(ownerId: string, intent: AssistantIntent) {
  let answer =
    "I can help with rooms, tenants, invoices, contracts, utilities, and feedback. Try asking: 'Which invoices are overdue?'"

  if (intent === 'room_availability') answer = await answerRoomAvailability(ownerId)
  if (intent === 'monthly_revenue') answer = await answerMonthlyRevenue(ownerId)
  if (intent === 'overdue_invoices') answer = await answerOverdueInvoices(ownerId)
  if (intent === 'expiring_contracts') answer = await answerExpiringContracts(ownerId)
  if (intent === 'urgent_feedback') answer = await answerUrgentFeedback(ownerId)
  if (intent === 'feedback_summary') answer = await answerFeedbackSummary(ownerId)
  if (intent === 'feedback_actions') answer = await answerFeedbackActions(ownerId)
  if (intent === 'maintenance_issues') answer = await answerMaintenanceIssues(ownerId)
  if (intent === 'resolution_statistics') answer = await answerResolutionStatistics(ownerId)
  if (intent === 'utility_summary') answer = await answerUtilitySummary(ownerId)
  if (intent === 'ocr_readings') answer = await answerOCRReadings(ownerId)
  if (intent === 'tenant_count') answer = await answerTenantCount(ownerId)

  return answer
}

export async function getOwnerAIConversations(
  ownerId: string,
): Promise<AssistantConversation[]> {
  try {
    const snapshot = await getDocs(
      query(
        conversationsCollection,
        where('ownerId', '==', ownerId),
        orderBy('updatedAt', 'desc'),
      ),
    )

    return snapshot.docs.map((item) => mapConversation(item.id, item.data()))
  } catch (error) {
    console.warn('Unable to load ordered AI conversations. Falling back to client sort.', error)
    const snapshot = await getDocs(
      query(conversationsCollection, where('ownerId', '==', ownerId)),
    )

    return snapshot.docs
      .map((item) => mapConversation(item.id, item.data()))
      .sort(sortByUpdatedAtDesc)
  }
}

export async function getAssistantMessages(
  conversationId: string,
  pageSize = 50,
): Promise<AssistantMessageRecord[]> {
  try {
    const snapshot = await getDocs(
      query(
        messagesCollection,
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      ),
    )

    return snapshot.docs
      .map((item) => mapMessage(item.id, item.data()))
      .sort(sortByCreatedAtAsc)
  } catch (error) {
    console.warn('Unable to load ordered AI messages. Falling back to client sort.', error)
    const snapshot = await getDocs(
      query(messagesCollection, where('conversationId', '==', conversationId)),
    )

    return snapshot.docs
      .map((item) => mapMessage(item.id, item.data()))
      .sort(sortByCreatedAtAsc)
      .slice(-pageSize)
  }
}

export async function createAssistantConversation(
  ownerId: string,
  title = 'New Conversation',
): Promise<AssistantConversation> {
  const documentRef = await addDoc(conversationsCollection, {
    ownerId,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: documentRef.id,
    ownerId,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function askOwnerAssistant({
  ownerId,
  question,
  conversationId,
  conversationTitle,
}: {
  ownerId: string
  question: string
  conversationId?: string | null
  conversationTitle?: string
}): Promise<AskOwnerAssistantResult> {
  const trimmedQuestion = question.trim()
  if (!trimmedQuestion) {
    throw new Error('Question is required.')
  }

  const intent = detectAssistantIntent(trimmedQuestion)
  console.log('AI Assistant question:', trimmedQuestion)
  console.log('Detected intent:', intent)

  let conversation: AssistantConversation

  if (conversationId) {
    conversation = {
      id: conversationId,
      ownerId,
      title: conversationTitle || 'New Conversation',
    }
  } else {
    conversation = await createAssistantConversation(
      ownerId,
      getAssistantConversationTitle(intent, trimmedQuestion),
    )
  }

  const userMessageRef = await addDoc(messagesCollection, {
    conversationId: conversation.id,
    role: 'user',
    content: trimmedQuestion,
    createdAt: serverTimestamp(),
  })
  const answer = await generateOwnerAnswer(ownerId, intent)
  const assistantMessageRef = await addDoc(messagesCollection, {
    conversationId: conversation.id,
    role: 'assistant',
    content: answer,
    createdAt: serverTimestamp(),
  })
  const updatedTitle = conversation.title === 'New Conversation'
    ? getAssistantConversationTitle(intent, trimmedQuestion)
    : conversation.title

  await updateDoc(doc(db, 'ai_conversations', conversation.id), {
    title: updatedTitle,
    updatedAt: serverTimestamp(),
  })

  const updatedConversation = {
    ...conversation,
    title: updatedTitle,
    updatedAt: new Date().toISOString(),
  }

  return {
    intent,
    answer,
    conversation: updatedConversation,
    userMessage: {
      id: userMessageRef.id,
      conversationId: conversation.id,
      role: 'user',
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    },
    assistantMessage: {
      id: assistantMessageRef.id,
      conversationId: conversation.id,
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    },
  }
}

export async function answerOwnerQuestion(
  ownerId: string,
  question: string,
): Promise<AssistantAnswer> {
  const intent = detectAssistantIntent(question)
  console.log('AI Assistant question:', question)
  console.log('Detected intent:', intent)
  const answer = await generateOwnerAnswer(ownerId, intent)

  void addDoc(collection(db, 'aiAssistantLogs'), {
    ownerId,
    question,
    intent,
    answer,
    createdAt: serverTimestamp(),
  }).catch((error) => {
    console.warn('Unable to save AI assistant log.', error)
  })

  return { intent, answer }
}

export async function generateOwnerAssistantAnswer(
  ownerId: string,
  question: string,
): Promise<AssistantAnswer> {
  const intent = detectAssistantIntent(question)
  console.log('AI Assistant question:', question)
  console.log('Detected intent:', intent)
  const answer = await generateOwnerAnswer(ownerId, intent)

  return { intent, answer }
}
