import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseUrl = Boolean(supabaseUrl)
export const hasSupabaseAnonKey = Boolean(supabaseAnonKey)
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

console.info('Supabase configured:', isSupabaseConfigured)
console.info('Supabase URL exists:', hasSupabaseUrl)

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured. AI history and chat persistence are disabled.')
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export function assertSupabaseConfigured() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Check .env.')
  }

  return supabase
}

export function getSupabaseErrorMessage(error: unknown) {
  const record = typeof error === 'object' && error !== null
    ? (error as Record<string, unknown>)
    : {}
  const message = String(record.message ?? error ?? '')
  const code = String(record.code ?? '')
  const details = String(record.details ?? '')
  const hint = String(record.hint ?? '')
  const haystack = `${message} ${code} ${details} ${hint}`.toLowerCase()

  if (!isSupabaseConfigured) return 'Supabase is not configured. Check .env.'
  if (haystack.includes('relation') && haystack.includes('does not exist')) {
    return 'Supabase table is missing. Run supabase/schema.sql.'
  }
  if (
    haystack.includes('permission denied') ||
    haystack.includes('row-level security') ||
    haystack.includes('rls')
  ) {
    return 'Supabase policy blocked this action. Check policies.sql.'
  }

  return message || 'Supabase request failed.'
}

export function logSupabaseError(context: string, error: unknown) {
  const record = typeof error === 'object' && error !== null
    ? (error as Record<string, unknown>)
    : {}

  console.warn(`${context} failed`, {
    message: record.message,
    code: record.code,
    error,
  })
}
