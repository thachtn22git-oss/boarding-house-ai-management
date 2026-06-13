# Demo VietQR Invoice Payment

This document describes the demo-only VietQR payment flow used by the Boarding House AI Management System.

## Purpose

The VietQR payment flow is designed for product demos and user experience testing. It generates a VietQR-style QR image using the public VietQR image URL format, then simulates payment confirmation inside the app.

No real money is processed by this system.

## Demo Configuration

The demo bank configuration is stored in:

- `apps/web-admin/src/config/demo-payment.ts`
- `apps/mobile-owner/src/config/demo-payment.ts`

The current demo values are:

- Bank: MB Bank
- Account number: `1234567890`
- Account name: `BOARDING HOUSE AI DEMO`
- Currency: VND

Replace these values with a real bank account or payment provider configuration before any production payment integration.

## QR Generation

The QR image uses the VietQR public image format:

```text
https://img.vietqr.io/image/{bankId}-{accountNo}-compact2.png?amount={amount}&addInfo={invoiceCode}&accountName={accountName}
```

The app encodes query parameters and uses the invoice code as transfer content.

## Demo Flow

1. Tenant opens an invoice.
2. Tenant selects `Pay with VietQR`.
3. The app shows a VietQR-style QR preview and transfer information.
4. Tenant selects `I have completed payment (Demo)`.
5. The app marks the invoice as paid in Firestore.
6. The owner receives an invoice payment notification.

## Firestore Update

When the demo payment is completed, the invoice is updated with:

- `status: "paid"`
- `paymentStatus: "paid"`
- `paymentMethod: "demo_vietqr"`
- `paymentReference: "DEMO-VIETQR-" + Date.now()`
- `paidAmount: totalAmount`
- `paidAt: serverTimestamp()`
- `qrProvider: "vietqr_demo"`
- `qrPayload: generatedVietQRUrl`
- `updatedAt: serverTimestamp()`

## Production Integration

Production can integrate a payment callback provider such as SePay, Casso, or a VietQR-compatible banking webhook. A real integration should verify transaction amount, transfer content, bank account, transaction ID, and payment status on a trusted backend before marking an invoice as paid.

Do not collect card numbers, bank passwords, OTPs, or real banking credentials in this app.
