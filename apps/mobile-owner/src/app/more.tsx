import { OwnerRoute } from '../components/layout/OwnerRoute'
import { MoreScreen } from '../features/profile/MoreScreen'
import { useOwnerNavigation } from '../components/layout/useOwnerNavigation'

export default function MoreRoute() {
  const navigate = useOwnerNavigation()

  return (
    <OwnerRoute activeTab="more">
      <MoreScreen onNavigate={navigate} />
    </OwnerRoute>
  )
}
