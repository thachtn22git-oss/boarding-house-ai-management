import { TenantRoute } from '../../components/layout/TenantRoute'
import { TenantProfileScreen } from '../../features/tenant-portal/TenantProfileScreen'

export default function TenantProfileRoute() {
  return (
    <TenantRoute activeTab="profile">
      <TenantProfileScreen />
    </TenantRoute>
  )
}
