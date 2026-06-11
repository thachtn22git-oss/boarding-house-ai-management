import { addDoc, collection, getDocs, query, serverTimestamp, where, type DocumentData } from 'firebase/firestore'
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

type Row = {
  id: string
  data: DocumentData
}

function detectIntent(question: string): AssistantIntent {
  const text = question.toLowerCase()

  if (text.includes('available') || text.includes('vacant')) return 'room_availability'
  if (text.includes('revenue') || text.includes('earn')) return 'monthly_revenue'
  if (text.includes('overdue') || text.includes('unpaid') || text.includes('not paid')) return 'overdue_invoices'
  if (text.includes('expire') || text.includes('ending')) return 'expiring_contracts'
  if (text.includes('urgent') || text.includes('attention') || text.includes('serious')) return 'urgent_feedback'
  if (text.includes('complaints') || text.includes('feedback') || text.includes('common issues')) return 'feedback_summary'
  if (text.includes('electricity') || text.includes('water') || text.includes('utility')) return 'utility_summary'
  if (text.includes('tenant')) return 'tenant_count'

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

export async function answerOwnerQuestion(ownerId: string, question: string) {
  const intent = detectIntent(question)
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

  void addDoc(collection(db, 'aiAssistantLogs'), {
    ownerId,
    question,
    intent,
    answer,
    createdAt: serverTimestamp(),
  }).catch((error) => console.warn('Unable to save AI assistant log.', error))

  return { intent, answer }
}
