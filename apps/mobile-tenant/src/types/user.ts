export type UserRole = 'admin' | 'owner' | 'tenant'

export interface AppUser {
  uid: string
  fullName: string
  email: string
  role: UserRole
}
