import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'
import ChatContactList from '../components/ChatContactList'
import ChatEmptyState from '../components/ChatEmptyState'
import ChatLayout from '../components/ChatLayout'
import ChatMessageInput from '../components/ChatMessageInput'
import ChatMessageList from '../components/ChatMessageList'
import ChatRoomList from '../components/ChatRoomList'
import {
  formatChatDate,
  getConversationTitle,
  getRoomTypeLabel,
} from '../components/chatDisplay'
import {
  getChatContacts,
  getOrCreateOwnerTenantChatRoom,
  getOrCreateTenantTenantChatRoom,
  markChatRoomAsRead,
  sendMessage,
  subscribeToChatMessages,
  subscribeToUserChatRooms,
} from '../services/chat.service'
import type { ChatContact, ChatMessage, ChatRoom } from '../types'

function ChatPage() {
  const { currentUser } = useAuth()
  const [searchParams] = useSearchParams()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      setIsLoadingRooms(false)
      return undefined
    }

    setIsLoadingRooms(true)
    setError('')

    return subscribeToUserChatRooms(
      currentUser.uid,
      (nextRooms) => {
        setRooms(nextRooms)
        setIsLoadingRooms(false)
        setError('')
      },
      (subscriptionError) => {
        console.warn('Unable to subscribe to chat rooms.', subscriptionError)
        setError('Error loading chat.')
        setIsLoadingRooms(false)
      },
    )
  }, [currentUser])

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )

  useEffect(() => {
    const roomIdFromUrl = searchParams.get('roomId')

    if (
      roomIdFromUrl &&
      rooms.some((room) => room.id === roomIdFromUrl) &&
      selectedRoomId !== roomIdFromUrl
    ) {
      setSelectedRoomId(roomIdFromUrl)
    }
  }, [rooms, searchParams, selectedRoomId])

  useEffect(() => {
    if (!selectedRoom || !currentUser) {
      setMessages([])
      return undefined
    }

    if (!selectedRoom.participantIds.includes(currentUser.uid)) {
      setError('You are not allowed to access this conversation.')
      setMessages([])
      return undefined
    }

    setIsLoadingMessages(true)
    void markChatRoomAsRead(selectedRoom.id, currentUser.uid).catch((readError) => {
      console.warn('Unable to mark chat room as read.', readError)
    })

    return subscribeToChatMessages(
      selectedRoom.id,
      (nextMessages) => {
        setMessages(nextMessages)
        setIsLoadingMessages(false)
      },
      (messagesError) => {
        console.warn('Unable to subscribe to chat messages.', messagesError)
        setError('Error loading chat.')
        setIsLoadingMessages(false)
      },
    )
  }, [currentUser, selectedRoom])

  const filteredRooms = useMemo(() => {
    if (!currentUser) {
      return []
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()

    return rooms.filter((room) => {
      const title = getConversationTitle(room, currentUser.uid).toLowerCase()
      const lastMessage = room.lastMessage?.toLowerCase() ?? ''

      return (
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        lastMessage.includes(normalizedSearch)
      )
    })
  }, [currentUser, rooms, searchTerm])

  async function handleOpenContacts() {
    if (!currentUser) {
      return
    }

    setContactsOpen(true)
    setIsLoadingContacts(true)
    setError('')

    try {
      setContacts(await getChatContacts(currentUser))
    } catch (contactsError) {
      console.warn('Unable to load chat contacts.', contactsError)
      setContacts([])
      setError('Unable to load contacts. Please try again.')
    } finally {
      setIsLoadingContacts(false)
    }
  }

  async function handleSelectContact(contact: ChatContact) {
    if (!currentUser) {
      return
    }

    setError('')

    try {
      let room: ChatRoom | null = null

      if (
        currentUser.role === 'owner' &&
        contact.role === 'tenant' &&
        contact.tenantProfile
      ) {
        room = await getOrCreateOwnerTenantChatRoom(
          currentUser.uid,
          contact.userId,
          contact.tenantProfile,
        )
      }

      if (
        currentUser.role === 'tenant' &&
        contact.role === 'owner' &&
        contact.currentTenantProfile
      ) {
        room = await getOrCreateOwnerTenantChatRoom(
          contact.userId,
          currentUser.uid,
          contact.currentTenantProfile,
        )
      }

      if (
        currentUser.role === 'tenant' &&
        contact.role === 'tenant' &&
        contact.currentTenantProfile &&
        contact.tenantProfile
      ) {
        room = await getOrCreateTenantTenantChatRoom(
          currentUser.uid,
          contact.userId,
          contact.currentTenantProfile,
          contact.tenantProfile,
        )
      }

      if (!room) {
        setError('Unable to start this conversation.')
        return
      }

      setSelectedRoomId(room.id)
      setContactsOpen(false)
    } catch (startError) {
      console.warn('Unable to start chat.', startError)
      setError('Unable to start this conversation.')
    }
  }

  function handleSelectRoom(room: ChatRoom) {
    if (!currentUser) {
      return
    }

    if (!room.participantIds.includes(currentUser.uid)) {
      setError('You are not allowed to access this conversation.')
      return
    }

    setError('')
    setSelectedRoomId(room.id)
  }

  async function handleSendMessage(text: string) {
    if (!currentUser || !selectedRoom) {
      return
    }

    if (!selectedRoom.participantIds.includes(currentUser.uid)) {
      setError('You are not allowed to access this conversation.')
      return
    }

    setIsSending(true)
    setError('')

    try {
      await sendMessage(
        selectedRoom.id,
        {
          uid: currentUser.uid,
          fullName: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        },
        text,
      )
    } catch (sendError) {
      console.warn('Unable to send chat message.', sendError)
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Unable to send this message.',
      )
    } finally {
      setIsSending(false)
    }
  }

  if (currentUser?.role === 'admin') {
    return (
      <div className="chat-page">
        <section className="dashboard-card chat-admin-placeholder">
          <h2>Admin chat monitoring will be implemented in a later phase.</h2>
          <p>
            Chat monitoring tools will appear here after the admin workflow is
            defined.
          </p>
        </section>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="chat-page">
        <section className="dashboard-card chat-admin-placeholder">
          <h2>Chat unavailable</h2>
          <p>You must be signed in to use chat.</p>
        </section>
      </div>
    )
  }

  const sidebar = (
    <>
      <div className="chat-sidebar-header">
        <div>
          <h2>Conversations</h2>
          <p>Realtime messages with your contacts.</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => void handleOpenContacts()}
        >
          Start Chat
        </button>
      </div>

      <label className="chat-search">
        <span>Search conversations</span>
        <input
          type="search"
          value={searchTerm}
          placeholder="Search conversations"
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      {isLoadingRooms ? (
        <p className="chat-muted">Loading conversations...</p>
      ) : (
        <ChatRoomList
          rooms={filteredRooms}
          currentUserId={currentUser.uid}
          selectedRoomId={selectedRoomId ?? undefined}
          onSelectRoom={handleSelectRoom}
        />
      )}
    </>
  )

  const main = selectedRoom ? (
    <div className="chat-conversation">
      <header className="chat-conversation-header">
        <div>
          <h2>{getConversationTitle(selectedRoom, currentUser.uid)}</h2>
          <p>{getRoomTypeLabel(selectedRoom.type)}</p>
        </div>
      </header>

      {error ? <div className="chat-error">{error}</div> : null}

      <ChatMessageList
        messages={messages}
        currentUserId={currentUser.uid}
        loading={isLoadingMessages}
      />

      <ChatMessageInput
        sending={isSending}
        disabled={!selectedRoom.participantIds.includes(currentUser.uid)}
        onSend={handleSendMessage}
      />
    </div>
  ) : (
    <ChatEmptyState
      title={rooms.length === 0 ? 'No conversations yet' : 'Select a conversation'}
      message={
        rooms.length === 0
          ? 'Start a chat to send and receive realtime messages.'
          : 'Choose a conversation from the list to start chatting.'
      }
      action={
        <button
          className="primary-button"
          type="button"
          onClick={() => void handleOpenContacts()}
        >
          Start Chat
        </button>
      }
    />
  )

  const details = selectedRoom ? (
    <div className="chat-details-card">
      <h2>Contact Details</h2>
      <dl>
        <div>
          <dt>Participants</dt>
          <dd>
            {selectedRoom.participantIds
              .map((participantId) => selectedRoom.participantNames[participantId])
              .filter(Boolean)
              .join(', ')}
          </dd>
        </div>
        <div>
          <dt>Room Type</dt>
          <dd>{getRoomTypeLabel(selectedRoom.type)}</dd>
        </div>
        <div>
          <dt>Last Activity</dt>
          <dd>{formatChatDate(selectedRoom.lastMessageAt ?? selectedRoom.updatedAt) || '-'}</dd>
        </div>
      </dl>
    </div>
  ) : (
    <div className="chat-details-card">
      <h2>Conversation Details</h2>
      <p>Select a conversation to view participants and last activity.</p>
    </div>
  )

  return (
    <>
      <ChatLayout sidebar={sidebar} main={main} details={details} />
      <ChatContactList
        open={contactsOpen}
        contacts={contacts}
        loading={isLoadingContacts}
        onClose={() => setContactsOpen(false)}
        onSelectContact={(contact) => void handleSelectContact(contact)}
      />
    </>
  )
}

export default ChatPage
