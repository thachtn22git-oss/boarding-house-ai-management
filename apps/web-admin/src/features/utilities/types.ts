import type { Timestamp } from 'firebase/firestore'

export type UtilityType = 'electricity' | 'water'

export type UtilityReadingStatus = 'draft' | 'confirmed' | 'billed' | 'paid' | 'billed_paid'
export type UtilityPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed'
export type UtilityPaymentMethod = 'manual' | 'demo_vietqr'
export type UtilityQRProvider = 'vietqr_demo'

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
  unitPrice: number
  totalAmount: number
  status: UtilityReadingStatus
  paymentStatus?: UtilityPaymentStatus
  paymentMethod?: UtilityPaymentMethod
  paymentReference?: string | null
  paidAt?: Timestamp | null
  paidAmount?: number
  qrProvider?: UtilityQRProvider
  qrPayload?: string | null
  note?: string
  createdAt?: unknown
  updatedAt?: unknown
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
}
