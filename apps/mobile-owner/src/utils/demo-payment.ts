import { DEMO_PAYMENT_CONFIG } from '../config/demo-payment'
import type { Invoice } from '../types/models'

export function getDemoVietQRAmount(invoice: Pick<Invoice, 'totalAmount'>) {
  return Math.max(0, Math.round(Number(invoice.totalAmount ?? 0)))
}

export function generateVietQRUrl(invoice: Pick<Invoice, 'invoiceCode' | 'totalAmount'>) {
  const amount = getDemoVietQRAmount(invoice)
  const params = [
    `amount=${encodeURIComponent(String(amount))}`,
    `addInfo=${encodeURIComponent(invoice.invoiceCode)}`,
    `accountName=${encodeURIComponent(DEMO_PAYMENT_CONFIG.accountName)}`,
  ].join('&')

  return `https://img.vietqr.io/image/${DEMO_PAYMENT_CONFIG.bankId}-${DEMO_PAYMENT_CONFIG.accountNo}-compact2.png?${params}`
}

export function formatVndAmount(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(getDemoVietQRAmount({ totalAmount: value }))
}
