import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '../../features/auth/useAuth'

type AuthGuardProps = {
  children: ReactNode
}

function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <div className="route-loading">Loading...</div>
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default AuthGuard
