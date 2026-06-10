import { TenantRoute } from '../../components/layout/TenantRoute'
import { MyUtilitiesScreen } from '../../features/tenant-portal/TenantDetailScreens'

export default function MyUtilitiesRoute() {
  return (
    <TenantRoute activeTab="utilities">
      <MyUtilitiesScreen />
    </TenantRoute>
  )
}
