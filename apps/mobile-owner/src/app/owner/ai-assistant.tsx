import { OwnerRoute } from '../../components/layout/OwnerRoute'
import { OwnerAiAssistantScreen } from '../../features/ai-assistant/OwnerAiAssistantScreen'

export default function OwnerAiAssistantRoute() {
  return (
    <OwnerRoute activeTab="aiAssistant">
      <OwnerAiAssistantScreen />
    </OwnerRoute>
  )
}
