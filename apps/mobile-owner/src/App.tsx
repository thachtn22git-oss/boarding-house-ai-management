import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from './providers/AuthProvider'
import { AppShell } from './components/layout/AppShell'
import { colors } from './constants/theme'
import type { OwnerTabKey } from './constants/navigation'
import { LoginScreen } from './features/auth/LoginScreen'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import {
  FeedbackScreen,
  ContractsScreen,
  InvoicesScreen,
  RoomsScreen,
  TenantsScreen,
  UtilitiesScreen,
} from './features/dashboard/OwnerListScreens'
import { NotificationsScreen } from './features/notifications/NotificationsScreen'
import { MoreScreen } from './features/profile/MoreScreen'
import { ProfileScreen } from './features/profile/ProfileScreen'

function OwnerApp() {
  const { currentUser, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<OwnerTabKey>('dashboard')

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!currentUser) return <LoginScreen />

  return (
    <AppShell activeTab={activeTab} onChangeTab={setActiveTab}>
      {activeTab === 'dashboard' ? <DashboardScreen /> : null}
      {activeTab === 'rooms' ? <RoomsScreen /> : null}
      {activeTab === 'invoices' ? <InvoicesScreen /> : null}
      {activeTab === 'feedback' ? <FeedbackScreen /> : null}
      {activeTab === 'tenants' ? <TenantsScreen /> : null}
      {activeTab === 'contracts' ? <ContractsScreen /> : null}
      {activeTab === 'utilities' ? <UtilitiesScreen /> : null}
      {activeTab === 'notifications' ? <NotificationsScreen /> : null}
      {activeTab === 'profile' ? <ProfileScreen /> : null}
      {activeTab === 'more' ? <MoreScreen onNavigate={setActiveTab} /> : null}
    </AppShell>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <OwnerApp />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
})
