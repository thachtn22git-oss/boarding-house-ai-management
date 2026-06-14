import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { formatVndAmount } from '../../utils/demo-payment'
import { formatCurrency } from '../../utils/format'

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
  if (text.includes('urgent feedback') || text.includes('needs attention') || text.includes('immediate action') || text.includes('serious complaint') || text.includes('serious complaints')) return 'urgent_feedback'
  if (text.includes('main tenant complaints') || text.includes('summarize feedback') || text.includes('common issues') || text.includes('feedback summary')) return 'feedback_summary'
  if (text.includes('what actions should i take') || text.includes('recommended resolutions') || text.includes('recommended actions') || text.includes('actions for tenant complaints')) return 'feedback_actions'
  if (text.includes('common maintenance issues') || text.includes('most common maintenance issues') || text.includes('maintenance complaints')) return 'maintenance_issues'
  if (text.includes('resolution statistics') || text.includes('resolution stats') || text.includes('summarize ai resolution')) return 'resolution_statistics'
  if (text.includes('used ocr') || text.includes('ocr detected') || text.includes('ocr reading') || text.includes('ocr readings') || text.includes('manually corrected')) return 'ocr_readings'
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

function getRecommendationAction(data: DocumentData) {
  const text = `${String(data.title ?? '')} ${String(data.content ?? '')} ${String(data.aiSuggestedCategory ?? data.category ?? '')}`.toLowerCase()

  if (['leak', 'water', 'pipe', 'bathroom', 'toilet', 'door', 'window', 'broken', 'repair'].some((keyword) => text.includes(keyword))) return 'Maintenance Inspection'
  if (['wifi', 'internet', 'network', 'signal', 'slow internet'].some((keyword) => text.includes(keyword))) return 'Network Check'
  if (['electricity', 'power', 'light', 'socket', 'switch'].some((keyword) => text.includes(keyword))) return 'Electrical Inspection'
  if (['water pressure', 'water supply', 'no water', 'dirty water'].some((keyword) => text.includes(keyword))) return 'Water Supply Review'
  if (['noise', 'loud', 'party', 'disturbing'].some((keyword) => text.includes(keyword))) return 'Noise Review'
  if (['security', 'theft', 'suspicious', 'unsafe'].some((keyword) => text.includes(keyword))) return 'Security Review'

  return 'General Review'
}

function isInvoicePaid(data: DocumentData) {
  return data.status === 'paid' || data.paymentStatus === 'paid'
}

function isInvoiceOverdue(data: DocumentData) {
  return data.status === 'overdue' && data.paymentStatus !== 'paid'
}

