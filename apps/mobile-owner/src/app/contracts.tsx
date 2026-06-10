import { OwnerRoute } from '../components/layout/OwnerRoute'
import { ContractsScreen } from '../features/dashboard/OwnerListScreens'

export default function ContractsRoute() {
  return (
    <OwnerRoute activeTab="contracts">
      <ContractsScreen />
    </OwnerRoute>
  )
}
