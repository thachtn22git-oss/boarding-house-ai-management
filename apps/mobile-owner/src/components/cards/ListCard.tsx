import { PropsWithChildren } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../../constants/theme'

interface ListCardProps extends PropsWithChildren {
  title: string
  subtitle?: string
}

export function ListCard({ title, subtitle, children }: ListCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
  },
})
