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
import { db } from '../../config/firebase'
import { formatCurrency } from '../../utils/format'

export type AssistantIntent =
  | 'room_availability'
  | 'monthly_revenue'
  | 'overdue_invoices'
  | 'expiring_contracts'
  | 'urgent_feedback'
  | 'feedback_summary'
  | 'utility_summary'
  | 'tenant_count'
  | 'unknown'

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
  const hasRoomKeyword = hasAny(text, ['room', 'rooms'])
  const hasAvailabilityKeyword = hasAny(text, ['available', 'availability', 'vacant', 'vacancy', 'empty'])
  const hasInvoiceKeyword = hasAny(text, ['invoice', 'invoices', 'payment', 'payments', 'bill', 'bills'])
  const hasOverdueKeyword = hasAny(text, ['overdue', 'unpaid', 'late', 'not paid'])

  if ((hasRoomKeyword && hasAvailabilityKeyword) || text === 'available rooms' || text === 'vacant rooms') return 'room_availability'
  if (text.includes('revenue this month') || text.includes('monthly revenue') || text.includes('earn this month') || text.includes('earned this month')) return 'monthly_revenue'
  if ((hasInvoiceKeyword && hasOverdueKeyword) || text.includes('who has not paid') || text.includes('late payments') || text.includes('unpaid bills') || text.includes('overdue bills')) return 'overdue_invoices'
  if (text.includes('expire soon') || text.includes('expiring') || text.includes('ending soon') || text.includes('expiring this month')) return 'expiring_contracts'
  if (text.includes('urgent feedback') || text.includes('needs attention') || text.includes('serious complaint') || text.includes('serious complaints')) return 'urgent_feedback'
  if (text.includes('main tenant complaints') || text.includes('summarize feedback') || text.includes('common issues') || text.includes('feedback summary')) return 'feedback_summary'
  if (text.includes('electricity usage') || text.includes('water usage') || text.includes('utility cost') || text.includes('utility summary')) return 'utility_summary'
  if (text.includes('how many tenants') || text.includes('tenant count') || text.includes('active tenants')) return 'tenant_count'

  return 'unknown'
}

async function getOwnerRows(collectionName: string, ownerId: string): Promise<Row[]> {
  const snapshot = await getDocs(query(collection(db, collectionName), where('ownerId', '==', ownerId)))

  return snapshot.docs.map((item) => ({ id: item.id, data: item.data() }))
}

