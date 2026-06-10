import { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { StatCard } from '../../components/cards/StatCard'
import { colors, spacing } from '../../constants/theme'
import { useAuth } from '../../providers/AuthProvider'
import { createTenantFeedback, getCurrentTenant, type TenantFeedbackValues, type TenantPortalData } from '../../services/tenantPortal.service'
import { formatCurrency, formatDate } from '../../utils/format'
import type { Feedback, Invoice, UtilityReading } from '../../types/models'

function useTenantPortalData() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<TenantPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      setData(await getCurrentTenant(currentUser))
    } catch (loadError) {
      console.warn('Tenant portal data load failed.', loadError)
      setError('Unable to load tenant data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return { data, loading, error, reload: loadData }
}

export function MyRoomScreen() {
  const { data, loading, error, reload } = useTenantPortalData()
  const room = data?.room

  return (
    <Screen loading={loading} onRefresh={reload} refreshing={loading} subtitle="Your current room information." title="My Room">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!room ? <Text style={styles.empty}>No room information available.</Text> : null}
      {room ? (
        <ListCard title={`Room ${room.roomNumber}`}>
          <Text style={styles.meta}>Room Type: {room.roomType}</Text>
          <Text style={styles.meta}>Floor: {room.floor ?? 'Not available'}</Text>
          <Text style={styles.meta}>Area: {room.area ?? 0} m2</Text>
          <Text style={styles.meta}>Monthly Price: {formatCurrency(room.price)}</Text>
          <Text style={styles.meta}>Deposit: {formatCurrency(room.deposit)}</Text>
          <Text style={styles.meta}>Max Tenants: {room.maxTenants ?? 0}</Text>
          <Text style={styles.meta}>Status: {room.status}</Text>
          <Text style={styles.meta}>Description: {room.description ?? 'Not available'}</Text>
        </ListCard>
      ) : null}
    </Screen>
  )
}

export function MyContractScreen() {
  const { data, loading, error, reload } = useTenantPortalData()
  const contract = data?.activeContract

  return (
    <Screen loading={loading} onRefresh={reload} refreshing={loading} subtitle="Your active rental contract." title="My Contract">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!contract ? <Text style={styles.empty}>No active contract found.</Text> : null}
      {contract ? (
        <ListCard title={contract.contractCode}>
          <Text style={styles.meta}>Start Date: {contract.startDate ?? 'Not available'}</Text>
          <Text style={styles.meta}>End Date: {contract.endDate}</Text>
          <Text style={styles.meta}>Monthly Rent: {formatCurrency(contract.monthlyRent)}</Text>
          <Text style={styles.meta}>Deposit: {formatCurrency(contract.deposit)}</Text>
          <Text style={styles.meta}>Payment Due Day: {contract.paymentDueDay ?? 'Not available'}</Text>
          <Text style={styles.meta}>Status: {contract.status}</Text>
          <Text style={styles.meta}>Terms: {contract.terms ?? 'Not available'}</Text>
          <PrimaryButton label="Print Contract" onPress={() => Alert.alert('Print Contract', 'Print is available on the web portal.')} />
        </ListCard>
      ) : null}
    </Screen>
  )
}

export function MyInvoicesScreen() {
  const { data, loading, error, reload } = useTenantPortalData()
  const invoices = data?.invoices ?? []
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  return (
    <Screen loading={loading} onRefresh={reload} refreshing={loading} subtitle="Your monthly invoices and payment status." title="My Invoices">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!invoices.length ? <Text style={styles.empty}>No invoices found.</Text> : null}
      {invoices.map((invoice) => (
        <ListCard key={invoice.id} title={invoice.invoiceCode}>
          <Text style={styles.meta}>Billing Month: {invoice.billingMonth}</Text>
          <Text style={styles.meta}>Due Date: {invoice.dueDate ?? 'Not available'}</Text>
          <Text style={styles.meta}>Total Amount: {formatCurrency(invoice.totalAmount)}</Text>
          <Text style={styles.meta}>Paid Amount: {formatCurrency(invoice.paidAmount)}</Text>
          <Text style={styles.meta}>Remaining Amount: {formatCurrency((invoice.totalAmount ?? 0) - (invoice.paidAmount ?? 0))}</Text>
          <Text style={styles.meta}>Status: {invoice.status}</Text>
          <View style={styles.actions}>
            <PrimaryButton label="View Details" onPress={() => setSelectedInvoice(invoice)} variant="secondary" />
            <PrimaryButton label="Confirm Payment" onPress={() => Alert.alert('Payment', 'Online payment will be implemented in a later phase.')} />
          </View>
        </ListCard>
      ))}
      <InvoiceDetailModal invoice={selectedInvoice} room={data?.room ?? null} tenantName={data?.tenant?.fullName ?? 'Tenant'} onClose={() => setSelectedInvoice(null)} />
    </Screen>
  )
}

