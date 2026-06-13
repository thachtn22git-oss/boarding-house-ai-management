export type PaymentDisplayStatus = 'paid' | 'unpaid' | 'pending' | 'failed' | 'overdue'
export type UtilityDisplayStatus = Exclude<PaymentDisplayStatus, 'overdue'>

type InvoiceLike = {
  status?: string
  paymentStatus?: string
  dueDate?: string
}

type UtilityLike = {
  status?: string
  paymentStatus?: string
}

function isPastDate(value?: string) {
  if (!value) return false

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date.getTime() < today.getTime()
}

export function getInvoiceDisplayStatus(invoice: InvoiceLike): PaymentDisplayStatus {
  if (invoice.paymentStatus === 'paid' || invoice.status === 'paid') return 'paid'
  if (invoice.paymentStatus === 'pending') return 'pending'
  if (invoice.paymentStatus === 'failed') return 'failed'
  if (invoice.status === 'overdue' || isPastDate(invoice.dueDate)) return 'overdue'

  return 'unpaid'
}

export function getUtilityDisplayStatus(utility: UtilityLike): UtilityDisplayStatus {
  if (
    utility.paymentStatus === 'paid' ||
    utility.status === 'paid' ||
    utility.status === 'billed_paid'
  ) {
    return 'paid'
  }

  if (utility.paymentStatus === 'pending') return 'pending'
  if (utility.paymentStatus === 'failed') return 'failed'

  return 'unpaid'
}
