import type { UserRole } from '../../types/user'

export type AdminUser = {
  id: string
  uid: string
  fullName: string
  email: string
  role: UserRole
  createdAt?: unknown
  updatedAt?: unknown
}

export type AdminActivity = {
  id: string
  icon: string
  title: string
  timestamp: string
  sortValue: number
}

export type AdminDashboardStats = {
  totalUsers: number
  totalOwners: number
  totalAdmins: number
  totalTenants: number
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  totalContracts: number
  activeContracts: number
  totalInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  totalFeedbacks: number
  unreadNotifications: number
  monthlyRevenue: number
  yearlyRevenue: number
  totalRevenue: number
  databaseCollections: number
  totalDocuments: number
  storageEstimate: string
  recentRegistrations: AdminActivity[]
  platformActivities: AdminActivity[]
}

export type OwnerSummary = {
  user: AdminUser
  totalRooms: number
  totalTenants: number
  totalContracts: number
}

export type TenantSummary = {
  user: AdminUser
  tenantName: string
  email: string
  room: string
  contractStatus: string
}
