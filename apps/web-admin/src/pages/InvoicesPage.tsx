import PlaceholderPage from '../components/common/PlaceholderPage'
import { getOwnerPage } from '../config/navigation'

function InvoicesPage() {
  const page = getOwnerPage('invoices')

  return <PlaceholderPage description={page.description} />
}

export default InvoicesPage
