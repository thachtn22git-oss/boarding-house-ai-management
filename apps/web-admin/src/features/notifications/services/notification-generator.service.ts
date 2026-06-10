import type { Contract } from '../../contracts/types'
import type { Feedback } from '../../feedbacks/types'
import type { Invoice } from '../../invoices/types'
import type { UtilityReading } from '../../utilities/types'
import { createNotification } from './notification.service'

function isContractExpiringSoon(contract: Contract) {
  if (contract.status !== 'active' || !contract.endDate) {
    return false
  }

  const endTime = new Date(contract.endDate).getTime()

  if (Number.isNaN(endTime)) {
    return false
  }

  const now = new Date()
  const inThirtyDays = new Date()
  inThirtyDays.setDate(now.getDate() + 30)

  return endTime >= now.getTime() && endTime <= inThirtyDays.getTime()
}

export async function generateOwnerContractExpiringNotification(
  ownerUserId: string,
  contract: Contract,
) {
  if (!isContractExpiringSoon(contract)) {
    return null
  }

  return createNotification({
    userId: ownerUserId,
    role: 'owner',
    type: 'contract',
    priority: 'high',
    title: 'Contract Expiring Soon',
    message: `Contract ${contract.contractCode} will expire within 30 days.`,
    actionUrl: '/owner/contracts',
  })
}

export async function generateOwnerOverdueInvoiceNotification(
  ownerUserId: string,
  invoice: Invoice,
) {
  if (invoice.status !== 'overdue') {
    return null
  }

  return createNotification({
    userId: ownerUserId,
    role: 'owner',
    type: 'invoice',
    priority: 'urgent',
    title: 'Overdue Invoice',
    message: `Invoice ${invoice.invoiceCode} is overdue.`,
    actionUrl: '/owner/invoices',
  })
}

export async function generateOwnerNewFeedbackNotification(
  ownerUserId: string,
  feedback: Feedback,
) {
  if (feedback.status !== 'new') {
    return null
  }

  return createNotification({
    userId: ownerUserId,
    role: 'owner',
    type: 'feedback',
    priority: 'medium',
    title: 'New Tenant Feedback',
    message: 'A new feedback has been submitted.',
    actionUrl: '/owner/feedback',
  })
}

export async function generateOwnerUtilityConfirmedNotification(
  ownerUserId: string,
  reading: UtilityReading,
) {
  if (reading.status !== 'confirmed') {
    return null
  }

  return createNotification({
    userId: ownerUserId,
    role: 'owner',
    type: 'utility',
    priority: 'low',
    title: 'Utility Reading Confirmed',
    message: 'Utility reading has been confirmed.',
    actionUrl: '/owner/utilities',
  })
}

export async function generateTenantNewInvoiceNotification(
  tenantUserId: string,
  invoice: Invoice,
) {
  void invoice

  return createNotification({
    userId: tenantUserId,
    role: 'tenant',
    type: 'invoice',
    priority: 'high',
    title: 'New Invoice Available',
    message: 'Your monthly invoice is ready.',
    actionUrl: '/tenant/my-invoices',
  })
}

export async function generateTenantContractExpiringNotification(
  tenantUserId: string,
  contract: Contract,
) {
  if (!isContractExpiringSoon(contract)) {
    return null
  }

  return createNotification({
    userId: tenantUserId,
    role: 'tenant',
    type: 'contract',
    priority: 'high',
    title: 'Contract Expiring Soon',
    message: 'Your rental contract will expire soon.',
    actionUrl: '/tenant/my-contract',
  })
}

export async function generateTenantFeedbackResolvedNotification(
  tenantUserId: string,
  feedback: Feedback,
) {
  if (feedback.status !== 'resolved') {
    return null
  }

  return createNotification({
    userId: tenantUserId,
    role: 'tenant',
    type: 'feedback',
    priority: 'medium',
    title: 'Feedback Resolved',
    message: 'Your feedback has been reviewed and resolved.',
    actionUrl: '/tenant/my-feedback',
  })
}

export async function generateTenantUtilityBillUpdatedNotification(
  tenantUserId: string,
  reading: UtilityReading,
) {
  void reading

  return createNotification({
    userId: tenantUserId,
    role: 'tenant',
    type: 'utility',
    priority: 'medium',
    title: 'Utility Bill Updated',
    message: 'New utility charges have been recorded.',
    actionUrl: '/tenant/my-utilities',
  })
}
