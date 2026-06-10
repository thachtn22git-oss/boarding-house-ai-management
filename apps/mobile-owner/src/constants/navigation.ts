export type OwnerTabKey =
  | 'dashboard'
  | 'rooms'
  | 'invoices'
  | 'feedback'
  | 'more'
  | 'tenants'
  | 'contracts'
  | 'utilities'
  | 'notifications'
  | 'profile'

export interface NavigationItem {
  key: OwnerTabKey
  label: string
}

export const ownerTabs: NavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'more', label: 'More' },
]

export const ownerMoreItems: NavigationItem[] = [
  { key: 'tenants', label: 'Tenants' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'profile', label: 'Profile' },
]
