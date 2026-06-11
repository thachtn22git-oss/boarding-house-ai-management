import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../providers/AuthProvider'
import { colors, spacing } from '../../constants/theme'
import type { ChatMessage, ChatRoom } from './chat.types'
import {
  formatChatTime,
  getConversationTitle,
  markChatRoomAsRead,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToUserChatRooms,
} from './services/supabase-chat.service'

interface ChatScreenProps {
  initialRoomId?: string
}

interface ChatRoomLayoutProps {
  header: ReactNode
  children: ReactNode
  composer: ReactNode
}

function ChatRoomLayout({ header, children, composer }: ChatRoomLayoutProps) {
  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
        style={styles.roomContainer}
      >
        {header}
        <View style={styles.messagesArea}>{children}</View>
        <View
          style={[
            styles.composer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {composer}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export function ChatScreen({ initialRoomId }: ChatScreenProps) {
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId ?? null)
  const [messageText, setMessageText] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<FlatList<ChatMessage> | null>(null)

  useEffect(() => {
    if (!currentUser) return undefined

    setLoadingRooms(true)
    return subscribeToUserChatRooms(
      currentUser.uid,
      (items) => {
        setRooms(items)
        setLoadingRooms(false)
        setError(null)
      },
      (listenerError) => {
        console.warn('Chat room listener failed.', listenerError)
        setError('Unable to load conversations.')
        setLoadingRooms(false)
      },
    )
  }, [currentUser])

  useEffect(() => {
    if (initialRoomId) setSelectedRoomId(initialRoomId)
  }, [initialRoomId])

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )

  useEffect(() => {
    if (!currentUser || !selectedRoom) {
      setMessages([])
      return undefined
    }

    if (!selectedRoom.participantIds.includes(currentUser.uid)) {
      setError('You are not allowed to access this conversation.')
      return undefined
    }

    setLoadingMessages(true)
    void markChatRoomAsRead(selectedRoom.id, currentUser.uid).catch((readError) => {
      console.warn('Unable to mark chat as read.', readError)
    })

    return subscribeToChatMessages(
      selectedRoom.id,
      (items) => {
        setMessages(items)
        setLoadingMessages(false)
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
      },
      (listenerError) => {
        console.warn('Chat message listener failed.', listenerError)
        setError('Unable to load messages.')
        setLoadingMessages(false)
      },
    )
  }, [currentUser, selectedRoom])

  async function handleSend() {
    if (!currentUser || !selectedRoom || !messageText.trim()) return

    setSending(true)
    try {
      await sendChatMessage(selectedRoom.id, currentUser, messageText)
      setMessageText('')
    } catch (sendError) {
      console.warn('Unable to send message.', sendError)
      Alert.alert('Message not sent', sendError instanceof Error ? sendError.message : 'Unable to send this message.')
    } finally {
      setSending(false)
    }
  }

  if (!selectedRoom) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>Realtime conversations.</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loadingRooms ? <Text style={styles.empty}>Loading conversations...</Text> : null}
        {!loadingRooms && rooms.length === 0 ? <Text style={styles.empty}>No conversations yet.</Text> : null}
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const unreadCount = currentUser ? item.unreadCounts[currentUser.uid] ?? 0 : 0
            return (
              <Pressable style={styles.roomItem} onPress={() => setSelectedRoomId(item.id)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{currentUser ? getConversationTitle(item, currentUser.uid).slice(0, 2).toUpperCase() : 'CH'}</Text>
                </View>
                <View style={styles.roomCopy}>
                  <Text style={styles.roomTitle}>{currentUser ? getConversationTitle(item, currentUser.uid) : 'Conversation'}</Text>
                  <Text numberOfLines={1} style={styles.roomMessage}>{item.lastMessage ?? 'No messages yet'}</Text>
                </View>
                <View style={styles.roomMeta}>
                  <Text style={styles.time}>{formatChatTime(item.lastMessageAt ?? item.updatedAt)}</Text>
                  {unreadCount > 0 ? <Text style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</Text> : null}
                </View>
              </Pressable>
            )
          }}
        />
      </SafeAreaView>
    )
  }

  return (
    <ChatRoomLayout
      header={
        <View style={styles.chatHeader}>
          <Pressable onPress={() => setSelectedRoomId(null)}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
          <View style={styles.chatHeaderCopy}>
            <Text style={styles.title}>{currentUser ? getConversationTitle(selectedRoom, currentUser.uid) : 'Conversation'}</Text>
            <Text style={styles.subtitle}>{selectedRoom.type === 'owner_tenant' ? 'Owner and tenant' : 'Tenant conversation'}</Text>
          </View>
        </View>
      }
      composer={
        <>
          <TextInput
            multiline
            value={messageText}
            placeholder="Type a message"
            placeholderTextColor={colors.muted}
            style={styles.input}
            onChangeText={setMessageText}
          />
          <Pressable disabled={sending || !messageText.trim()} style={[styles.sendButton, sending || !messageText.trim() ? styles.disabled : null]} onPress={() => void handleSend()}>
            <Text style={styles.sendText}>{sending ? 'Sending' : 'Send'}</Text>
          </Pressable>
        </>
      }
    >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loadingMessages ? <Text style={styles.empty}>Loading messages...</Text> : null}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messageListScroll}
          contentContainerStyle={styles.messageListContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isOwn = item.senderId === currentUser?.uid
            return (
              <View style={[styles.messageRow, isOwn ? styles.ownMessageRow : null]}>
                <View style={[styles.messageBubble, isOwn ? styles.ownBubble : null]}>
                  {!isOwn ? <Text style={styles.senderName}>{item.senderName}</Text> : null}
                  <Text style={[styles.messageText, isOwn ? styles.ownMessageText : null]}>{item.text}</Text>
                  <Text style={[styles.messageTime, isOwn ? styles.ownMessageTime : null]}>{formatChatTime(item.createdAt)}</Text>
                </View>
              </View>
            )
          }}
        />
    </ChatRoomLayout>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, gap: spacing.xs },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontWeight: '700', paddingHorizontal: spacing.lg },
  empty: { color: colors.muted, fontSize: 15, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  listContent: { gap: spacing.md, padding: spacing.lg, paddingBottom: 110 },
  roomItem: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 42, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: colors.surface, fontSize: 12, fontWeight: '800' },
  roomCopy: { flex: 1, gap: spacing.xs },
  roomTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  roomMessage: { color: colors.muted, fontSize: 13 },
  roomMeta: { alignItems: 'flex-end', gap: spacing.sm },
  time: { color: colors.muted, fontSize: 11 },
  badge: { backgroundColor: colors.danger, borderRadius: 999, color: colors.surface, fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: 2 },
  roomContainer: { flex: 1 },
  chatHeader: { alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  chatHeaderCopy: { flex: 1 },
  back: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  messagesArea: { flex: 1, backgroundColor: colors.background },
  messageListScroll: { flex: 1 },
  messageListContent: { gap: spacing.sm, padding: 16, paddingBottom: 24 },
  messageRow: { alignItems: 'flex-start' },
  ownMessageRow: { alignItems: 'flex-end' },
  messageBubble: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, maxWidth: '82%', padding: spacing.md },
  ownBubble: { backgroundColor: colors.primary, borderColor: colors.primary },
  senderName: { color: colors.text, fontSize: 12, fontWeight: '800', marginBottom: spacing.xs },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  ownMessageText: { color: colors.surface },
  messageTime: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  ownMessageTime: { color: '#DBEAFE' },
  composer: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  input: { borderColor: colors.border, borderRadius: 16, borderWidth: 1, color: colors.text, flex: 1, maxHeight: 110, minHeight: 46, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sendButton: { alignItems: 'center', alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing.lg },
  disabled: { opacity: 0.5 },
  sendText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
})