function getInvoicePaidAmount(data: DocumentData) {
  const paidAmount = Number(data.paidAmount ?? 0)
  return paidAmount > 0 ? paidAmount : Number(data.totalAmount ?? 0)
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
  if (intent === 'feedback_actions') return 'Feedback Actions'
  if (intent === 'maintenance_issues') return 'Maintenance Issues'
  if (intent === 'resolution_statistics') return 'Resolution Statistics'
  if (intent === 'room_availability') return 'Room Availability'
  if (intent === 'expiring_contracts') return 'Expiring Contracts'
  if (intent === 'urgent_feedback') return 'Feedback Review'
  if (intent === 'utility_summary') return 'Utility Summary'
  if (intent === 'ocr_readings') return 'OCR Readings'
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
    const paidThisMonth = invoices.filter((invoice) => isInvoicePaid(invoice.data) && isCurrentMonth(invoice.data.paidAt ?? invoice.data.updatedAt ?? invoice.data.issueDate ?? invoice.data.createdAt))
    const total = paidThisMonth.reduce((sum, invoice) => sum + getInvoicePaidAmount(invoice.data), 0)
    answer = `Your paid revenue this month is ${formatCurrency(total)} from ${paidThisMonth.length} paid invoice(s).`
  }

  if (intent === 'overdue_invoices') {
    const invoices = await getOwnerRows('invoices', ownerId)
    const overdue = invoices.filter((invoice) => isInvoiceOverdue(invoice.data))
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
    const paid = readings
      .filter((reading) => reading.data.paymentStatus === 'paid' || reading.data.status === 'paid')
      .reduce((sum, reading) => sum + Number(reading.data.paidAmount ?? reading.data.totalAmount ?? 0), 0)
    const unpaidReadings = readings.filter((reading) => reading.data.paymentStatus !== 'paid' && reading.data.status !== 'paid')
    const unpaid = unpaidReadings.reduce((sum, reading) => sum + Number(reading.data.totalAmount ?? 0), 0)
    answer = `This month, electricity usage is ${electricity} unit(s), water usage is ${water} unit(s). Total utility charges are ${formatVndAmount(total)}. Paid amount is ${formatVndAmount(paid)} and unpaid amount is ${formatVndAmount(unpaid)} across ${unpaidReadings.length} unpaid utility bill(s).`
  }

  if (intent === 'ocr_readings') {
    const readings = await getOwnerRows('utilityReadings', ownerId)
    const ocrReadings = readings.filter((reading) => {
      const ocr = reading.data.ocr as Record<string, unknown> | undefined
      return Boolean(ocr?.used)
    })

    if (!ocrReadings.length) {
      answer = 'No utility readings have used OCR yet.'
    } else {
      const corrected = ocrReadings.filter((reading) => {
        const ocr = reading.data.ocr as Record<string, unknown> | undefined
        return Number(ocr?.detectedReading ?? reading.data.currentReading) !== Number(reading.data.currentReading)
      })
      const confidence =
        ocrReadings.reduce((sum, reading) => {
          const ocr = reading.data.ocr as Record<string, unknown> | undefined
          return sum + Number(ocr?.confidence ?? 0)
        }, 0) / ocrReadings.length

      answer = [
        `${ocrReadings.length} utility reading(s) used OCR.`,
        `Average OCR confidence: ${Math.round(confidence * 100)}%.`,
        `${corrected.length} reading(s) were manually corrected after OCR detection.`,
        'Recent OCR detected readings:',
        list(
          ocrReadings.slice(0, 8).map((reading) => {
            const ocr = reading.data.ocr as Record<string, unknown> | undefined
            return `${formatLabel(reading.data.utilityType)} ${String(reading.data.billingMonth ?? '')}: detected ${String(ocr?.detectedReading ?? '-')}, final ${String(reading.data.currentReading ?? '-')}`
          }),
        ),
      ].join('\n')
    }
  }

  if (intent === 'tenant_count') {
    const tenants = await getOwnerRows('tenants', ownerId)
    const active = tenants.filter((tenant) => tenant.data.status === 'active')
    answer = `You have ${tenants.length} tenant(s), including ${active.length} active tenant(s).`
  }

  if (intent === 'feedback_actions') {
    const feedbacks = (await getOwnerRows('feedbacks', ownerId)).filter((feedback) => {
      const status = String(feedback.data.status ?? 'new')
      return status === 'new' || status === 'in_review'
    })
    const actionCounts = new Map<string, number>()
    feedbacks.forEach((feedback) => {
      const action = getRecommendationAction(feedback.data)
      actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1)
    })
    const actions = [...actionCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5)
    answer = actions.length
      ? `Recommended actions for current tenant complaints:\n${actions.map(([action, count]) => `- ${action}: ${count} feedback item(s)`).join('\n')}`
      : 'There are no unresolved feedback actions right now.'
  }

  if (intent === 'maintenance_issues') {
    const feedbacks = await getOwnerRows('feedbacks', ownerId)
    const maintenance = feedbacks.filter((feedback) => getRecommendationAction(feedback.data) === 'Maintenance Inspection' || feedback.data.category === 'maintenance' || feedback.data.aiSuggestedCategory === 'maintenance')
    answer = maintenance.length
      ? `${maintenance.length} maintenance-related feedback item(s) were found:\n${maintenance.slice(0, 8).map((feedback) => `- ${String(feedback.data.title ?? feedback.id)}`).join('\n')}`
      : 'No maintenance-related feedback has been detected yet.'
  }

  if (intent === 'resolution_statistics') {
    const feedbacks = await getOwnerRows('feedbacks', ownerId)
    const actionCounts = new Map<string, number>()
    feedbacks.forEach((feedback) => {
      const action = getRecommendationAction(feedback.data)
      actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1)
    })
    const rows = [...actionCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6)
    answer = rows.length
      ? `AI resolution statistics:\n${rows.map(([action, count]) => `- ${action}: ${count}`).join('\n')}`
      : 'No AI resolution statistics are available yet.'
  }

  return answer
}

