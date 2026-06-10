import PlaceholderPage from '../components/common/PlaceholderPage'
import { getOwnerPage } from '../config/navigation'

function FeedbacksPage() {
  const page = getOwnerPage('feedback')

  return <PlaceholderPage description={page.description} />
}

export default FeedbacksPage
