import type { Timestamp } from 'firebase/firestore'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  )
}

export function formatDate(value: string | unknown): string {
  if (!value) {
    return '-'
  }

  const date = isFirestoreTimestamp(value)
    ? value.toDate()
    : typeof value === 'string'
      ? new Date(value)
      : value instanceof Date
        ? value
        : null

  if (!date || Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}
