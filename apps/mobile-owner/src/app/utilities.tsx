import { OwnerRoute } from '../components/layout/OwnerRoute'
import { UtilitiesScreen } from '../features/dashboard/OwnerListScreens'

export default function UtilitiesRoute() {
  return (
    <OwnerRoute activeTab="utilities">
      <UtilitiesScreen />
    </OwnerRoute>
  )
}
