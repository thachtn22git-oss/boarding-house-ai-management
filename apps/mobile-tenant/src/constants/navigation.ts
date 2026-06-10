export type TenantTabKey =
  | 'home'
  | 'invoices'
  | 'feedback'
  | 'chat'
  | 'notifications'
  | 'more'
  | 'room'
  | 'contract'
  | 'utilities'
  | 'profile'

export interface NavigationItem {
  key: TenantTabKey
  label: string
}

export const tenantTabs: NavigationItem[] = [
  { key: 'home', label: 'Home' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'chat', label: 'Chat' },
  { key: 'more', label: 'More' },
]

export const tenantMoreItems: NavigationItem[] = [
  { key: 'room', label: 'My Room' },
  { key: 'contract', label: 'My Contract' },
  { key: 'utilities', label: 'My Utilities' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'profile', label: 'Profile' },
]
