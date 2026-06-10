import { TenantRoute } from '../../components/layout/TenantRoute'
import { useTenantNavigation } from '../../components/layout/useTenantNavigation'
import { TenantHomeScreen } from '../../features/tenant-portal/TenantHomeScreen'

export default function TenantHomeRoute() {
  const navigate = useTenantNavigation()
  return (
    <TenantRoute activeTab="home">
      <TenantHomeScreen onNavigate={navigate} />
    </TenantRoute>
  )
}