export function MyUtilitiesScreen() {
  const { data, loading, error, reload } = useTenantPortalData()
  const utilities = data?.utilities ?? []

  return (
    <Screen loading={loading} onRefresh={reload} refreshing={loading} subtitle="Your electricity and water readings." title="My Utilities">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        <StatCard label="Electricity Usage" tone="warning" value={utilities.filter((item) => item.utilityType === 'electricity').reduce((total, item) => total + item.usage, 0)} />
        <StatCard label="Water Usage" value={utilities.filter((item) => item.utilityType === 'water').reduce((total, item) => total + item.usage, 0)} />
        <StatCard label="Utility Cost" tone="success" value={formatCurrency(utilities.reduce((total, item) => total + item.totalAmount, 0))} />
      </View>
      {!utilities.length ? <Text style={styles.empty}>No utility readings found.</Text> : null}
      {utilities.map((reading) => (
        <ListCard key={reading.id} title={`${capitalize(reading.utilityType)} - ${reading.billingMonth}`}>
          <Text style={styles.meta}>Previous Reading: {reading.previousReading ?? 0}</Text>
          <Text style={styles.meta}>Current Reading: {reading.currentReading ?? 0}</Text>
          <Text style={styles.meta}>Usage: {reading.usage}</Text>
          <Text style={styles.meta}>Unit Price: {formatCurrency(reading.unitPrice)}</Text>
          <Text style={styles.meta}>Total Amount: {formatCurrency(reading.totalAmount)}</Text>
          <Text style={styles.meta}>Status: {reading.status}</Text>
          <PrimaryButton label="View Details" onPress={() => showUtilityDetails(reading)} variant="secondary" />
        </ListCard>
      ))}
    </Screen>
  )
}

export function MyFeedbackScreen() {
  const { data, loading, error, reload } = useTenantPortalData()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function submitFeedback() {
    setFormError(null)
    if (!data?.tenant) return setFormError('Tenant profile is required.')
    if (!title.trim()) return setFormError('Title is required.')
    if (!content.trim()) return setFormError('Content is required.')

    const values: TenantFeedbackValues = {
      title: title.trim(),
      content: content.trim(),
    }
    setSubmitting(true)
    try {
      await createTenantFeedback(data.tenant, values)
      setTitle('')
      setContent('')
      await reload()
    } catch (submitError) {
      console.warn('Tenant feedback creation failed.', submitError)
      setFormError('Unable to submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen loading={loading} onRefresh={reload} refreshing={loading} subtitle="Describe your issue and AI will classify it automatically." title="Submit Feedback">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ListCard title="Create Feedback">
        <TextInput placeholder="Title" placeholderTextColor={colors.muted} style={styles.input} value={title} onChangeText={setTitle} />
        <TextInput multiline placeholder="Description" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea]} value={content} onChangeText={setContent} />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <PrimaryButton disabled={submitting} label={submitting ? 'Submitting...' : 'Submit Feedback'} onPress={submitFeedback} />
      </ListCard>
      {!data?.feedbacks.length ? <Text style={styles.empty}>No feedback found.</Text> : null}
      {data?.feedbacks.map((feedback) => (
        <ListCard key={feedback.id} title={feedback.title} subtitle={formatDate(feedback.createdAt)}>
          <Text style={styles.meta}>Category: {formatAiCategory(feedback)}</Text>
          <Text style={styles.meta}>AI Priority: {formatAiPriority(feedback)}</Text>
          <Text style={styles.meta}>AI Sentiment: {feedback.sentiment ?? 'Pending AI'}</Text>
          <Text style={styles.meta}>Status: {feedback.status}</Text>
          <Text style={styles.meta}>Owner Response: {feedback.ownerResponse ?? 'Not available'}</Text>
          <PrimaryButton label="View Details" onPress={() => showFeedbackDetails(feedback)} variant="secondary" />
        </ListCard>
      ))}
    </Screen>
  )
}

