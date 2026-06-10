import { TenantRoute } from '../../components/layout/TenantRoute'
import { MyFeedbackScreen } from '../../features/tenant-portal/TenantDetailScreens'

export default function MyFeedbackRoute() {
  return (
    <TenantRoute activeTab="feedback">
      <MyFeedbackScreen />
    </TenantRoute>
  )
}
