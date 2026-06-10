import { OwnerRoute } from '../components/layout/OwnerRoute'
import { TenantsScreen } from '../features/dashboard/OwnerListScreens'

export default function TenantsRoute() {
  return (
    <OwnerRoute activeTab="tenants">
      <TenantsScreen />
    </OwnerRoute>
  )
}
