import {
  collection,
  onSnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import { formatCurrency, formatDate } from '../../../utils/format'
import type { UserRole } from '../../../types/user'
import type { AdminActivity, AdminDashboardStats, AdminUser } from '../types'

type AdminCollectionKey =
  | 'users'
  | 'rooms'
  | 'tenants'
  | 'contracts'
  | 'invoices'
  | 'utilityReadings'
  | 'feedbacks'
  | 'notifications'

type AdminCollections = Record<AdminCollectionKey, QueryDocumentSnapshot<DocumentData>[]>

const collectionNames: AdminCollectionKey[] = [
  'users',
  'rooms',
  'tenants',
  'contracts',
  'invoices',
  'utilityReadings',
  'feedbacks',
  'notifications',
]

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'owner' || value === 'tenant'
}

export function mapAdminUser(
  documentId: string,
  data: DocumentData,
): AdminUser {
  return {
    id: documentId,
    uid: String(data.uid ?? documentId),
    fullName: String(data.fullName ?? 'User'),
    email: String(data.email ?? ''),
    role: isUserRole(data.role) ? data.role : 'tenant',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function getTimestampValue(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
  }

  return 0
}

function isCurrentMonth(value: unknown) {
  const timestamp = getTimestampValue(value)

  if (!timestamp) return false

  const date = new Date(timestamp)
  const now = new Date()

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function isCurrentYear(value: unknown) {
  const timestamp = getTimestampValue(value)

  if (!timestamp) return false

  return new Date(timestamp).getFullYear() === new Date().getFullYear()
}

function getDocumentActivity(
  id: string,
  icon: string,
  title: string,
  createdAt: unknown,
): AdminActivity {
  const sortValue = getTimestampValue(createdAt)

  return {
    id,
    icon,
    title,
    timestamp: sortValue ? formatDate(createdAt) : 'Recently',
    sortValue,
  }
}

function getRegistrationActivity(user: AdminUser): AdminActivity {
  const roleLabel =
    user.role === 'owner'
      ? 'Owner account created'
      : user.role === 'admin'
        ? 'Admin account created'
        : 'New tenant registered'

  return getDocumentActivity(
    `user-${user.id}`,
    user.role === 'owner' ? 'O' : user.role === 'admin' ? 'A' : 'T',
    `${roleLabel}: ${user.fullName}`,
    user.createdAt,
  )
}

function createPlatformActivities(collections: AdminCollections, users: AdminUser[]) {
  const activities: AdminActivity[] = [
    ...users.map(getRegistrationActivity),
    ...collections.contracts.map((contractDoc) => {
      const data = contractDoc.data()
      return getDocumentActivity(
        `contract-${contractDoc.id}`,
        'C',
        `Contract created: ${String(data.contractCode ?? contractDoc.id)}`,
        data.createdAt,
      )
    }),
    ...collections.invoices.map((invoiceDoc) => {
      const data = invoiceDoc.data()
      return getDocumentActivity(
        `invoice-${invoiceDoc.id}`,
        '$',
        `Invoice generated: ${String(data.invoiceCode ?? invoiceDoc.id)}`,
        data.createdAt,
      )
    }),
    ...collections.feedbacks.map((feedbackDoc) => {
      const data = feedbackDoc.data()
      return getDocumentActivity(
        `feedback-${feedbackDoc.id}`,
        'F',
        `Feedback submitted: ${String(data.title ?? feedbackDoc.id)}`,
        data.createdAt,
      )
    }),
  ]

  return activities
    .sort((left, right) => right.sortValue - left.sortValue)
    .slice(0, 20)
}

function getPaidInvoiceDate(data: DocumentData) {
  return data.updatedAt ?? data.createdAt ?? data.issueDate
}

function calculateStorageEstimate(totalDocuments: number) {
  const estimatedKb = totalDocuments * 2

  if (estimatedKb < 1024) {
    return `${estimatedKb} KB`
  }

  return `${(estimatedKb / 1024).toFixed(1)} MB`
}

function calculateDashboardStats(collections: AdminCollections): AdminDashboardStats {
  const users = collections.users.map((userDoc) =>
    mapAdminUser(userDoc.id, userDoc.data()),
  )
  const paidInvoices = collections.invoices.filter(
    (invoiceDoc) => invoiceDoc.data().status === 'paid',
  )
  const totalDocuments = collectionNames.reduce(
    (sum, collectionName) => sum + collections[collectionName].length,
    0,
  )
  const recentRegistrations = users
    .map(getRegistrationActivity)
    .sort((left, right) => right.sortValue - left.sortValue)
    .slice(0, 10)

  return {
    totalUsers: users.length,
    totalOwners: users.filter((user) => user.role === 'owner').length,
    totalAdmins: users.filter((user) => user.role === 'admin').length,
    totalTenants: users.filter((user) => user.role === 'tenant').length,
    totalRooms: collections.rooms.length,
    occupiedRooms: collections.rooms.filter(
      (roomDoc) => roomDoc.data().status === 'occupied',
    ).length,
    vacantRooms: collections.rooms.filter((roomDoc) => {
      const status = roomDoc.data().status
      return status === 'available' || status === 'vacant'
    }).length,
    totalContracts: collections.contracts.length,
    activeContracts: collections.contracts.filter(
      (contractDoc) => contractDoc.data().status === 'active',
    ).length,
    totalInvoices: collections.invoices.length,
    pendingInvoices: collections.invoices.filter((invoiceDoc) => {
      const status = invoiceDoc.data().status
      return status === 'pending' || status === 'unpaid' || status === 'draft'
    }).length,
    overdueInvoices: collections.invoices.filter(
      (invoiceDoc) => invoiceDoc.data().status === 'overdue',
    ).length,
    totalFeedbacks: collections.feedbacks.length,
    unreadNotifications: collections.notifications.filter(
      (notificationDoc) => notificationDoc.data().read === false,
    ).length,
    monthlyRevenue: paidInvoices
      .filter((invoiceDoc) => isCurrentMonth(getPaidInvoiceDate(invoiceDoc.data())))
      .reduce((sum, invoiceDoc) => sum + Number(invoiceDoc.data().totalAmount ?? 0), 0),
    yearlyRevenue: paidInvoices
      .filter((invoiceDoc) => isCurrentYear(getPaidInvoiceDate(invoiceDoc.data())))
      .reduce((sum, invoiceDoc) => sum + Number(invoiceDoc.data().totalAmount ?? 0), 0),
    totalRevenue: paidInvoices.reduce(
      (sum, invoiceDoc) => sum + Number(invoiceDoc.data().totalAmount ?? 0),
      0,
    ),
    databaseCollections: collectionNames.length,
    totalDocuments,
    storageEstimate: calculateStorageEstimate(totalDocuments),
    recentRegistrations,
    platformActivities: createPlatformActivities(collections, users),
  }
}

export function subscribeToAdminDashboard(
  callback: (stats: AdminDashboardStats) => void,
  onError?: (error: unknown) => void,
): () => void {
  const collections: AdminCollections = {
    users: [],
    rooms: [],
    tenants: [],
    contracts: [],
    invoices: [],
    utilityReadings: [],
    feedbacks: [],
    notifications: [],
  }
  const loadedCollections = new Set<AdminCollectionKey>()
  const unsubscribers: Unsubscribe[] = collectionNames.map((collectionName) =>
    onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        collections[collectionName] = snapshot.docs
        loadedCollections.add(collectionName)

        if (loadedCollections.size === collectionNames.length) {
          callback(calculateDashboardStats(collections))
        }
      },
      (error) => {
        console.error(`Unable to load ${collectionName} for admin dashboard.`, error)
        onError?.(error)
      },
    ),
  )

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}

export { formatCurrency }
