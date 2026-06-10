import { PropsWithChildren } from 'react'
import { Redirect, type Href } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { AppShell } from './AppShell'
import { useOwnerNavigation } from './useOwnerNavigation'
import { colors } from '../../constants/theme'
import type { OwnerTabKey } from '../../constants/navigation'
import { useAuth } from '../../providers/AuthProvider'

interface OwnerRouteProps extends PropsWithChildren {
  activeTab: OwnerTabKey
}

export function OwnerRoute({ activeTab, children }: OwnerRouteProps) {
  const { currentUser, loading } = useAuth()
  const navigate = useOwnerNavigation()

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!currentUser) return <Redirect href={'/login' as Href} />

  if (currentUser.role !== 'owner') {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>This account is not allowed to access the Owner app.</Text>
      </View>
    )
  }

  return (
    <AppShell activeTab={activeTab} onChangeTab={navigate}>
      {children}
    </AppShell>
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
