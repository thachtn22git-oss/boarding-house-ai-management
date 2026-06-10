import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { StatCard } from '../../components/cards/StatCard'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import { getCurrentTenant, type TenantPortalData } from '../../services/tenantPortal.service'
import { formatCurrency } from '../../utils/format'

export function TenantHomeScreen() {
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

  return (
    <Screen
      loading={loading}
      onRefresh={loadData}
      refreshing={loading}
      subtitle={data?.tenant ? `Welcome back, ${data.tenant.fullName}` : 'Welcome back'}
      title="Tenant Portal"
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!data?.tenant ? <Text style={styles.empty}>No tenant profile found for this account.</Text> : null}

      <View style={styles.grid}>
        <StatCard label="Current Room" value={data?.room?.roomNumber ?? 'N/A'} />
        <StatCard label="Current Invoice" value={formatCurrency(latestInvoice?.totalAmount)} />
        <StatCard label="Contract Status" tone="success" value={data?.activeContract?.status ?? 'N/A'} />
        <StatCard label="Unread Notifications" tone="warning" value={data?.unreadNotifications ?? 0} />
      </View>

      <ListCard title="Room Summary">
        <Text style={styles.meta}>Room Number: {data?.room?.roomNumber ?? 'Not available'}</Text>
        <Text style={styles.meta}>Room Type: {data?.room?.roomType ?? 'Not available'}</Text>
        <Text style={styles.meta}>Status: {data?.room?.status ?? 'Not available'}</Text>
      </ListCard>

      <ListCard title="Contract Summary">
        <Text style={styles.meta}>Contract Code: {data?.activeContract?.contractCode ?? 'Not available'}</Text>
        <Text style={styles.meta}>Monthly Rent: {formatCurrency(data?.activeContract?.monthlyRent)}</Text>
        <Text style={styles.meta}>End Date: {data?.activeContract?.endDate ?? 'Not available'}</Text>
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
})
