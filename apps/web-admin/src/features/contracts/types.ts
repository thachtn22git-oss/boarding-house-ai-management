export type ContractStatus = 'active' | 'expired' | 'terminated' | 'pending'

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
  createdAt?: unknown
  updatedAt?: unknown
}

export interface ContractFormValues {
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
