import {
  getSupabaseErrorMessage,
  isSupabaseConfigured,
  logSupabaseError,
  supabase,
} from '../../../lib/supabase'
import type {
  AssistantConversation,
  AssistantIntent,
  AssistantMessageRecord,
  AssistantMessageRole,
} from './ai-assistant.service'

type AIConversationRow = {
  id: string
  owner_id: string
  title: string
  created_at: string
  updated_at: string
}

type AIMessageRow = {
  id: string
  conversation_id: string
  owner_id: string
  role: AssistantMessageRole
  content: string
  intent: AssistantIntent | null
  created_at: string
}

let lastAIHistoryError: unknown = null

export function getLastAIHistoryError() {
  return lastAIHistoryError
}

function clearAIHistoryError() {
  lastAIHistoryError = null
}

function rememberAIHistoryError(error: unknown) {
  lastAIHistoryError = error
}

function ensureSupabase() {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. AI history and chat persistence are disabled.')
    return null
  }

  return supabase
}

export function getAIHistoryUnavailableMessage(error?: unknown) {
  if (!error) return 'AI conversation history is unavailable. You can still use temporary chat.'

  return `${getSupabaseErrorMessage(error)} You can still use temporary chat.`
}

function mapConversation(row: AIConversationRow): AssistantConversation {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessage(row: AIMessageRow): AssistantMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

export async function createConversation(ownerId: string, title = 'New Conversation') {
  const client = ensureSupabase()
  if (!client) return null

  console.info('Creating AI conversation...', { ownerId, title })
  const { data, error } = await client
    .from('ai_conversations')
    .insert({ owner_id: ownerId, title })
    .select('*')
    .single<AIConversationRow>()

  if (error) {
    rememberAIHistoryError(error)
    logSupabaseError('Creating AI conversation', error)
    return null
  }

  clearAIHistoryError()
  console.info('AI conversation created.', { id: data.id })
  return mapConversation(data)
}

export async function listConversations(ownerId: string) {
  const client = ensureSupabase()
  if (!client) return []

  console.info('Loading AI conversations...', { ownerId })
  const { data, error } = await client
    .from('ai_conversations')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (error) {
    rememberAIHistoryError(error)
    logSupabaseError('Loading AI conversations', error)
    return []
  }

  clearAIHistoryError()
  console.info('AI conversations loaded.', { count: data?.length ?? 0 })
  return (data as AIConversationRow[]).map(mapConversation)
}

export async function getConversationMessages(conversationId: string, ownerId: string) {
  const client = ensureSupabase()
  if (!client) return []

  console.info('Loading AI conversation messages...', { conversationId, ownerId })
  const { data, error } = await client
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    rememberAIHistoryError(error)
    logSupabaseError('Loading AI conversation messages', error)
    return []
  }

  clearAIHistoryError()
  return (data as AIMessageRow[]).map(mapMessage)
}

export async function saveUserMessage(
  conversationId: string,
  ownerId: string,
  content: string,
  intent: AssistantIntent,
) {
  return saveMessage(conversationId, ownerId, 'user', content, intent)
}

export async function saveAssistantMessage(
  conversationId: string,
  ownerId: string,
  content: string,
  intent: AssistantIntent,
) {
  return saveMessage(conversationId, ownerId, 'assistant', content, intent)
}

async function saveMessage(
  conversationId: string,
  ownerId: string,
  role: AssistantMessageRole,
  content: string,
  intent: AssistantIntent,
) {
  const client = ensureSupabase()
  if (!client) return null

  const { data, error } = await client
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      owner_id: ownerId,
      role,
      content,
      intent,
    })
    .select('*')
    .single<AIMessageRow>()

  if (error) {
    rememberAIHistoryError(error)
    logSupabaseError(`Saving AI ${role} message`, error)
    return null
  }

  clearAIHistoryError()
  return mapMessage(data)
}

export async function updateConversationTitle(
  conversationId: string,
  ownerId: string,
  title: string,
) {
  const client = ensureSupabase()
  if (!client) return null

  const { data, error } = await client
    .from('ai_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('owner_id', ownerId)
    .select('*')
    .single<AIConversationRow>()

  if (error) {
    rememberAIHistoryError(error)
    logSupabaseError('Updating AI conversation title', error)
    return null
  }

  clearAIHistoryError()
  return mapConversation(data)
}

export async function touchConversation(conversationId: string, ownerId: string) {
  const client = ensureSupabase()
  if (!client) return null

  const { data, error } = await client
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('owner_id', ownerId)
    .select('*')
    .single<AIConversationRow>()

  if (error) {
    rememberAIHistoryError(error)
    logSupabaseError('Touching AI conversation', error)
    return null
  }

  clearAIHistoryError()
  return mapConversation(data)
}

export async function logAIUsage(
  ownerId: string,
  conversationId: string | null,
  question: string,
  intent: AssistantIntent,
  answerPreview: string,
) {
  const client = ensureSupabase()
  if (!client) return

  const { error } = await client.from('ai_usage_logs').insert({
    owner_id: ownerId,
    conversation_id: conversationId,
    question,
    intent,
    answer_preview: answerPreview,
  })

  if (error) {
    rememberAIHistoryError(error)
    logSupabaseError('Logging AI usage', error)
  } else {
    clearAIHistoryError()
  }
}

export { isSupabaseConfigured }
