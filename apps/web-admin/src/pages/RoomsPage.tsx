import PlaceholderPage from '../components/common/PlaceholderPage'
import { getOwnerPage } from '../config/navigation'

function RoomsPage() {
  const page = getOwnerPage('rooms')

  return <PlaceholderPage description={page.description} />
}

export default RoomsPage
