import { PropsWithChildren } from 'react'
import { Redirect, type Href } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { TenantAppShell } from './TenantAppShell'
import { useTenantNavigation } from './useTenantNavigation'
import { colors } from '../../constants/theme'
import type { TenantTabKey } from '../../constants/navigation'
import { useAuth } from '../../providers/AuthProvider'

interface TenantRouteProps extends PropsWithChildren {
  activeTab: TenantTabKey
}

export function TenantRoute({ activeTab, children }: TenantRouteProps) {
  const { currentUser, loading } = useAuth()
  const navigate = useTenantNavigation()

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!currentUser) return <Redirect href={'/login?role=tenant' as Href} />

  if (currentUser.role !== 'tenant') {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>This account is not allowed to access the Tenant portal.</Text>
      </View>
    )
  }

  return (
    <TenantAppShell activeTab={activeTab} onChangeTab={navigate}>
      {children}
    </TenantAppShell>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  message: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
})
