import PlaceholderPage from '../components/common/PlaceholderPage'
import { getOwnerPage } from '../config/navigation'

function UtilitiesPage() {
  const page = getOwnerPage('utilities')

  return <PlaceholderPage description={page.description} />
}

export default UtilitiesPage