export async function getOwnerAIConversations(ownerId: string): Promise<AssistantConversation[]> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. AI history and chat persistence are disabled.')
    return []
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((item) =>
    mapConversation(item.id, {
      ownerId: item.owner_id,
      title: item.title,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }),
  )
}

export async function getAssistantMessages(conversationId: string, pageSize = 50): Promise<AssistantMessageRecord[]> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. AI history and chat persistence are disabled.')
    return []
  }

  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(pageSize)

  if (error) throw error

  return (data ?? []).map((item) =>
    mapMessage(item.id, {
      conversationId: item.conversation_id,
      role: item.role,
      content: item.content,
      createdAt: item.created_at,
    }),
  )
}

export async function createAssistantConversation(ownerId: string, title = 'New Conversation') {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. AI history and chat persistence are disabled.')
    const now = new Date().toISOString()

    return {
      id: `local-${Date.now()}-${Math.random()}`,
      ownerId,
      title,
      createdAt: now,
      updatedAt: now,
    }
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ owner_id: ownerId, title })
    .select('*')
    .single()

  if (error) throw error

  return mapConversation(data.id, {
    ownerId: data.owner_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })
}

export async function updateAssistantConversationTitle(
  conversationId: string,
  ownerId: string,
  title: string,
): Promise<AssistantConversation> {
  const nextTitle = title.trim() || 'New Conversation'

  if (!supabase || !isSupabaseConfigured || conversationId.startsWith('local-')) {
    const now = new Date().toISOString()

    return {
      id: conversationId,
      ownerId,
      title: nextTitle,
      updatedAt: now,
    }
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ title: nextTitle, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('owner_id', ownerId)
    .select('*')
    .single()

  if (error) throw error

  return mapConversation(data.id, {
    ownerId: data.owner_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })
}

export async function deleteAssistantConversation(conversationId: string, ownerId: string) {
  if (!supabase || !isSupabaseConfigured || conversationId.startsWith('local-')) {
    return
  }

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('owner_id', ownerId)

  if (error) throw error
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

  const answer = await generateOwnerAnswer(ownerId, intent)
  const title = conversation.title === 'New Conversation' ? getConversationTitle(intent, trimmedQuestion) : conversation.title

  let userMessage: AssistantMessageRecord
  let assistantMessage: AssistantMessageRecord

  if (supabase && isSupabaseConfigured) {
    const [userResult, assistantResult] = await Promise.all([
      supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversation.id,
          owner_id: ownerId,
          role: 'user',
          content: trimmedQuestion,
          intent,
        })
        .select('*')
        .single(),
      supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversation.id,
          owner_id: ownerId,
          role: 'assistant',
          content: answer,
          intent,
        })
        .select('*')
        .single(),
    ])

    if (userResult.error) throw userResult.error
    if (assistantResult.error) throw assistantResult.error

    userMessage = mapMessage(userResult.data.id, {
      conversationId: userResult.data.conversation_id,
      role: userResult.data.role,
      content: userResult.data.content,
      createdAt: userResult.data.created_at,
    })
    assistantMessage = mapMessage(assistantResult.data.id, {
      conversationId: assistantResult.data.conversation_id,
      role: assistantResult.data.role,
      content: assistantResult.data.content,
      createdAt: assistantResult.data.created_at,
    })

    const now = new Date().toISOString()
    await supabase
      .from('ai_conversations')
      .update({ title, updated_at: now })
      .eq('id', conversation.id)
      .eq('owner_id', ownerId)
    await supabase.from('ai_usage_logs').insert({
      owner_id: ownerId,
      conversation_id: conversation.id,
      question: trimmedQuestion,
      intent,
      answer_preview: answer.slice(0, 240),
    })
  } else {
    userMessage = {
      id: `user-${Date.now()}-${Math.random()}`,
      conversationId: conversation.id,
      role: 'user',
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    }
    assistantMessage = {
      id: `assistant-${Date.now()}-${Math.random()}`,
      conversationId: conversation.id,
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    }
  }

  conversation = {
    ...conversation,
    title,
    updatedAt: new Date().toISOString(),
  }

  return {
    intent,
    answer,
    conversation,
    userMessage,
    assistantMessage,
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
