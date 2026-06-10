export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface Invoice {
  id: string
  ownerId: string
  tenantId: string
  roomId: string
  contractId?: string
  invoiceCode: string
  billingMonth: string
  issueDate: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  note?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface InvoiceFormValues {
  tenantId: string
  roomId: string
  contractId?: string
  invoiceCode: string
  billingMonth: string
  issueDate: string
  dueDate: string
  items: InvoiceItem[]
  discount: number
  paidAmount: number
  status: InvoiceStatus
  note?: string
}