function InvoiceDetailModal({ invoice, room, tenantName, onClose }: { invoice: Invoice | null; room: { roomNumber: string; roomType: string } | null; tenantName: string; onClose: () => void }) {
  if (!invoice) return null
  const subtotal = invoice.subtotal ?? invoice.items?.reduce((total, item) => total + item.amount, 0) ?? invoice.totalAmount
  const discount = invoice.discount ?? 0
  const remaining = Math.max(0, (invoice.totalAmount ?? 0) - (invoice.paidAmount ?? 0))
  return (
    <Modal animationType="slide" visible={!!invoice} onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>{invoice.invoiceCode}</Text>
        <Text style={styles.meta}>Tenant: {tenantName}</Text>
        <Text style={styles.meta}>Room: {room ? `${room.roomNumber} - ${room.roomType}` : 'Not available'}</Text>
        <Text style={styles.sectionTitle}>Items</Text>
        {!invoice.items?.length ? <Text style={styles.empty}>No invoice items available.</Text> : null}
        {invoice.items?.map((item) => (
          <View key={item.id} style={styles.detailBox}>
            <Text style={styles.meta}>Name: {item.name}</Text>
            <Text style={styles.meta}>Quantity: {item.quantity}</Text>
            <Text style={styles.meta}>Unit Price: {formatCurrency(item.unitPrice)}</Text>
            <Text style={styles.meta}>Amount: {formatCurrency(item.amount)}</Text>
          </View>
        ))}
        <Text style={styles.meta}>Subtotal: {formatCurrency(subtotal)}</Text>
        <Text style={styles.meta}>Discount: {formatCurrency(discount)}</Text>
        <Text style={styles.meta}>Total Amount: {formatCurrency(invoice.totalAmount)}</Text>
        <Text style={styles.meta}>Paid Amount: {formatCurrency(invoice.paidAmount)}</Text>
        <Text style={styles.meta}>Remaining Amount: {formatCurrency(remaining)}</Text>
        <Text style={styles.meta}>Status: {invoice.status}</Text>
        <Text style={styles.meta}>Note: {invoice.note ?? 'Not available'}</Text>
        <PrimaryButton label="Close" onPress={onClose} />
      </ScrollView>
    </Modal>
  )
}

function showUtilityDetails(reading: UtilityReading) {
  Alert.alert(`${capitalize(reading.utilityType)} Details`, [
    `Billing Month: ${reading.billingMonth}`,
    `Previous Reading: ${reading.previousReading ?? 0}`,
    `Current Reading: ${reading.currentReading ?? 0}`,
    `Usage: ${reading.usage}`,
    `Unit Price: ${formatCurrency(reading.unitPrice)}`,
    `Total Amount: ${formatCurrency(reading.totalAmount)}`,
    `Status: ${reading.status}`,
    `Note: ${reading.note ?? 'Not available'}`,
  ].join('\n'))
}

function showFeedbackDetails(feedback: Feedback) {
  Alert.alert(feedback.title, [
    feedback.content,
    'AI Analysis',
    `Category: ${formatAiCategory(feedback)}`,
    `Priority: ${formatAiPriority(feedback)}`,
    `Sentiment: ${feedback.sentiment ?? 'Pending AI'}`,
    `AI Generated: ${feedback.aiGenerated ? 'Yes' : 'No'}`,
    `Status: ${feedback.status}`,
    `Owner Response: ${feedback.ownerResponse ?? 'Not available'}`,
    `AI Summary: ${feedback.aiSummary ?? 'AI summary will be generated after analysis.'}`,
  ].join('\n\n'))
}

function formatAiCategory(feedback: Feedback) {
  if (feedback.aiSuggestedCategory) {
    return capitalize(feedback.aiSuggestedCategory.replace('_', ' '))
  }

  if (feedback.category && feedback.category !== 'other') {
    return capitalize(feedback.category.replace('_', ' '))
  }

  return 'Pending AI'
}

function formatAiPriority(feedback: Feedback) {
  const priority = feedback.priority ?? feedback.aiSuggestedPriority

  return priority ? capitalize(priority.replace('_', ' ')) : 'Pending AI'
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  empty: { color: colors.muted, fontSize: 15 },
  error: { color: colors.danger, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: { minHeight: 48, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, paddingHorizontal: spacing.md },
  textarea: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  optionGroup: { gap: spacing.sm },
  optionLabel: { color: colors.text, fontSize: 14, fontWeight: '800' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modalContent: { backgroundColor: colors.background, gap: spacing.lg, padding: spacing.lg, paddingTop: 56 },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  detailBox: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
})
