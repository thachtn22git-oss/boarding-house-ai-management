import PlaceholderPage from '../components/common/PlaceholderPage'
import { getOwnerPage } from '../config/navigation'

function TenantsPage() {
  const page = getOwnerPage('tenants')

  return <PlaceholderPage description={page.description} />
}

export default TenantsPage
