import { StyleSheet, Text, View, Pressable } from 'react-native'
import { colors, spacing } from '../../constants/theme'
import { ownerTabs, type OwnerTabKey } from '../../constants/navigation'
import { useAuth } from '../../providers/AuthProvider'
import { useChatUnreadCount } from '../../features/chat/useChatUnreadCount'

interface AppShellProps {
  activeTab: OwnerTabKey
  children: React.ReactNode
  onChangeTab: (tab: OwnerTabKey) => void
}

export function AppShell({ activeTab, children, onChangeTab }: AppShellProps) {
  const { currentUser } = useAuth()
  const chatUnreadCount = useChatUnreadCount()

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.portal}>Owner Portal</Text>
          <Text style={styles.name}>{currentUser?.fullName ?? 'Owner'}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(currentUser?.fullName, currentUser?.email)}</Text>
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      <View style={styles.tabBar}>
        {ownerTabs.map((item) => {
          const isActive = item.key === activeTab

          return (
            <Pressable
              accessibilityRole="button"
              key={item.key}
              onPress={() => onChangeTab(item.key)}
              style={[styles.tabItem, isActive ? styles.activeTabItem : null]}
            >
              <View>
                <Text style={[styles.tabLabel, isActive ? styles.activeTabLabel : null]}>{item.label}</Text>
                {item.key === 'chat' && chatUnreadCount > 0 ? (
                  <Text style={styles.badge}>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</Text>
                ) : null}
              </View>
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

  return email?.slice(0, 2).toUpperCase() ?? 'OU'
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
    paddingBottom: 96,
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
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
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
  badge: {
    position: 'absolute',
    right: -18,
    top: -14,
    minWidth: 20,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.danger,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 2,
    textAlign: 'center',
  },
})
