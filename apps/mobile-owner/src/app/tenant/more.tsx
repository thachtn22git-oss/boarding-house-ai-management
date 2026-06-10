import { TenantRoute } from '../../components/layout/TenantRoute'
import { useTenantNavigation } from '../../components/layout/useTenantNavigation'
import { TenantMoreScreen } from '../../features/tenant-portal/TenantMoreScreen'

export default function TenantMoreRoute() {
  const navigate = useTenantNavigation()
  return (
    <TenantRoute activeTab="more">
      <TenantMoreScreen onNavigate={navigate} />
    </TenantRoute>
  )
}
