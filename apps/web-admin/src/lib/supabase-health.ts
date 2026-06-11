import { getSupabaseErrorMessage, isSupabaseConfigured, logSupabaseError, supabase } from './supabase'

const supabaseTables = [
  'ai_conversations',
  'ai_messages',
  'ai_usage_logs',
  'chat_rooms',
  'chat_messages',
]

export async function checkSupabaseTables() {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('Supabase is not configured. Check .env.')
    return {
      ok: false,
      errors: ['Supabase is not configured. Check .env.'],
    }
  }

  const client = supabase
  const results = await Promise.allSettled(
    supabaseTables.map(async (table) => {
      const { error } = await client.from(table).select('*').limit(1)

      if (error) {
        logSupabaseError(`Supabase health check for ${table}`, error)
        throw new Error(`${table}: ${getSupabaseErrorMessage(error)}`)
      }

      console.info(`Supabase table available: ${table}`)
      return table
    }),
  )
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => String(result.reason?.message ?? result.reason))

  return {
    ok: errors.length === 0,
    errors,
  }
}
