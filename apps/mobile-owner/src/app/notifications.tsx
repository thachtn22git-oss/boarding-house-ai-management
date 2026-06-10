import { OwnerRoute } from '../components/layout/OwnerRoute'
import { NotificationsScreen } from '../features/notifications/NotificationsScreen'

export default function NotificationsRoute() {
  return (
    <OwnerRoute activeTab="notifications">
      <NotificationsScreen />
    </OwnerRoute>
  )
}
