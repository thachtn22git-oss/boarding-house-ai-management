import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { StatCard } from '../../components/cards/StatCard'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import { getOwnerDashboard } from '../../services/ownerData.service'
import { formatCurrency } from '../../utils/format'

interface OwnerStats {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  monthlyRevenue: number
  unreadNotifications: number
}

export function DashboardScreen() {
  const { currentUser } = useAuth()
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)

    try {
      setStats(await getOwnerDashboard(currentUser.uid))
    } catch (loadError) {
      console.warn('Owner dashboard load failed.', loadError)
      setError('Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  return (
    <Screen
      loading={loading}
      onRefresh={loadStats}
      refreshing={loading}
      subtitle="Monitor rooms, revenue, and notification activity."
      title="Dashboard"
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        <StatCard label="Total Rooms" value={stats?.totalRooms ?? 0} />
        <StatCard label="Occupied Rooms" tone="success" value={stats?.occupiedRooms ?? 0} />
        <StatCard label="Vacant Rooms" tone="warning" value={stats?.vacantRooms ?? 0} />
        <StatCard label="Monthly Revenue" value={formatCurrency(stats?.monthlyRevenue)} />
        <StatCard label="Unread Notifications" tone="danger" value={stats?.unreadNotifications ?? 0} />
      </View>

      <ListCard title="Owner Overview" subtitle="Live summary from Firestore">
        <Text style={styles.bodyText}>
          Use the bottom tabs to review rooms, invoices, feedback, utilities, notifications, and profile details.
        </Text>
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
  bodyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
})
