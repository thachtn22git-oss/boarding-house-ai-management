import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing } from '../../constants/theme'
import { useAuth } from '../../providers/AuthProvider'
import { formatRelativeTime } from '../../utils/format'
import {
  askOwnerAssistant,
  createAssistantConversation,
  deleteAssistantConversation,
  getAssistantMessages,
  getOwnerAIConversations,
  updateAssistantConversationTitle,
  type AssistantConversation,
  type AssistantMessageRecord,
} from './ownerAiAssistant.service'

const suggestions = [
  'How many rooms are available?',
  'How much revenue did I earn this month?',
  'Which invoices are overdue?',
  'Which contracts expire soon?',
  'Show urgent feedback.',
  'What are the main tenant complaints?',
  'How many tenants do I have?',
  'Show utility summary.',
]

export function OwnerAiAssistantScreen() {
  const { currentUser } = useAuth()
  const insets = useSafeAreaInsets()
  const listRef = useRef<FlatList<AssistantMessageRecord> | null>(null)
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<AssistantConversation | null>(null)
  const [messages, setMessages] = useState<AssistantMessageRecord[]>([])
  const [question, setQuestion] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [actionConversation, setActionConversation] = useState<AssistantConversation | null>(null)
  const [renameConversation, setRenameConversation] = useState<AssistantConversation | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const canSubmit = useMemo(() => Boolean(question.trim()) && !sending, [loadingMessages, question, sending])

  const loadConversations = useCallback(async () => {
    if (!currentUser) {
      setLoadingConversations(false)
      return
    }

    setLoadingConversations(true)
    setError('')

    try {
      const nextConversations = await getOwnerAIConversations(currentUser.uid)
      setConversations(nextConversations)
    } catch (loadError) {
      console.warn('Unable to load AI conversations.', loadError)
      setError('Unable to load AI conversations.')
    } finally {
      setLoadingConversations(false)
    }
  }, [currentUser])

  const loadMessages = useCallback(async (conversation: AssistantConversation) => {
    setLoadingMessages(true)
    setError('')

    try {
      const nextMessages = await getAssistantMessages(conversation.id)
      setMessages(nextMessages)
    } catch (loadError) {
      console.warn('Unable to load AI messages.', loadError)
      setError('Unable to load this conversation.')
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (messages.length === 0) return

    const timeoutId = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 80)

    return () => clearTimeout(timeoutId)
  }, [messages])

  async function openConversation(conversation: AssistantConversation) {
    setActionConversation(null)
    setSelectedConversation(conversation)
    await loadMessages(conversation)
  }

  async function startNewChat() {
    if (!currentUser || sending) return

    setActionConversation(null)
    try {
      const conversation = await createAssistantConversation(currentUser.uid)
      setConversations((current) => [conversation, ...current])
      setSelectedConversation(conversation)
      setMessages([])
    } catch (createError) {
      console.warn('Unable to create AI conversation.', createError)
      Alert.alert('AI Assistant', 'Unable to create a new chat. Please try again.')
    }
  }

  function openRename(conversation: AssistantConversation) {
    setActionConversation(null)
    setRenameConversation(conversation)
    setRenameValue(conversation.title)
  }

  async function saveRename() {
    if (!currentUser || !renameConversation) return

    const nextTitle = renameValue.trim() || renameConversation.title
    const optimisticConversation = {
      ...renameConversation,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    }

    setRenameConversation(null)
    setRenameValue('')
    setConversations((current) =>
      current.map((item) => (item.id === renameConversation.id ? optimisticConversation : item)),
    )
    setSelectedConversation((current) =>
      current?.id === renameConversation.id ? optimisticConversation : current,
    )

    try {
      const updatedConversation = await updateAssistantConversationTitle(
        renameConversation.id,
        currentUser.uid,
        nextTitle,
      )
      setConversations((current) =>
        current.map((item) => (item.id === updatedConversation.id ? updatedConversation : item)),
      )
      setSelectedConversation((current) =>
        current?.id === updatedConversation.id ? updatedConversation : current,
      )
    } catch (renameError) {
      console.warn('Unable to rename AI conversation.', renameError)
      Alert.alert('AI Assistant', 'Unable to rename this conversation. Please try again.')
      void loadConversations()
    }
  }

  function confirmDelete(conversation: AssistantConversation) {
    setActionConversation(null)
    Alert.alert(
      'Delete conversation?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteConversation(conversation),
        },
      ],
    )
  }

  async function deleteConversation(conversation: AssistantConversation) {
    if (!currentUser) return

    const remainingConversations = conversations.filter((item) => item.id !== conversation.id)
    setConversations(remainingConversations)

    if (selectedConversation?.id === conversation.id) {
      const nextConversation = remainingConversations[0] ?? null
      setSelectedConversation(nextConversation)
      if (nextConversation) {
        await loadMessages(nextConversation)
      } else {
        setMessages([])
      }
    }

    try {
      await deleteAssistantConversation(conversation.id, currentUser.uid)
    } catch (deleteError) {
      console.warn('Unable to delete AI conversation.', deleteError)
      Alert.alert('AI Assistant', 'Unable to delete this conversation. Please try again.')
      void loadConversations()
    }
  }

  async function ask(nextQuestion: string) {
    if (!currentUser) return

    const trimmed = nextQuestion.trim()
    if (!trimmed || sending) return

    setQuestion('')
    setSending(true)
    setError('')

    try {
      const result = await askOwnerAssistant({
        ownerId: currentUser.uid,
        question: trimmed,
        conversationId: selectedConversation?.id,
        conversationTitle: selectedConversation?.title,
      })

      setSelectedConversation(result.conversation)
      setMessages((current) => [...current, result.userMessage, result.assistantMessage])
      setConversations((current) => {
        const withoutCurrent = current.filter((item) => item.id !== result.conversation.id)

        return [result.conversation, ...withoutCurrent]
      })
    } catch (submitError) {
      console.warn('Owner AI assistant failed.', submitError)
      setQuestion(trimmed)
      Alert.alert('AI Assistant', 'Unable to answer this question. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!selectedConversation) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.eyebrow}>Owner AI Assistant</Text>
            <Text style={styles.title}>Recent Chats</Text>
            <Text style={styles.subtitle}>Ask questions about your boarding house data.</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => void startNewChat()}>
            <Text style={styles.primaryButtonText}>New Chat</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loadingConversations ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.emptyText}>Loading recent chats...</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.conversationContent}
            data={conversations}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>No conversations yet. Start a new chat to ask your assistant.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.conversationCard} onPress={() => void openConversation(item)}>
                <View style={styles.conversationCopy}>
                  <Text style={styles.conversationTitle}>{item.title}</Text>
                  <Text style={styles.conversationTime}>{formatRelativeTime(item.updatedAt ?? item.createdAt)}</Text>
                </View>
                <Pressable
                  hitSlop={10}
                  style={styles.conversationAction}
                  onPress={(event) => {
                    event.stopPropagation()
                    setActionConversation(item)
                  }}
                >
                  <Text style={styles.conversationActionText}>...</Text>
                </Pressable>
              </Pressable>
            )}
          />
        )}
        <ConversationActionModal
          conversation={actionConversation}
          onClose={() => setActionConversation(null)}
          onDelete={confirmDelete}
          onRename={openRename}
        />
        <RenameConversationModal
          conversation={renameConversation}
          value={renameValue}
          onCancel={() => {
            setRenameConversation(null)
            setRenameValue('')
          }}
          onChangeValue={setRenameValue}
          onSave={() => void saveRename()}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
        style={styles.keyboardView}
      >
        <View style={styles.chatHeader}>
          <Pressable style={styles.backButton} onPress={() => setSelectedConversation(null)}>
            <Text style={styles.backButtonText}>Recent Chats</Text>
          </Pressable>
          <View style={styles.chatHeaderText}>
            <Text style={styles.eyebrow}>AI Assistant</Text>
            <Text style={styles.chatTitle}>{selectedConversation.title}</Text>
          </View>
          <Pressable style={styles.newChatButton} onPress={() => void startNewChat()}>
            <Text style={styles.newChatButtonText}>New</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loadingMessages ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.emptyText}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            contentContainerStyle={styles.messageContent}
            data={messages}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>Ask your assistant about rooms, invoices, contracts, utilities, or feedback.</Text>}
            renderItem={({ item }) => (
              <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageRole, item.role === 'user' ? styles.userText : null]}>
                  {item.role === 'user' ? 'You' : 'Assistant'}
                </Text>
                <Text style={[styles.messageText, item.role === 'user' ? styles.userText : null]}>{item.content}</Text>
              </View>
            )}
          />
        )}

        <ScrollView
          horizontal
          contentContainerStyle={styles.suggestionsContent}
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsRow}
        >
          {suggestions.map((item) => (
            <Pressable key={item} disabled={sending} style={styles.suggestionChip} onPress={() => void ask(item)}>
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            multiline
            placeholder="Ask about your boarding house data..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
          />
          <Pressable
            disabled={!canSubmit}
            style={[styles.sendButton, !canSubmit ? styles.disabledButton : null]}
            onPress={() => void ask(question)}
          >
            <Text style={styles.sendButtonText}>{sending ? 'Thinking...' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <ConversationActionModal
        conversation={actionConversation}
        onClose={() => setActionConversation(null)}
        onDelete={confirmDelete}
        onRename={openRename}
      />
      <RenameConversationModal
        conversation={renameConversation}
        value={renameValue}
        onCancel={() => {
          setRenameConversation(null)
          setRenameValue('')
        }}
        onChangeValue={setRenameValue}
        onSave={() => void saveRename()}
      />
    </SafeAreaView>
  )
}

function ConversationActionModal({
  conversation,
  onClose,
  onDelete,
  onRename,
}: {
  conversation: AssistantConversation | null
  onClose: () => void
  onDelete: (conversation: AssistantConversation) => void
  onRename: (conversation: AssistantConversation) => void
}) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(conversation)} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.actionSheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.actionSheetTitle}>{conversation?.title ?? 'Conversation'}</Text>
          <Pressable
            style={styles.actionSheetButton}
            onPress={() => {
              if (conversation) onRename(conversation)
            }}
          >
            <Text style={styles.actionSheetButtonText}>Rename</Text>
          </Pressable>
          <Pressable
            style={styles.actionSheetButton}
            onPress={() => {
              if (conversation) onDelete(conversation)
            }}
          >
            <Text style={[styles.actionSheetButtonText, styles.dangerText]}>Delete</Text>
          </Pressable>
          <Pressable style={styles.actionSheetCancel} onPress={onClose}>
            <Text style={styles.actionSheetCancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function RenameConversationModal({
  conversation,
  value,
  onCancel,
  onChangeValue,
  onSave,
}: {
  conversation: AssistantConversation | null
  value: string
  onCancel: () => void
  onChangeValue: (value: string) => void
  onSave: () => void
}) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(conversation)} onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.renameModal}>
          <Text style={styles.renameTitle}>Rename conversation</Text>
          <TextInput
            autoFocus
            placeholder="Conversation title"
            placeholderTextColor={colors.muted}
            style={styles.renameInput}
            value={value}
            onChangeText={onChangeValue}
          />
          <View style={styles.renameActions}>
            <Pressable style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  listHeader: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '900',
  },
  conversationContent: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 120,
  },
  conversationCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  conversationCopy: {
    flex: 1,
  },
  conversationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  conversationTime: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  conversationAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  conversationActionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 16,
  },
  chatHeader: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  backButton: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  newChatButton: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newChatButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  messageContent: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messageBubble: {
    borderRadius: 18,
    maxWidth: '86%',
    padding: spacing.md,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  messageRole: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: colors.surface,
  },
  suggestionsRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 70,
  },
  suggestionsContent: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  suggestionChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 220,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sendButtonText: {
    color: colors.surface,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.5,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: spacing.lg,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  actionSheet: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.md,
    width: '100%',
    maxWidth: 360,
  },
  actionSheetTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionSheetButton: {
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  actionSheetButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  dangerText: {
    color: colors.danger,
  },
  actionSheetCancel: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  actionSheetCancelText: {
    color: colors.text,
    fontWeight: '900',
  },
  renameModal: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  renameTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  renameInput: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  renameActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '900',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  saveButtonText: {
    color: colors.surface,
    fontWeight: '900',
  },
})
