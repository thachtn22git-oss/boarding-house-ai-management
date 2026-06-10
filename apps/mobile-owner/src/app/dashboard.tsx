import { DashboardScreen } from '../features/dashboard/DashboardScreen'
import { OwnerRoute } from '../components/layout/OwnerRoute'

export default function DashboardRoute() {
  return (
    <OwnerRoute activeTab="dashboard">
      <DashboardScreen />
    </OwnerRoute>
  )
}
