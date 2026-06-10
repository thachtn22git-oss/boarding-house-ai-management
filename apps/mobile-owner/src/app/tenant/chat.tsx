import { useLocalSearchParams } from 'expo-router'
import { TenantRoute } from '../../components/layout/TenantRoute'
import { ChatScreen } from '../../features/chat/ChatScreen'

export default function TenantChatRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>()

  return (
    <TenantRoute activeTab="chat">
      <ChatScreen initialRoomId={roomId} />
    </TenantRoute>
  )
}
