import { useEffect, useState } from 'react'
import { useAuth } from '../../providers/AuthProvider'
import { subscribeToUserChatRooms } from './services/supabase-chat.service'

export function useChatUnreadCount() {
  const { currentUser } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      setCount(0)
      return undefined
    }

    return subscribeToUserChatRooms(
      currentUser.uid,
      (rooms) => {
        setCount(rooms.reduce((total, room) => total + (room.unreadCounts[currentUser.uid] ?? 0), 0))
      },
      (error) => {
        console.warn('Chat unread listener failed.', error)
      },
    )
  }, [currentUser])

  return count
}
