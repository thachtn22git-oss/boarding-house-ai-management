import { OwnerRoute } from '../components/layout/OwnerRoute'
import { ProfileScreen } from '../features/profile/ProfileScreen'

export default function ProfileRoute() {
  return (
    <OwnerRoute activeTab="profile">
      <ProfileScreen />
    </OwnerRoute>
  )
}
