import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { StatCard } from '../../components/cards/StatCard'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import {
  getOwnerDashboard,
  subscribeOwnerDashboard,
  type OwnerDashboardStats,
} from '../../services/ownerData.service'
import { formatCurrency, formatRelativeTime } from '../../utils/format'

export function DashboardScreen() {
  const { currentUser } = useAuth()
  const [stats, setStats] = useState<OwnerDashboardStats | null>(null)
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
    if (!currentUser) return undefined

    let hasLoadedOnce = false
    setLoading(true)
    setError(null)

    return subscribeOwnerDashboard(
      currentUser.uid,
      (nextStats) => {
        setStats(nextStats)
        setError(null)
        if (!hasLoadedOnce) {
          setLoading(false)
          hasLoadedOnce = true
        }
      },
      (subscriptionError) => {
        console.warn('Owner dashboard realtime update failed.', subscriptionError)
        setError('Realtime updates are unavailable. Showing latest loaded data.')
        if (!hasLoadedOnce) {
          setLoading(false)
          hasLoadedOnce = true
        }
      },
    )
  }, [currentUser])

  const hasNoDashboardData =
    !loading &&
    !error &&
    stats !== null &&
    stats.totalRooms === 0 &&
    stats.monthlyRevenue === 0 &&
    stats.unreadNotifications === 0 &&
    stats.totalTenants === 0 &&
    stats.activeContracts === 0 &&
    stats.unpaidInvoices === 0 &&
    stats.utilityAmount === 0 &&
    stats.pendingFeedback === 0

  return (
    <Screen
      loading={loading}
      onRefresh={loadStats}
      refreshing={loading}
      subtitle="Monitor rooms, tenants, invoices, utilities, feedback, and alerts."
      title="Dashboard"
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hasNoDashboardData ? (
        <Text style={styles.empty}>No dashboard data yet. Create rooms, tenants, invoices, utilities, and feedback to see live metrics.</Text>
      ) : null}

      <View style={styles.grid}>
        <StatCard label="Total Rooms" value={stats?.totalRooms ?? 0} />
        <StatCard label="Occupied Rooms" tone="success" value={stats?.occupiedRooms ?? 0} />
        <StatCard label="Vacant Rooms" tone="warning" value={stats?.vacantRooms ?? 0} />
        <StatCard label="Monthly Revenue" value={formatCurrency(stats?.monthlyRevenue)} />
        <StatCard label="Unread Notifications" tone="danger" value={stats?.unreadNotifications ?? 0} />
        <StatCard label="Total Tenants" value={stats?.totalTenants ?? 0} />
        <StatCard label="Active Contracts" tone="success" value={stats?.activeContracts ?? 0} />
        <StatCard label="Unpaid Invoices" tone="warning" value={stats?.unpaidInvoices ?? 0} />
        <StatCard label="Utility Amount" value={formatCurrency(stats?.utilityAmount)} />
        <StatCard label="Pending Feedback" tone="warning" value={stats?.pendingFeedback ?? 0} />
        <StatCard label="Urgent Feedback" tone="danger" value={stats?.urgentFeedback ?? 0} />
      </View>

      <ListCard title="AI Insights" subtitle="Compact management summary">
        {stats?.insights.length ? (
          stats.insights.map((insight) => (
            <Text key={insight} style={styles.insightText}>
              {`\u2022 ${insight}`}
            </Text>
          ))
        ) : (
          <Text style={styles.bodyText}>No insights available yet.</Text>
        )}
      </ListCard>

      <ListCard title="Recent Activity" subtitle="Latest operational updates">
        {stats?.recentActivities.length ? (
          stats.recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityTime}>{formatRelativeTime(activity.timestamp)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.bodyText}>No recent activity yet.</Text>
        )}
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
  insightText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  activityItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  activityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  activityTime: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
})
