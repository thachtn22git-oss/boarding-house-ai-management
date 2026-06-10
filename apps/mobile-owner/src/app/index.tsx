import { Redirect, type Href } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/theme'
import { useAuth } from '../providers/AuthProvider'

export default function IndexRoute() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!currentUser) return <Redirect href={'/select-role' as Href} />

  if (currentUser.role === 'owner') return <Redirect href={'/owner/dashboard' as Href} />
  if (currentUser.role === 'tenant') return <Redirect href={'/tenant/home' as Href} />

  return (
    <View style={styles.messageContainer}>
      <Text style={styles.message}>This account role is not supported by the mobile app.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  messageContainer: {
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
