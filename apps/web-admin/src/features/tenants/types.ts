export type TenantStatus = 'active' | 'inactive' | 'pending'

export interface Tenant {
  id: string
  ownerId: string
  roomId: string
  fullName: string
  email: string
  phone: string
  identityNumber: string
  dateOfBirth?: string
  address?: string
  status: TenantStatus
  moveInDate: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface TenantFormValues {
  roomId: string
  fullName: string
  email: string
  phone: string
  identityNumber: string
  dateOfBirth?: string
  address?: string
  status: TenantStatus
  moveInDate: string
}
