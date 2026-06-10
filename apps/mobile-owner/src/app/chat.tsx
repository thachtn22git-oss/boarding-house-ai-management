import { useLocalSearchParams } from 'expo-router'
import { ChatScreen } from '../features/chat/ChatScreen'
import { OwnerRoute } from '../components/layout/OwnerRoute'

export default function ChatRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>()

  return (
    <OwnerRoute activeTab="chat">
      <ChatScreen initialRoomId={roomId} />
    </OwnerRoute>
  )
}
