# Phase 20 End-to-End Test Plan

Goal: stabilize the Boarding House AI Management System before adding OCR. This checklist is for manual QA, demo rehearsal, and regression testing across web, mobile, Firebase, Supabase, AI, and demo payment flows.

## A. Owner Web

- [ ] Dashboard loads realtime totals, AI insights, recent activity, and notifications.
- [ ] Room Management supports create, edit, delete, empty state, loading state, and realtime updates.
- [ ] Tenants supports create, edit, delete, room assignment, empty state, and realtime updates.
- [ ] Contracts supports create, edit, view, delete, status badges, and room/tenant dropdowns.
- [ ] Invoices supports create, edit, view, delete, mark paid, VietQR demo payment metadata, and unified status display.
- [ ] Utilities supports create, edit, confirm, mark billed, VietQR demo payment metadata, and unified status display.
- [ ] Feedback supports view, edit, in review, resolve, reject, AI fallback, AI analysis fields, and owner response.
- [ ] Notifications show realtime unread count, mark read, mark all read, open action, and delete.
- [ ] Chat supports room creation, realtime messages, unread counts, message input, and no loading flicker.
- [ ] Analytics loads owner-scoped data and updates after invoice, feedback, contract, tenant, and utility changes.
- [ ] AI Assistant opens Recent Chats first, supports New Chat, chat detail, Back, rename, delete, suggested questions, and persistent history.

## B. Tenant Web

- [ ] Home loads assigned tenant profile, room, active contract, invoices, utilities, feedback, and notifications.
- [ ] My Room shows room details or a friendly empty state.
- [ ] My Contract shows active contract and print action.
- [ ] My Invoices shows unified status, VietQR payment, invoice detail, paid date, and realtime update.
- [ ] My Utilities shows unified status, VietQR payment, utility detail, and realtime update.
- [ ] My Feedback submits title/content, stores AI-ready fields, creates owner notification, and shows owner response.
- [ ] Notifications update realtime and support read/open/delete actions.
- [ ] Chat supports owner chat, tenant chat, realtime messages, unread counts, and action URLs.

## C. Owner Mobile

- [ ] Dashboard shows all management metrics, AI insights, recent activity, and realtime updates.
- [ ] Rooms list owner rooms with status and pricing.
- [ ] Invoices list owner invoices with unified status and payment updates.
- [ ] Utilities list owner utility readings with unified payment state.
- [ ] Feedback list shows AI sentiment/priority fallback and status.
- [ ] Chat list and chat room support realtime messages without composer overlap.
- [ ] AI Assistant opens Recent Chats first, supports New Chat, old conversations, bubbles, and auto-scroll.
- [ ] More/Profile shows account info and logout.

## D. Tenant Mobile

- [ ] Home loads tenant profile, room, invoice, contract, notifications, and quick actions.
- [ ] Invoices list tenant invoices, details, VietQR demo payment, and realtime paid status.
- [ ] Utilities list tenant utility readings, details, VietQR demo payment, and realtime paid status.
- [ ] Feedback submits title/content only, stores AI-ready fields, and creates owner notification.
- [ ] Chat supports owner and tenant conversations, realtime messages, and unread counts.
- [ ] Notifications support realtime read/open/delete actions.
- [ ] More/Profile shows tenant profile, room, role, and logout.

## E. Realtime Sync

- [ ] Web owner to Web tenant: invoice, utility, feedback response, notification, and chat updates appear without refresh.
- [ ] Web owner to Mobile tenant: invoice, utility, feedback response, notification, and chat updates appear without refresh.
- [ ] Mobile owner to Web tenant: invoice, utility, feedback response, notification, and chat updates appear without refresh.
- [ ] Tenant payment to Owner update: invoice and utility paid state updates in owner web and mobile.
- [ ] Tenant feedback to Owner update: owner feedback list, notification center, and notification bell update.

## F. Supabase Chat

- [ ] Owner to tenant chat room is created once and reused.
- [ ] Tenant to tenant chat room is created once and reused.
- [ ] Web to mobile messages appear realtime.
- [ ] Mobile to web messages appear realtime.
- [ ] Unread counts increment for receivers and reset when opened.
- [ ] Chat list last message and last activity update.
- [ ] Channels unsubscribe on screen/page unmount.
- [ ] Reopening the same chat does not duplicate messages.

## G. AI Features

- [ ] AI feedback analysis handles successful `/api/feedback/analyze` responses.
- [ ] Feedback submission still succeeds when AI server is unavailable.
- [ ] Owner re-analyze shows a user-friendly error when the server is unavailable.
- [ ] AI suggested resolution and reply are displayed when available.
- [ ] AI Assistant answers owner questions with rule-based/system data fallback.
- [ ] AI conversation history persists after refresh.
- [ ] AI analytics reflects real `ai_messages` and `ai_conversations` data.

## H. Demo VietQR

- [ ] Unpaid invoice shows Pay with VietQR.
- [ ] Invoice QR modal opens and clearly states demo payment only.
- [ ] Invoice demo success marks paid and creates owner notification.
- [ ] Owner pages show paid invoice without duplicate status/payment columns.
- [ ] Unpaid utility shows Pay with VietQR.
- [ ] Utility QR modal opens and clearly states demo payment only.
- [ ] Utility demo success marks paid and creates owner notification.
- [ ] Analytics revenue and utility totals update after payment.

## Build Gate

- [ ] `cd apps/web-admin && npm run build`
- [ ] `cd apps/mobile-owner && npm run typecheck`
- [ ] `cd apps/mobile-tenant && npm run typecheck`
- [ ] AI server checks run when Python dependencies are available.

