export type RoomStatus = 'available' | 'occupied' | 'maintenance'
export type ContractStatus = 'active' | 'expired' | 'terminated' | 'pending'
export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'overdue' | 'cancelled'
export type UtilityType = 'electricity' | 'water'
export type UtilityReadingStatus = 'draft' | 'confirmed' | 'billed'
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

export interface Room {
  id: string
  ownerId: string
  roomNumber: string
  roomType: string
  area?: number
  price?: number
  deposit?: number
  maxTenants?: number
  status: RoomStatus
  description?: string
}

export interface Tenant {
  id: string
  ownerId: string
  roomId: string
  fullName: string
  email: string
  status?: string
}

export interface Contract {
  id: string
  ownerId: string
  tenantId: string
  roomId: string
  contractCode: string
  startDate: string
  endDate: string
  monthlyRent: number
  deposit: number
  paymentDueDay: number
  status: ContractStatus
  terms?: string
}

export interface Invoice {
  id: string
  ownerId: string
  tenantId: string
  roomId: string
  invoiceCode: string
  billingMonth: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
}

export interface UtilityReading {
  id: string
  ownerId: string
  roomId: string
  tenantId?: string
  utilityType: UtilityType
  billingMonth: string
  previousReading: number
  currentReading: number
  usage: number
  totalAmount: number
  status: UtilityReadingStatus
}

export interface Feedback {
  id: string
  ownerId: string
  tenantId?: string
  roomId?: string
  title: string
  content: string
  category: FeedbackCategory
  priority: FeedbackPriority
  status: FeedbackStatus
  sentiment?: 'positive' | 'neutral' | 'negative'
  ownerResponse?: string
  aiSummary?: string
  createdAt?: unknown
}
