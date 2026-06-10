import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { StatCard } from '../../components/cards/StatCard'
import { colors, spacing } from '../../constants/theme'
import {
  createTenantFeedback,
  getCurrentTenant,
  type TenantFeedbackValues,
  type TenantPortalData,
} from '../../services/tenantPortal.service'
import { formatCurrency, formatDate } from '../../utils/format'
import type { FeedbackCategory, FeedbackPriority } from '../../types/models'

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
          <Text style={styles.meta}>Area: {room.area ?? 0} m2</Text>
          <Text style={styles.meta}>Price: {formatCurrency(room.price)}</Text>
          <Text style={styles.meta}>Deposit: {formatCurrency(room.deposit)}</Text>
          <Text style={styles.meta}>Maximum Occupancy: {room.maxTenants ?? 0}</Text>
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
          <Text style={styles.meta}>Start Date: {contract.startDate}</Text>
          <Text style={styles.meta}>End Date: {contract.endDate}</Text>
          <Text style={styles.meta}>Monthly Rent: {formatCurrency(contract.monthlyRent)}</Text>
          <Text style={styles.meta}>Deposit: {formatCurrency(contract.deposit)}</Text>
          <Text style={styles.meta}>Due Day: {contract.paymentDueDay}</Text>
          <Text style={styles.meta}>Status: {contract.status}</Text>
          <Text style={styles.meta}>Terms: {contract.terms ?? 'Not available'}</Text>
          <PrimaryButton label="Print Contract" onPress={() => Alert.alert('Print Contract', 'Printing is available on supported devices.')} />
        </ListCard>
      ) : null}
    </Screen>
  )
}

export function MyInvoicesScreen() {
  const { data, loading, error, reload } = useTenantPortalData()
  const invoices = data?.invoices ?? []

  return (
    <Screen loading={loading} onRefresh={reload} refreshing={loading} subtitle="Your monthly invoices and payment status." title="My Invoices">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        <StatCard label="Total Invoices" value={invoices.length} />
        <StatCard label="Paid" tone="success" value={invoices.filter((item) => item.status === 'paid').length} />
        <StatCard label="Unpaid" tone="warning" value={invoices.filter((item) => item.status === 'unpaid').length} />
        <StatCard label="Overdue" tone="danger" value={invoices.filter((item) => item.status === 'overdue').length} />
      </View>
      {!invoices.length ? <Text style={styles.empty}>No invoices found.</Text> : null}
      {invoices.map((invoice) => (
        <ListCard key={invoice.id} title={invoice.invoiceCode}>
          <Text style={styles.meta}>Billing Month: {invoice.billingMonth}</Text>
          <Text style={styles.meta}>Due Date: {invoice.dueDate}</Text>
          <Text style={styles.meta}>Total Amount: {formatCurrency(invoice.totalAmount)}</Text>
          <Text style={styles.meta}>Paid Amount: {formatCurrency(invoice.paidAmount)}</Text>
          <Text style={styles.meta}>Status: {invoice.status}</Text>
        </ListCard>
      ))}
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
          <Text style={styles.meta}>Previous: {reading.previousReading}</Text>
          <Text style={styles.meta}>Current: {reading.currentReading}</Text>
          <Text style={styles.meta}>Usage: {reading.usage}</Text>
          <Text style={styles.meta}>Total Amount: {formatCurrency(reading.totalAmount)}</Text>
          <Text style={styles.meta}>Status: {reading.status}</Text>
        </ListCard>
      ))}
    </Screen>
  )
}

export function MyFeedbackScreen() {
  const { data, loading, error, reload } = useTenantPortalData()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('maintenance')
  const [priority, setPriority] = useState<FeedbackPriority>('medium')
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function submitFeedback() {
    setFormError(null)

    if (!data?.tenant) {
      setFormError('Tenant profile is required.')
      return
    }

    if (!title.trim()) {
      setFormError('Title is required.')
      return
    }

    if (!content.trim()) {
      setFormError('Content is required.')
      return
    }

    const values: TenantFeedbackValues = { title, content, category, priority, sentiment }

    setSubmitting(true)
    try {
      await createTenantFeedback(data.tenant, values)
      setTitle('')
      setContent('')
      setCategory('maintenance')
      setPriority('medium')
      setSentiment('neutral')
      await reload()
    } catch (submitError) {
      console.warn('Tenant feedback creation failed.', submitError)
      setFormError('Unable to submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen loading={loading} onRefresh={reload} refreshing={loading} subtitle="Submit feedback and review owner responses." title="My Feedback">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ListCard title="Create Feedback">
        <TextInput placeholder="Title" placeholderTextColor={colors.muted} style={styles.input} value={title} onChangeText={setTitle} />
        <TextInput
          multiline
          placeholder="Content"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textarea]}
          value={content}
          onChangeText={setContent}
        />
        <OptionRow
          label="Category"
          options={['maintenance', 'electricity', 'water', 'internet', 'security', 'cleanliness', 'billing', 'other']}
          value={category}
          onChange={(value) => setCategory(value as FeedbackCategory)}
        />
        <OptionRow
          label="Priority"
          options={['low', 'medium', 'high', 'urgent']}
          value={priority}
          onChange={(value) => setPriority(value as FeedbackPriority)}
        />
        <OptionRow
          label="Sentiment"
          options={['positive', 'neutral', 'negative']}
          value={sentiment}
          onChange={(value) => setSentiment(value as 'positive' | 'neutral' | 'negative')}
        />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <PrimaryButton disabled={submitting} label={submitting ? 'Submitting...' : 'Create Feedback'} onPress={submitFeedback} />
      </ListCard>

      {!data?.feedbacks.length ? <Text style={styles.empty}>No feedback found.</Text> : null}
      {data?.feedbacks.map((feedback) => (
        <ListCard key={feedback.id} title={feedback.title} subtitle={formatDate(feedback.createdAt)}>
          <Text style={styles.meta}>Category: {feedback.category}</Text>
          <Text style={styles.meta}>Priority: {feedback.priority}</Text>
          <Text style={styles.meta}>Sentiment: {feedback.sentiment ?? 'neutral'}</Text>
          <Text style={styles.meta}>Status: {feedback.status}</Text>
          <Text style={styles.meta}>Owner Response: {feedback.ownerResponse ?? 'Not available'}</Text>
          <Text style={styles.meta}>AI Summary: {feedback.aiSummary ?? 'Not available'}</Text>
        </ListCard>
      ))}
    </Screen>
  )
}

interface OptionRowProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

function OptionRow({ label, options, value, onChange }: OptionRowProps) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionWrap}>
        {options.map((option) => (
          <PrimaryButton
            key={option}
            label={capitalize(option.replace('_', ' '))}
            onPress={() => onChange(option)}
            variant={option === value ? 'primary' : 'secondary'}
          />
        ))}
      </View>
    </View>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  textarea: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  optionGroup: {
    gap: spacing.sm,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
})
