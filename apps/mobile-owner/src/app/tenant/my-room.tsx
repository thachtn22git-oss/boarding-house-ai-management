import { TenantRoute } from '../../components/layout/TenantRoute'
import { MyRoomScreen } from '../../features/tenant-portal/TenantDetailScreens'

export default function MyRoomRoute() {
  return (
    <TenantRoute activeTab="room">
      <MyRoomScreen />
    </TenantRoute>
  )
}
