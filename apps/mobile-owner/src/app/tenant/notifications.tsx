import { TenantRoute } from '../../components/layout/TenantRoute'
import { useTenantNavigation } from '../../components/layout/useTenantNavigation'
import { TenantNotificationsScreen } from '../../features/tenant-portal/TenantNotificationsScreen'

export default function TenantNotificationsRoute() {
  const navigate = useTenantNavigation()
  return (
    <TenantRoute activeTab="notifications">
      <TenantNotificationsScreen onNavigate={navigate} />
    </TenantRoute>
  )
}
