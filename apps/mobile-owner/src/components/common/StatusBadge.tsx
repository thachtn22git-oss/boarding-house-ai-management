import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../../constants/theme'

interface StatusBadgeProps {
  label: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted'
}

export function StatusBadge({ label, tone = 'muted' }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={[styles.text, tone === 'muted' ? styles.mutedText : null]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  success: {
    backgroundColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  muted: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
  },
  text: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  mutedText: {
    color: colors.muted,
  },
})
