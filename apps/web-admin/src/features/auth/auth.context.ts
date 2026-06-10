import { createContext } from 'react'

import type { AppUser, UserRole } from '../../types/user'

export type RegisterInput = {
  fullName: string
  email: string
  password: string
  role: UserRole
}

export type AuthContextValue = {
  currentUser: AppUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AppUser>
  register: (input: RegisterInput) => Promise<AppUser>
  logout: () => Promise<void>
}

export const authContext = createContext<AuthContextValue | null>(null)
