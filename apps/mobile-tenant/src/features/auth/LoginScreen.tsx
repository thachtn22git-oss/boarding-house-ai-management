import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../providers/AuthProvider'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { colors, spacing } from '../../constants/theme'

export function LoginScreen() {
  const { login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleLogin() {
    setFormError(null)

    if (!email.trim()) {
      setFormError('Email is required.')
      return
    }

    if (!password) {
      setFormError('Password is required.')
      return
    }

    try {
      await login(email, password)
    } catch (loginError) {
      setFormError(loginError instanceof Error ? loginError.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.brandPanel}>
          <Text style={styles.eyebrow}>TENANT PORTAL</Text>
          <Text style={styles.brand}>Boarding House AI</Text>
          <Text style={styles.subtitle}>Smart boarding house management platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.description}>Use your tenant account to view invoices, utilities, feedback, and alerts.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              editable={!loading}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              editable={!loading}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {formError || error ? <Text style={styles.error}>{formError ?? error}</Text> : null}

          <PrimaryButton disabled={loading} label={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} />
        </View>
      </KeyboardAvoidingView>
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
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  brandPanel: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brand: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
})
