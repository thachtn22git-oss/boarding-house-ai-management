import type { UserRole } from '../../types/user'

export type AuthMode = 'login' | 'register'

export type LoginFormValues = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  role: UserRole
}
