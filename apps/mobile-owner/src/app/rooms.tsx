import { OwnerRoute } from '../components/layout/OwnerRoute'
import { RoomsScreen } from '../features/dashboard/OwnerListScreens'

export default function RoomsRoute() {
  return (
    <OwnerRoute activeTab="rooms">
      <RoomsScreen />
    </OwnerRoute>
  )
}
