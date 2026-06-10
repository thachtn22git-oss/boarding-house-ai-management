import type { Contract } from '../contracts/types'
import type {
  FeedbackCategory,
  Feedback,
} from '../feedbacks/types'
import type { Invoice } from '../invoices/types'
import type { Room } from '../rooms/types'
import type { Tenant } from '../tenants/types'
import type { UtilityReading } from '../utilities/types'

export type TenantPortalData = {
  tenant: Tenant | null
  room: Room | null
  activeContract: Contract | null
  invoices: Invoice[]
  utilities: UtilityReading[]
  feedbacks: Feedback[]
}

export type TenantFeedbackFormValues = {
  title: string
  content: string
  category?: FeedbackCategory
}
