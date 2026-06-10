import { OwnerRoute } from '../components/layout/OwnerRoute'
import { FeedbackScreen } from '../features/dashboard/OwnerListScreens'

export default function FeedbackRoute() {
  return (
    <OwnerRoute activeTab="feedback">
      <FeedbackScreen />
    </OwnerRoute>
  )
}
