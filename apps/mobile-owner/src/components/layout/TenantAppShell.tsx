import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { tenantTabs, type TenantTabKey } from '../../constants/navigation'
import { colors, spacing } from '../../constants/theme'

interface TenantAppShellProps {
  activeTab: TenantTabKey
  children: React.ReactNode
  onChangeTab: (tab: TenantTabKey) => void
}

export function TenantAppShell({ activeTab, children, onChangeTab }: TenantAppShellProps) {
  const { currentUser } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.portal}>Tenant Portal</Text>
          <Text style={styles.name}>{currentUser?.fullName ?? 'Tenant'}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(currentUser?.fullName, currentUser?.email)}</Text>
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      <View style={styles.tabBar}>
        {tenantTabs.map((item) => {
          const isActive = item.key === activeTab

          return (
            <Pressable
              key={item.key}
              onPress={() => onChangeTab(item.key)}
              style={[styles.tabItem, isActive ? styles.activeTabItem : null]}
            >
              <Text style={[styles.tabLabel, isActive ? styles.activeTabLabel : null]}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function getInitials(fullName?: string, email?: string) {
  if (fullName) {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
  }

  return email?.slice(0, 2).toUpperCase() ?? 'TU'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portal: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.sm,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabItem: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  activeTabLabel: {
    color: colors.surface,
  },
})
