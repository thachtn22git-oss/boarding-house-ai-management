import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import { getCurrentTenant, type TenantPortalData } from '../../services/tenantPortal.service'

export function ProfileScreen() {
  const { currentUser, logout } = useAuth()
  const [data, setData] = useState<TenantPortalData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      setData(await getCurrentTenant(currentUser))
    } catch (error) {
      console.warn('Tenant profile load failed.', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return (
    <Screen loading={loading} onRefresh={loadData} refreshing={loading} subtitle="Tenant account details and session controls." title="Profile">
      <ListCard title="Account">
        <View style={styles.item}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{currentUser?.fullName}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{currentUser?.email}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>Tenant</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Tenant Profile Name</Text>
          <Text style={styles.value}>{data?.tenant?.fullName ?? 'Not available'}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.label}>Room Number</Text>
          <Text style={styles.value}>{data?.room?.roomNumber ?? 'Not available'}</Text>
        </View>
      </ListCard>
      <PrimaryButton label="Logout" onPress={() => void logout()} variant="danger" />
    </Screen>
  )
}

const styles = StyleSheet.create({
  item: {
    gap: spacing.xs,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
