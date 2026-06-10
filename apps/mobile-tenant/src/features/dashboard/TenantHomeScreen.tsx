import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { StatCard } from '../../components/cards/StatCard'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import { getCurrentTenant, type TenantPortalData } from '../../services/tenantPortal.service'
import { formatCurrency, formatRelativeTime } from '../../utils/format'
import type { TenantTabKey } from '../../constants/navigation'
import { PrimaryButton } from '../../components/common/PrimaryButton'

interface TenantHomeScreenProps {
  onNavigate: (tab: TenantTabKey) => void
}

export function TenantHomeScreen({ onNavigate }: TenantHomeScreenProps) {
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
      console.warn('Tenant home load failed.', loadError)
      setError('Unable to load tenant portal data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const latestInvoice = data?.invoices[0]
  const recentNotifications = data?.notifications.slice(0, 3) ?? []

  return (
    <Screen
      loading={loading}
      onRefresh={loadData}
      refreshing={loading}
      subtitle={data?.tenant ? `Welcome back, ${data.tenant.fullName}` : 'Welcome back'}
      title="Tenant Portal"
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!data?.tenant ? (
        <Text style={styles.empty}>No tenant profile found. Please contact your boarding house owner.</Text>
      ) : null}

      <View style={styles.grid}>
        <StatCard label="Current Room" value={data?.room?.roomNumber ?? 'N/A'} />
        <StatCard label="Current Invoice" value={formatCurrency(latestInvoice?.totalAmount)} />
        <StatCard label="Contract Status" tone="success" value={data?.activeContract?.status ?? 'N/A'} />
        <StatCard label="Unread Notifications" tone="warning" value={data?.unreadNotifications ?? 0} />
      </View>

      <ListCard title="Room Summary">
        <Text style={styles.meta}>Room Number: {data?.room?.roomNumber ?? 'Not available'}</Text>
        <Text style={styles.meta}>Room Type: {data?.room?.roomType ?? 'Not available'}</Text>
        <Text style={styles.meta}>Floor: {data?.room?.floor ?? 'Not available'}</Text>
        <Text style={styles.meta}>Status: {data?.room?.status ?? 'Not available'}</Text>
      </ListCard>

      <ListCard title="Latest Invoice">
        <Text style={styles.meta}>Invoice Code: {latestInvoice?.invoiceCode ?? 'Not available'}</Text>
        <Text style={styles.meta}>Total Amount: {formatCurrency(latestInvoice?.totalAmount)}</Text>
        <Text style={styles.meta}>Status: {latestInvoice?.status ?? 'Not available'}</Text>
      </ListCard>

      <ListCard title="Active Contract">
        <Text style={styles.meta}>Contract Code: {data?.activeContract?.contractCode ?? 'Not available'}</Text>
        <Text style={styles.meta}>Monthly Rent: {formatCurrency(data?.activeContract?.monthlyRent)}</Text>
        <Text style={styles.meta}>End Date: {data?.activeContract?.endDate ?? 'Not available'}</Text>
      </ListCard>

      <ListCard title="Recent Notifications">
        {!recentNotifications.length ? <Text style={styles.empty}>No notifications available.</Text> : null}
        {recentNotifications.map((notification) => (
          <View key={notification.id} style={styles.notificationItem}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.meta}>{notification.message}</Text>
            <Text style={styles.meta}>{formatRelativeTime(notification.createdAt)}</Text>
          </View>
        ))}
      </ListCard>

      <ListCard title="Quick Actions">
        <View style={styles.actions}>
          <PrimaryButton label="View Invoices" onPress={() => onNavigate('invoices')} />
          <PrimaryButton label="View Utilities" onPress={() => onNavigate('utilities')} variant="secondary" />
          <PrimaryButton label="Submit Feedback" onPress={() => onNavigate('feedback')} variant="secondary" />
          <PrimaryButton label="View Notifications" onPress={() => onNavigate('notifications')} variant="secondary" />
        </View>
      </ListCard>
    </Screen>
  )
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
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  notificationItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  notificationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actions: {
    gap: spacing.sm,
  },
})
