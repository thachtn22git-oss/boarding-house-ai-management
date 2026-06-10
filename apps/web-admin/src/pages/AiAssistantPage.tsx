import PlaceholderPage from '../components/common/PlaceholderPage'
import { getOwnerPage } from '../config/navigation'

function AiAssistantPage() {
  const page = getOwnerPage('aiAssistant')

  return <PlaceholderPage description={page.description} />
}

export default AiAssistantPage
