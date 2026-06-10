import { Redirect, useLocalSearchParams, type Href } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { LoginScreen } from '../features/auth/LoginScreen'
import { useAuth } from '../providers/AuthProvider'
import { colors } from '../constants/theme'

export default function LoginRoute() {
  const { currentUser, loading } = useAuth()
  const params = useLocalSearchParams<{ role?: string }>()
  const role = params.role === 'tenant' ? 'tenant' : params.role === 'owner' ? 'owner' : null

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!role) return <Redirect href={'/select-role' as Href} />

  if (currentUser?.role === 'owner') return <Redirect href={'/owner/dashboard' as Href} />
  if (currentUser?.role === 'tenant') return <Redirect href={'/tenant/home' as Href} />

  return <LoginScreen role={role} />
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
})
