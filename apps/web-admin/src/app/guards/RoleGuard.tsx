import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '../../features/auth/useAuth'
import type { UserRole } from '../../types/user'

type RoleGuardProps = {
  allowedRoles: UserRole[]
  children: ReactNode
}

function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <div className="route-loading">Loading...</div>
  }

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default RoleGuard
