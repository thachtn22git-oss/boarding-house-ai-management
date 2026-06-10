import PlaceholderPage from '../components/common/PlaceholderPage'
import { getOwnerPage } from '../config/navigation'

function ContractsPage() {
  const page = getOwnerPage('contracts')

  return <PlaceholderPage description={page.description} />
}

export default ContractsPage
