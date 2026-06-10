export type RoomStatus = 'available' | 'occupied' | 'maintenance'
export type TenantStatus = 'active' | 'inactive' | 'pending'
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
export type SentimentLabel = 'positive' | 'neutral' | 'negative'

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
  phone?: string
  status: TenantStatus
}

export interface Contract {
  id: string
  ownerId: string
  tenantId: string
  roomId: string
  contractCode: string
  endDate: string
  status: ContractStatus
}

export interface Invoice {
  id: string
  ownerId: string
  tenantId: string
  roomId: string
  invoiceCode: string
  billingMonth: string
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
  category?: FeedbackCategory
  priority: FeedbackPriority
  sentiment?: SentimentLabel
  status: FeedbackStatus
}

export interface TenantWithRoom extends Tenant {
  room?: Room | null
}
