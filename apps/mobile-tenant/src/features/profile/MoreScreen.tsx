import { Pressable, StyleSheet, Text } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { ListCard } from '../../components/cards/ListCard'
import { tenantMoreItems, type TenantTabKey } from '../../constants/navigation'
import { colors, spacing } from '../../constants/theme'

interface MoreScreenProps {
  onNavigate: (tab: TenantTabKey) => void
}

export function MoreScreen({ onNavigate }: MoreScreenProps) {
  const { logout } = useAuth()

  return (
    <Screen subtitle="More tenant tools and account actions." title="More">
      <ListCard title="Tenant Tools">
        {tenantMoreItems.map((item) => (
          <Pressable key={item.key} onPress={() => onNavigate(item.key)} style={styles.row}>
            <Text style={styles.rowText}>{item.label}</Text>
          </Pressable>
        ))}
      </ListCard>
      <PrimaryButton label="Logout" onPress={() => void logout()} variant="danger" />
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  rowText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
