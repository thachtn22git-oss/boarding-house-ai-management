import type { UserRole } from '../../types/user'

export const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: 'Admin', value: 'admin' },
  { label: 'Owner', value: 'owner' },
  { label: 'Tenant', value: 'tenant' },
]

export const roleRedirects: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  owner: '/owner/dashboard',
  tenant: '/tenant/home',
}
