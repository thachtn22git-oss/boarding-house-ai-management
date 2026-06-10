import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../../constants/theme'

interface StatCardProps {
  label: string
  value: string | number
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}

export function StatCard({ label, value, tone = 'primary' }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.dot, styles[tone]]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
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
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
})
