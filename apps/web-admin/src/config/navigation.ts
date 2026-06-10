import type { UserRole } from '../types/user'

export type OwnerPageKey =
  | 'dashboard'
  | 'rooms'
  | 'tenants'
  | 'contracts'
  | 'invoices'
  | 'utilities'
  | 'feedback'
  | 'notifications'
  | 'chat'
  | 'analytics'
  | 'aiAssistant'

export type NavigationItem = {
  key: string
  label: string
  shortLabel: string
  path: string
  description: string
  portalLabel: string
}

export const appLabels = {
  productName: 'Boarding House AI',
  adminPortal: 'Admin Portal',
  ownerPortal: 'Owner Portal',
  tenantPortal: 'Tenant Portal',
} as const

export const rolePortalLabels: Record<UserRole, string> = {
  admin: appLabels.adminPortal,
  owner: appLabels.ownerPortal,
  tenant: appLabels.tenantPortal,
}

export const ownerPages: NavigationItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'DB',
    path: '/owner/dashboard',
    description:
      'Key metrics and recent boarding house activity will be shown here.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'rooms',
    label: 'Room Management',
    shortLabel: 'RM',
    path: '/owner/rooms',
    description: 'Manage rooms, pricing, status, and availability.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'tenants',
    label: 'Tenants',
    shortLabel: 'TN',
    path: '/owner/tenants',
    description:
      'Manage tenant profiles, contact information, and rental status.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'contracts',
    label: 'Contracts',
    shortLabel: 'CT',
    path: '/owner/contracts',
    description: 'Create, review, and manage rental contracts.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    shortLabel: 'IN',
    path: '/owner/invoices',
    description: 'Generate and track monthly invoices and payment status.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'utilities',
    label: 'Utilities',
    shortLabel: 'UT',
    path: '/owner/utilities',
    description:
      'Record electricity and water readings, including OCR-based input.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'feedback',
    label: 'Feedback',
    shortLabel: 'FB',
    path: '/owner/feedback',
    description:
      'Review tenant feedback, complaints, and satisfaction analysis.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    shortLabel: 'NT',
    path: '/owner/notifications',
    description: 'View system updates and important alerts.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'chat',
    label: 'Chat',
    shortLabel: 'CH',
    path: '/owner/chat',
    description: 'Send realtime messages to tenants and review conversations.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    shortLabel: 'AN',
    path: '/owner/analytics',
    description: 'Analyze revenue, occupancy, invoices, feedback, and utilities.',
    portalLabel: appLabels.ownerPortal,
  },
  {
    key: 'aiAssistant',
    label: 'AI Assistant',
    shortLabel: 'AI',
    path: '/owner/ai-assistant',
    description:
      'Ask questions, analyze data, and get smart management suggestions.',
    portalLabel: appLabels.ownerPortal,
  },
]

export const adminPages: NavigationItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'DB',
    path: '/admin/dashboard',
    description:
      'Monitor platform operations, registrations, and system-wide activity.',
    portalLabel: appLabels.adminPortal,
  },
  {
    key: 'users',
    label: 'Users',
    shortLabel: 'US',
    path: '/admin/users',
    description: 'Manage user accounts, roles, and access status.',
    portalLabel: appLabels.adminPortal,
  },
  {
    key: 'owners',
    label: 'Owners',
    shortLabel: 'OW',
    path: '/admin/owners',
    description: 'Manage owner accounts and platform access.',
    portalLabel: appLabels.adminPortal,
  },
  {
    key: 'tenants',
    label: 'Tenants',
    shortLabel: 'TN',
    path: '/admin/tenants',
    description: 'Review tenant records, room assignments, and contract status.',
    portalLabel: appLabels.adminPortal,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    shortLabel: 'NT',
    path: '/admin/notifications',
    description: 'View system updates and important alerts.',
    portalLabel: appLabels.adminPortal,
  },
  {
    key: 'chat',
    label: 'Chat',
    shortLabel: 'CH',
    path: '/admin/chat',
    description: 'Monitor chat workflows and future moderation tools.',
    portalLabel: appLabels.adminPortal,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    shortLabel: 'AN',
    path: '/admin/analytics',
    description: 'Analyze platform revenue, occupancy, invoices, feedback, and utilities.',
    portalLabel: appLabels.adminPortal,
  },
  {
    key: 'systemOverview',
    label: 'System Overview',
    shortLabel: 'SO',
    path: '/admin/system-overview',
    description: 'Review platform health, collections, and document totals.',
    portalLabel: appLabels.adminPortal,
  },
]

export const tenantPages: NavigationItem[] = [
  {
    key: 'home',
    label: 'Home',
    shortLabel: 'HM',
    path: '/tenant/home',
    description:
      'Review your room, invoices, utilities, notifications, and quick actions.',
    portalLabel: appLabels.tenantPortal,
  },
  {
    key: 'myRoom',
    label: 'My Room',
    shortLabel: 'MR',
    path: '/tenant/my-room',
    description: 'View your assigned room and occupancy details.',
    portalLabel: appLabels.tenantPortal,
  },
  {
    key: 'myContract',
    label: 'My Contract',
    shortLabel: 'MC',
    path: '/tenant/my-contract',
    description: 'Review your rental contract and renewal status.',
    portalLabel: appLabels.tenantPortal,
  },
  {
    key: 'myInvoices',
    label: 'My Invoices',
    shortLabel: 'MI',
    path: '/tenant/my-invoices',
    description: 'Track invoices, balances, and payment status.',
    portalLabel: appLabels.tenantPortal,
  },
  {
    key: 'myUtilities',
    label: 'My Utilities',
    shortLabel: 'UT',
    path: '/tenant/my-utilities',
    description: 'Review your electricity, water, and utility charges.',
    portalLabel: appLabels.tenantPortal,
  },
  {
    key: 'myFeedback',
    label: 'My Feedback',
    shortLabel: 'FB',
    path: '/tenant/my-feedback',
    description: 'Submit feedback and review previous requests.',
    portalLabel: appLabels.tenantPortal,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    shortLabel: 'NT',
    path: '/tenant/notifications',
    description: 'View system updates and important alerts.',
    portalLabel: appLabels.tenantPortal,
  },
  {
    key: 'chat',
    label: 'Chat',
    shortLabel: 'CH',
    path: '/tenant/chat',
    description: 'Send realtime messages to your owner and other tenants.',
    portalLabel: appLabels.tenantPortal,
  },
]

const routePages = [...ownerPages, ...adminPages, ...tenantPages]

export const navigationByRole: Record<UserRole, NavigationItem[]> = {
  admin: adminPages,
  owner: ownerPages,
  tenant: tenantPages,
}

export function getOwnerPage(pageKey: OwnerPageKey) {
  return ownerPages.find((page) => page.key === pageKey) ?? ownerPages[0]
}

export function getOwnerPageByPath(pathname: string) {
  return ownerPages.find((page) => pathname.startsWith(page.path)) ?? ownerPages[0]
}

export function getPageByPath(pathname: string) {
  return routePages.find((page) => pathname.startsWith(page.path)) ?? ownerPages[0]
}

export function getNavigationForRole(role: UserRole | undefined) {
  return role ? navigationByRole[role] : []
}

export function getPortalLabelForRole(role: UserRole | undefined) {
  return role ? rolePortalLabels[role] : appLabels.adminPortal
}
