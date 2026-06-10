import { Timestamp } from 'firebase/firestore'

export function formatCurrency(value?: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value ?? 0)
}

export function formatDate(value?: string | unknown) {
  if (!value) return 'Not available'
  if (typeof value === 'string') return value
  if (value instanceof Timestamp) return value.toDate().toLocaleDateString('en-US')
  return 'Not available'
}

export function formatRelativeTime(value?: unknown) {
  if (!value || !(value instanceof Timestamp)) return 'Recently'

  const seconds = Math.max(1, Math.floor((Date.now() - value.toDate().getTime()) / 1000))
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minutes ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`

  return value.toDate().toLocaleDateString('en-US')
}
