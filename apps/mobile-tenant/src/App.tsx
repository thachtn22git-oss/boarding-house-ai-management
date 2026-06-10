import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from './providers/AuthProvider'
import { AppShell } from './components/layout/AppShell'
import type { TenantTabKey } from './constants/navigation'
import { colors } from './constants/theme'
import { LoginScreen } from './features/auth/LoginScreen'
import { TenantHomeScreen } from './features/dashboard/TenantHomeScreen'
import {
  MyContractScreen,
  MyFeedbackScreen,
  MyInvoicesScreen,
  MyRoomScreen,
  MyUtilitiesScreen,
} from './features/dashboard/TenantDetailScreens'
import { NotificationsScreen } from './features/notifications/NotificationsScreen'
import { MoreScreen } from './features/profile/MoreScreen'
import { ProfileScreen } from './features/profile/ProfileScreen'

function TenantApp() {
  const { currentUser, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<TenantTabKey>('home')

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
      {activeTab === 'home' ? <TenantHomeScreen /> : null}
      {activeTab === 'invoices' ? <MyInvoicesScreen /> : null}
      {activeTab === 'feedback' ? <MyFeedbackScreen /> : null}
      {activeTab === 'notifications' ? <NotificationsScreen /> : null}
      {activeTab === 'room' ? <MyRoomScreen /> : null}
      {activeTab === 'contract' ? <MyContractScreen /> : null}
      {activeTab === 'utilities' ? <MyUtilitiesScreen /> : null}
      {activeTab === 'profile' ? <ProfileScreen /> : null}
      {activeTab === 'more' ? <MoreScreen onNavigate={setActiveTab} /> : null}
    </AppShell>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TenantApp />
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
