import { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { ListCard } from '../../components/cards/ListCard'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { Screen } from '../../components/common/Screen'
import { colors, spacing } from '../../constants/theme'
import { useAuth } from '../../providers/AuthProvider'
import { answerOwnerQuestion } from './ownerAiAssistant.service'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  'How many rooms are available?',
  'How much revenue did I earn this month?',
  'Which invoices are overdue?',
  'Which contracts expire soon?',
  'Show urgent feedback.',
  'What are the main tenant complaints?',
]

export function OwnerAiAssistantScreen() {
  const { currentUser } = useAuth()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const canSubmit = useMemo(() => Boolean(question.trim()) && !loading, [loading, question])

  async function ask(nextQuestion: string) {
    if (!currentUser) return

    const trimmed = nextQuestion.trim()
    if (!trimmed) return

    setMessages((current) => [...current, createMessage('user', trimmed)])
    setQuestion('')
    setLoading(true)

    try {
      const result = await answerOwnerQuestion(currentUser.uid, trimmed)
      setMessages((current) => [...current, createMessage('assistant', result.answer)])
    } catch (error) {
      console.warn('Owner AI assistant failed.', error)
      Alert.alert('AI Assistant', 'Unable to answer this question. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen subtitle="Ask questions about your boarding house data." title="Owner AI Assistant">
      <ListCard title="Suggested Questions">
        {suggestions.map((item) => (
          <PrimaryButton key={item} label={item} onPress={() => void ask(item)} variant="secondary" />
        ))}
      </ListCard>

      <ListCard title="Conversation">
        {!messages.length ? <Text style={styles.empty}>Ask your assistant about your boarding house data.</Text> : null}
        {messages.map((message) => (
          <View key={message.id} style={[styles.message, message.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
            <Text style={[styles.messageRole, message.role === 'user' ? styles.userText : null]}>
              {message.role === 'user' ? 'You' : 'Assistant'}
            </Text>
            <Text style={[styles.messageText, message.role === 'user' ? styles.userText : null]}>{message.content}</Text>
          </View>
        ))}
        {loading ? <Text style={styles.empty}>Checking your data...</Text> : null}
      </ListCard>

      <ListCard title="Ask a Question">
        <TextInput
          multiline
          placeholder="Ask about rooms, invoices, utilities, or feedback..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
        />
        <PrimaryButton disabled={!canSubmit} label={loading ? 'Thinking...' : 'Send'} onPress={() => void ask(question)} />
      </ListCard>
    </Screen>
  )
}

function createMessage(role: Message['role'], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random()}`,
    role,
    content,
  }
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 88,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  message: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  assistantMessage: { backgroundColor: colors.surface },
  userMessage: { backgroundColor: colors.primary, borderColor: colors.primary },
  messageRole: { color: colors.text, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  userText: { color: colors.surface },
})
