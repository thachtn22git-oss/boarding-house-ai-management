# Demo VietQR Invoice Payment

This document describes the demo-only VietQR payment flow used by the Boarding House AI Management System for invoices and utility bills.

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

## Invoice Demo Flow

1. Tenant opens an invoice.
2. Tenant selects `Pay with VietQR`.
3. The app shows a VietQR-style QR preview and transfer information.
4. Tenant selects `I have completed payment (Demo)`.
5. The app marks the invoice as paid in Firestore.
6. The owner receives an invoice payment notification.
7. Tenant and owner lists show a single unified `Paid` status.

## Utility Bill Demo Flow

1. Tenant opens `My Utilities`.
2. Tenant selects an unpaid utility bill.
3. Tenant selects `Pay with VietQR`.
4. The app shows a real VietQR image URL preview and transfer information.
5. Tenant selects `I have completed payment (Demo)`.
6. The app marks the utility bill as paid in Firestore.
7. The owner receives a utility payment notification.
8. Tenant and owner lists show a single unified `Paid` status.

Invoice and utility payment flows share the same demo VietQR approach. The QR image is real and scannable, but payment confirmation is simulated inside the app.

## Invoice Firestore Update

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

## Utility Firestore Update

When the demo utility payment is completed, the utility reading is updated with:

- `paymentStatus: "paid"`
- `paymentMethod: "demo_vietqr"`
- `paymentReference: "DEMO-VIETQR-UTILITY-" + Date.now()`
- `paidAmount: totalAmount`
- `paidAt: serverTimestamp()`
- `qrProvider: "vietqr_demo"`
- `qrPayload: generatedVietQRUrl`
- `status: "paid"`
- `updatedAt: serverTimestamp()`

## Production Integration

Production can integrate a payment callback provider such as SePay, Casso, or a VietQR-compatible banking webhook. A real integration should verify transaction amount, transfer content, bank account, transaction ID, and payment status on a trusted backend before marking an invoice as paid.

Do not collect card numbers, bank passwords, OTPs, or real banking credentials in this app.

## QA Checklist

Invoices:

- [ ] Unpaid invoice shows `Pay with VietQR`.
- [ ] QR image loads or a clear demo fallback appears.
- [ ] Demo warning is visible.
- [ ] `I have completed payment (Demo)` marks invoice paid.
- [ ] Firestore has `paymentStatus: "paid"`.
- [ ] `paidAmount` equals `totalAmount`.
- [ ] Owner notification is created.
- [ ] Tenant table shows one status column.
- [ ] Owner table shows one status column.

Utilities:

- [ ] Unpaid utility bill shows `Pay with VietQR`.
- [ ] QR image loads or a clear demo fallback appears.
- [ ] Demo warning is visible.
- [ ] `I have completed payment (Demo)` marks utility paid.
- [ ] Firestore has `paymentStatus: "paid"`.
- [ ] Firestore does not reset utility `status` to `draft`.
- [ ] Owner notification is created.
- [ ] Tenant table shows one status column.
- [ ] Owner table shows one status column.

Analytics and dashboard:

- [ ] Owner dashboard updates after payment.
- [ ] Revenue and utility amount calculations update.
- [ ] Notification bell unread count updates.
