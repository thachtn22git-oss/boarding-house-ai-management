import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { colors, spacing } from '../../constants/theme'
import { useAuth } from '../../providers/AuthProvider'
import { getCurrentTenant, type TenantPortalData } from '../../services/tenantPortal.service'

export function TenantProfileScreen() {
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
        <Field label="Name" value={currentUser?.fullName} />
        <Field label="Email" value={currentUser?.email} />
        <Field label="Role" value="Tenant" />
        <Field label="Tenant Profile Name" value={data?.tenant?.fullName} />
        <Field label="Room Number" value={data?.room?.roomNumber} />
      </ListCard>
      <PrimaryButton label="Logout" onPress={() => void logout()} variant="danger" />
    </Screen>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? 'Not available'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  item: { gap: spacing.xs },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 16, fontWeight: '700' },
})