function getTime(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

function isCurrentMonth(value: unknown) {
  const time = getTime(value)
  if (!time) return false
  const date = new Date(time)
  const now = new Date()

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function formatLabel(value: unknown) {
  return String(value || 'Not available')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function list(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n')
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

function sortConversations(left: AssistantConversation, right: AssistantConversation) {
  return (getTime(right.updatedAt) || getTime(right.createdAt)) - (getTime(left.updatedAt) || getTime(left.createdAt))
}

function sortMessages(left: AssistantMessageRecord, right: AssistantMessageRecord) {
  return getTime(left.createdAt) - getTime(right.createdAt)
}

function getConversationTitle(intent: AssistantIntent, question: string) {
  const text = normalizeQuestion(question)

  if (intent === 'monthly_revenue' || text.includes('revenue')) return 'Revenue Analysis'
  if (intent === 'overdue_invoices' || text.includes('overdue')) return 'Overdue Invoices'
  if (intent === 'feedback_summary' || text.includes('complaint')) return 'Tenant Complaints'
  if (intent === 'room_availability') return 'Room Availability'
  if (intent === 'expiring_contracts') return 'Expiring Contracts'
  if (intent === 'urgent_feedback') return 'Feedback Review'
  if (intent === 'utility_summary') return 'Utility Summary'
  if (intent === 'tenant_count') return 'Tenant Overview'

  return 'New Conversation'
}

async function generateOwnerAnswer(ownerId: string, intent: AssistantIntent) {
  let answer = "I can help with rooms, tenants, invoices, contracts, utilities, and feedback. Try asking: 'Which invoices are overdue?'"

  if (intent === 'room_availability') {
    const rooms = await getOwnerRows('rooms', ownerId)
    const available = rooms.filter((room) => room.data.status === 'available' || room.data.status === 'vacant')
    answer = available.length
      ? `You currently have ${available.length} available rooms: ${available.map((room) => String(room.data.roomNumber ?? room.id)).join(', ')}.`
      : 'You currently have no available rooms.'
  }

  if (intent === 'monthly_revenue') {
    const invoices = await getOwnerRows('invoices', ownerId)
    const paidThisMonth = invoices.filter((invoice) => invoice.data.status === 'paid' && isCurrentMonth(invoice.data.updatedAt ?? invoice.data.issueDate ?? invoice.data.createdAt))
    const total = paidThisMonth.reduce((sum, invoice) => sum + Number(invoice.data.totalAmount ?? 0), 0)
    answer = `Your paid revenue this month is ${formatCurrency(total)} from ${paidThisMonth.length} paid invoice(s).`
  }

  if (intent === 'overdue_invoices') {
    const invoices = await getOwnerRows('invoices', ownerId)
    const overdue = invoices.filter((invoice) => invoice.data.status === 'overdue')
    answer = overdue.length
      ? `There are ${overdue.length} overdue invoices:\n${list(overdue.slice(0, 10).map((invoice) => `${String(invoice.data.invoiceCode ?? invoice.id)}: ${formatCurrency(Number(invoice.data.totalAmount ?? 0))}`))}`
      : 'There are no overdue invoices right now.'
  }

  if (intent === 'expiring_contracts') {
    const contracts = await getOwnerRows('contracts', ownerId)
    const now = Date.now()
    const inThirtyDays = new Date()
    inThirtyDays.setDate(inThirtyDays.getDate() + 30)
    const expiring = contracts.filter((contract) => {
      const endTime = getTime(contract.data.endDate)
      return contract.data.status === 'active' && endTime >= now && endTime <= inThirtyDays.getTime()
    })
    answer = expiring.length
      ? `${expiring.length} active contract(s) expire within 30 days:\n${list(expiring.slice(0, 10).map((contract) => String(contract.data.contractCode ?? contract.id)))}`
      : 'No active contracts expire within the next 30 days.'
  }

  if (intent === 'urgent_feedback') {
    const feedbacks = await getOwnerRows('feedbacks', ownerId)
    const urgent = feedbacks.filter((feedback) => (feedback.data.priority ?? feedback.data.aiSuggestedPriority) === 'urgent')
    answer = urgent.length
      ? `${urgent.length} urgent feedback item(s):\n${list(urgent.slice(0, 10).map((feedback) => `${String(feedback.data.title ?? feedback.id)}: ${formatLabel(feedback.data.status)}`))}`
      : 'There is no urgent feedback right now.'
  }

  if (intent === 'feedback_summary') {
    const feedbacks = await getOwnerRows('feedbacks', ownerId)
    const categories = new Map<string, number>()
    feedbacks.forEach((feedback) => {
      const category = String(feedback.data.aiSuggestedCategory ?? feedback.data.category ?? 'other')
      categories.set(category, (categories.get(category) ?? 0) + 1)
    })
    const top = [...categories.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3)
    answer = top.length
      ? `The most common feedback categories are:\n${top.map(([category, count], index) => `${index + 1}. ${formatLabel(category)}: ${count} report(s)`).join('\n')}`
      : 'No tenant feedback has been submitted yet.'
  }

  if (intent === 'utility_summary') {
    const readings = (await getOwnerRows('utilityReadings', ownerId)).filter((reading) => isCurrentMonth(reading.data.billingMonth ?? reading.data.createdAt))
    const electricity = readings.filter((reading) => reading.data.utilityType === 'electricity').reduce((sum, reading) => sum + Number(reading.data.usage ?? 0), 0)
    const water = readings.filter((reading) => reading.data.utilityType === 'water').reduce((sum, reading) => sum + Number(reading.data.usage ?? 0), 0)
    const total = readings.reduce((sum, reading) => sum + Number(reading.data.totalAmount ?? 0), 0)
    answer = `This month, electricity usage is ${electricity} unit(s), water usage is ${water} unit(s), and utility charges are ${formatCurrency(total)}.`
  }

  if (intent === 'tenant_count') {
    const tenants = await getOwnerRows('tenants', ownerId)
    const active = tenants.filter((tenant) => tenant.data.status === 'active')
    answer = `You have ${tenants.length} tenant(s), including ${active.length} active tenant(s).`
  }

  return answer
}

export async function getOwnerAIConversations(ownerId: string): Promise<AssistantConversation[]> {
  try {
    const snapshot = await getDocs(query(conversationsCollection, where('ownerId', '==', ownerId), orderBy('updatedAt', 'desc')))

    return snapshot.docs.map((item) => mapConversation(item.id, item.data()))
  } catch (error) {
    console.warn('Unable to load ordered AI conversations. Falling back to client sort.', error)
    const snapshot = await getDocs(query(conversationsCollection, where('ownerId', '==', ownerId)))

    return snapshot.docs.map((item) => mapConversation(item.id, item.data())).sort(sortConversations)
  }
}

export async function getAssistantMessages(conversationId: string, pageSize = 50): Promise<AssistantMessageRecord[]> {
  try {
    const snapshot = await getDocs(query(messagesCollection, where('conversationId', '==', conversationId), orderBy('createdAt', 'desc'), limit(pageSize)))

    return snapshot.docs.map((item) => mapMessage(item.id, item.data())).sort(sortMessages)
  } catch (error) {
    console.warn('Unable to load ordered AI messages. Falling back to client sort.', error)
    const snapshot = await getDocs(query(messagesCollection, where('conversationId', '==', conversationId)))

    return snapshot.docs.map((item) => mapMessage(item.id, item.data())).sort(sortMessages).slice(-pageSize)
  }
}

export async function createAssistantConversation(ownerId: string, title = 'New Conversation') {
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
}) {
  const trimmedQuestion = question.trim()
  if (!trimmedQuestion) throw new Error('Question is required.')

  const intent = detectAssistantIntent(trimmedQuestion)
  let conversation = conversationId
    ? {
        id: conversationId,
        ownerId,
        title: conversationTitle || 'New Conversation',
      }
    : await createAssistantConversation(ownerId, getConversationTitle(intent, trimmedQuestion))

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
  const title = conversation.title === 'New Conversation' ? getConversationTitle(intent, trimmedQuestion) : conversation.title

  await updateDoc(doc(db, 'ai_conversations', conversation.id), {
    title,
    updatedAt: serverTimestamp(),
  })

  conversation = {
    ...conversation,
    title,
    updatedAt: new Date().toISOString(),
  }

  return {
    intent,
    answer,
    conversation,
    userMessage: {
      id: userMessageRef.id,
      conversationId: conversation.id,
      role: 'user' as const,
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    },
    assistantMessage: {
      id: assistantMessageRef.id,
      conversationId: conversation.id,
      role: 'assistant' as const,
      content: answer,
      createdAt: new Date().toISOString(),
    },
  }
}

export async function answerOwnerQuestion(ownerId: string, question: string) {
  const intent = detectAssistantIntent(question)
  const answer = await generateOwnerAnswer(ownerId, intent)

  void addDoc(collection(db, 'aiAssistantLogs'), {
    ownerId,
    question,
    intent,
    answer,
    createdAt: serverTimestamp(),
  }).catch((error) => console.warn('Unable to save AI assistant log.', error))

  return { intent, answer }
}
