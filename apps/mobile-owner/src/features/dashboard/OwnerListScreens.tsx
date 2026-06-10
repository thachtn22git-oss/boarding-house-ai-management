import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import {
  getFeedback,
  getContracts,
  getInvoices,
  getRooms,
  getTenants,
  getTenantsWithRooms,
  getUtilities,
} from '../../services/ownerData.service'
import type { Contract, Feedback, Invoice, Room, TenantWithRoom, UtilityReading } from '../../types/models'
import { formatCurrency } from '../../utils/format'

type Loader<T> = (ownerId: string) => Promise<T[]>

interface DataListScreenProps<T> {
  title: string
  subtitle: string
  emptyMessage: string
  loader: Loader<T>
  renderItem: (item: T) => React.ReactNode
}

function DataListScreen<T extends { id: string }>({
  title,
  subtitle,
  emptyMessage,
  loader,
  renderItem,
}: DataListScreenProps<T>) {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)

    try {
      setItems(await loader(currentUser.uid))
    } catch (loadError) {
      console.warn(`${title} load failed.`, loadError)
      setError('Unable to load data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, loader, title])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  return (
    <Screen loading={loading} onRefresh={loadItems} refreshing={loading} subtitle={subtitle} title={title}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!items.length ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
      {items.map((item) => (
        <ListCard key={item.id} title={getCardTitle(renderItem(item))}>
          {renderItem(item)}
        </ListCard>
      ))}
    </Screen>
  )
}

function getCardTitle(node: React.ReactNode) {
  return typeof node === 'string' ? node : 'Details'
}

export function RoomsScreen() {
  return (
    <DataListScreen<Room>
      emptyMessage="No rooms found."
      loader={getRooms}
      renderItem={(room) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>Room {room.roomNumber}</Text>
          <Text style={styles.meta}>{room.roomType} | {room.status}</Text>
          <Text style={styles.meta}>{formatCurrency(room.price)}</Text>
        </View>
      )}
      subtitle="Rooms scoped to your owner account."
      title="Rooms"
    />
  )
}

export function TenantsScreen() {
  return (
    <DataListScreen<TenantWithRoom>
      emptyMessage="No tenants found."
      loader={getTenantsWithRooms}
      renderItem={(tenant) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{tenant.fullName}</Text>
          <Text style={styles.meta}>Phone: {tenant.phone || 'Not available'}</Text>
          <Text style={styles.meta}>Room: {tenant.room ? `${tenant.room.roomNumber} - ${tenant.room.roomType}` : 'Not assigned'}</Text>
          <Text style={styles.meta}>Status: {formatLabel(tenant.status)}</Text>
        </View>
      )}
      subtitle="Tenant records for your boarding house."
      title="Tenants"
    />
  )
}

export function InvoicesScreen() {
  return (
    <DataListScreen<Invoice>
      emptyMessage="No invoices found."
      loader={getInvoices}
      renderItem={(invoice) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{invoice.invoiceCode}</Text>
          <Text style={styles.meta}>{invoice.billingMonth} | {invoice.status}</Text>
          <Text style={styles.meta}>{formatCurrency(invoice.totalAmount)}</Text>
        </View>
      )}
      subtitle="Track invoice status and amounts."
      title="Invoices"
    />
  )
}

export function ContractsScreen() {
  return (
    <DataListScreen<Contract>
      emptyMessage="No contracts found."
      loader={getContracts}
      renderItem={(contract) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{contract.contractCode}</Text>
          <Text style={styles.meta}>End Date: {contract.endDate}</Text>
          <Text style={styles.meta}>Status: {contract.status}</Text>
        </View>
      )}
      subtitle="Review active and pending contracts."
      title="Contracts"
    />
  )
}

export function UtilitiesScreen() {
  return (
    <DataListScreen<UtilityReading>
      emptyMessage="No utility readings found."
      loader={getUtilities}
      renderItem={(reading) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{capitalize(reading.utilityType)}</Text>
          <Text style={styles.meta}>{reading.billingMonth} | {reading.status}</Text>
          <Text style={styles.meta}>Usage {reading.usage} | {formatCurrency(reading.totalAmount)}</Text>
        </View>
      )}
      subtitle="Review electricity and water readings."
      title="Utilities"
    />
  )
}

export function FeedbackScreen() {
  return (
    <DataListScreen<Feedback>
      emptyMessage="No feedback found."
      loader={getFeedback}
      renderItem={(feedback) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{feedback.title}</Text>
          <Text style={styles.meta}>Category: {formatLabel(feedback.category)}</Text>
          <Text style={styles.meta}>Priority: {formatLabel(feedback.priority)}</Text>
          <Text style={styles.meta}>Sentiment: {formatLabel(feedback.sentiment)}</Text>
          <Text style={styles.meta}>Status: {formatLabel(feedback.status)}</Text>
        </View>
      )}
      subtitle="Review tenant feedback and priorities."
      title="Feedback"
    />
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatLabel(value?: string) {
  if (!value) return 'Not available'

  return value
    .split('_')
    .map((part) => capitalize(part))
    .join(' ')
}

const styles = StyleSheet.create({
  item: {
    gap: spacing.xs,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
})
