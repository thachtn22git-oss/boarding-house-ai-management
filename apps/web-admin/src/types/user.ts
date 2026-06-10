import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'owner' | 'tenant'

export type AppUser = {
  uid: string
  fullName: string
  email: string
  role: UserRole
  tenantId?: string
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
}
