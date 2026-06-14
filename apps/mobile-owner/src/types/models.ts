export type RoomStatus = 'available' | 'occupied' | 'maintenance'
export type TenantStatus = 'active' | 'inactive' | 'pending'
export type ContractStatus = 'active' | 'expired' | 'terminated' | 'pending'
export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'overdue' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed'
export type PaymentMethod = 'manual' | 'demo_vietqr'
export type QRProvider = 'vietqr_demo'
export type UtilityType = 'electricity' | 'water'
export type UtilityReadingStatus = 'draft' | 'confirmed' | 'billed' | 'paid' | 'billed_paid'
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

export interface FeedbackAIConfidence {
  sentiment?: number
  category?: number
  priority?: number
}

export interface UtilityReadingOCRMetadata {
  used: boolean
  templateId?: string
  meterType: UtilityType
  detectedReading: number | null
  finalReading?: number | null
  confidence: number | null
  rawText: string | null
  roiUsed?: boolean
  imageName?: string
  verifiedByOwner: boolean
  createdAt?: unknown
}

export interface OCRNormalizedRoi {
  xRatio: number
  yRatio: number
  widthRatio: number
  heightRatio: number
}

export interface OCRMeterTemplate {
  id: string
  ownerId: string
  meterType: UtilityType
  name: string
  sampleCount: number
  normalizedRoi: OCRNormalizedRoi
}

export interface Room {
  id: string
  ownerId: string
  roomNumber: string
  floor?: number
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
  identityNumber?: string
  moveInDate?: string
  status: TenantStatus
}

export interface Contract {
  id: string
  ownerId: string
  tenantId: string
  roomId: string
  contractCode: string
  startDate?: string
  endDate: string
  monthlyRent?: number
  deposit?: number
  paymentDueDay?: number
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
  issueDate?: string
  dueDate?: string
  items?: InvoiceItem[]
  subtotal?: number
  discount?: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod
  paymentReference?: string
  paidAt?: unknown
  qrProvider?: QRProvider
  qrPayload?: string | null
  ocr?: UtilityReadingOCRMetadata | null
  note?: string
}

export interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface UtilityReading {
  id: string
  ownerId: string
  roomId: string
  tenantId?: string
  utilityType: UtilityType
  billingMonth: string
  previousReading?: number
  currentReading?: number
  usage: number
  unitPrice?: number
  totalAmount: number
  status: UtilityReadingStatus
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod
  paymentReference?: string | null
  paidAt?: unknown
  paidAmount?: number
  qrProvider?: QRProvider
  qrPayload?: string | null
  ocr?: UtilityReadingOCRMetadata | null
  note?: string
}

export interface Feedback {
  id: string
  ownerId: string
  tenantId?: string
  roomId?: string
  title: string
  category?: FeedbackCategory | null
  priority?: FeedbackPriority | null
  sentiment?: SentimentLabel | null
  status: FeedbackStatus
  content?: string
  ownerResponse?: string
  aiGenerated?: boolean
  aiSummary?: string | null
  aiSuggestedCategory?: FeedbackCategory | null
  aiSuggestedPriority?: FeedbackPriority | null
  aiSuggestedResolution?: string | null
  aiSuggestedReply?: string | null
  aiConfidence?: FeedbackAIConfidence | null
  aiError?: string | null
  createdAt?: unknown
}

export interface TenantWithRoom extends Tenant {
  room?: Room | null
}

export interface RoomFormValues {
  roomNumber: string
  floor: number
  roomType: string
  area: number
  price: number
  deposit: number
  maxTenants: number
  status: RoomStatus
  description?: string
}

export interface TenantFormValues {
  roomId: string
  fullName: string
  email: string
  phone: string
  identityNumber: string
  moveInDate: string
  status: TenantStatus
}

export interface InvoiceFormValues {
  tenantId: string
  roomId: string
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

export interface UtilityReadingFormValues {
  roomId: string
  tenantId?: string
  utilityType: UtilityType
  billingMonth: string
  previousReading: number
  currentReading: number
  unitPrice: number
  status: UtilityReadingStatus
  note?: string
  ocr?: UtilityReadingOCRMetadata
}
