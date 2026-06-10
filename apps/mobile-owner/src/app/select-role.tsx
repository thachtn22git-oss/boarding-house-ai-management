import { useRouter, type Href } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PrimaryButton } from '../components/common/PrimaryButton'
import { colors, spacing } from '../constants/theme'

export default function SelectRoleRoute() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>BOARDING HOUSE AI</Text>
          <Text style={styles.title}>Choose your portal</Text>
          <Text style={styles.subtitle}>Select how you want to access the mobile app.</Text>
        </View>

        <View style={styles.card}>
          <PrimaryButton label="Owner" onPress={() => router.push('/login?role=owner' as Href)} />
          <PrimaryButton label="Tenant" onPress={() => router.push('/login?role=tenant' as Href)} variant="secondary" />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
})
