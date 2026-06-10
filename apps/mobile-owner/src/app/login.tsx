import { Redirect, type Href } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { LoginScreen } from '../features/auth/LoginScreen'
import { useAuth } from '../providers/AuthProvider'
import { colors } from '../constants/theme'

export default function LoginRoute() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (currentUser?.role === 'owner') return <Redirect href={'/dashboard' as Href} />

  return <LoginScreen />
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
})
