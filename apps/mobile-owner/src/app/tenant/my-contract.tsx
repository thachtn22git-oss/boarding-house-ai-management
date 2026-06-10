import { TenantRoute } from '../../components/layout/TenantRoute'
import { MyContractScreen } from '../../features/tenant-portal/TenantDetailScreens'

export default function MyContractRoute() {
  return (
    <TenantRoute activeTab="contract">
      <MyContractScreen />
    </TenantRoute>
  )
}
