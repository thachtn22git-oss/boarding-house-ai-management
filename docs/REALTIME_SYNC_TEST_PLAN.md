# Realtime Sync Test Plan

## Scope

Core business data remains in Firestore and uses page-scoped `onSnapshot` listeners:

- Web owner: rooms, tenants, contracts, invoices, utilities, feedback, dashboard.
- Web tenant: room, active contract, invoices, utilities, feedback.
- Mobile owner app: dashboard, rooms, tenants, contracts, invoices, utilities, feedback.
- Notifications already use realtime listeners.

Chat and AI Assistant history remain on Supabase.

## Collections To Verify

- [ ] `rooms`
- [ ] `tenants`
- [ ] `contracts`
- [ ] `invoices`
- [ ] `utilityReadings`
- [ ] `feedbacks`
- [ ] `notifications`

Each Firestore listener must be scoped to the signed-in owner, tenant, or user. Never display data from another owner or tenant account.

## How Realtime Works

Realtime listeners use simple Firestore queries such as:

```text
where("ownerId", "==", ownerId)
where("tenantId", "==", tenantId)
```

The app sorts snapshots client-side to avoid Firestore composite index errors from `where + orderBy` queries. Each listener is created only while the related screen is mounted and is cleaned up on unmount, logout, or account change.

## Fallback Behavior

If a listener fails because of rules, quota, or connectivity:

- The app logs collection name, query field, id, and error details in the console.
- The page keeps existing data visible.
- A warning is shown: `Realtime updates are unavailable. Showing latest loaded data.`
- A one-time fetch is attempted as fallback.

The warning must be cleared after a successful snapshot. Do not show a realtime warning when realtime is working.

## Listener Stability Rules

- Use `onSnapshot` only while the related page or screen is mounted.
- Always return and call the unsubscribe function on unmount.
- Do not include data arrays such as `messages`, `rooms`, or `invoices` in listener `useEffect` dependencies.
- Do not toggle the initial loading state on every realtime event.
- Append realtime chat messages without refetching the full message list on every insert.
- Keep current selected records stable when list snapshots refresh.

## Manual Test Cases

### Web Owner + Web Tenant

1. Open tenant `/tenant/my-invoices` in one browser.
2. Open owner `/owner/invoices` in another browser.
3. Owner creates an invoice.
4. Confirm the tenant invoice appears without refresh.
5. Tenant pays the invoice with demo VietQR.
6. Confirm the owner invoice row changes to paid without refresh.
7. Owner creates a utility reading for the tenant.
8. Confirm the tenant utility page updates without refresh.
9. Tenant pays the utility bill with demo VietQR.
10. Confirm owner utilities update without refresh.
11. Tenant submits feedback.
12. Confirm owner feedback appears without refresh.
13. Owner resolves feedback with a response.
14. Confirm tenant feedback history updates without refresh.

### Web Owner + Mobile Owner

1. Open owner web `/owner/rooms`.
2. Open mobile owner Rooms.
3. Create, edit, and delete a room on either side.
4. Confirm the other side updates without refresh.
5. Repeat for invoices, utilities, and feedback.

### Owner Dashboard

1. Open owner dashboard.
2. Create or update rooms, invoices, utilities, or feedback in another session.
3. Confirm dashboard statistics update without a manual refresh.

### Mobile Owner + Web Owner

1. Open mobile owner dashboard.
2. Open web owner rooms, invoices, utilities, or feedback.
3. Change data on web.
4. Confirm mobile statistics and list screens update without refresh.
5. Change data on mobile where supported.
6. Confirm web pages update without refresh.

### Tenant Payment Sync

1. Open tenant invoice or utility page.
2. Open owner invoice or utility page.
3. Complete demo VietQR payment as tenant.
4. Confirm tenant row shows one unified `Paid` status.
5. Confirm owner row shows `Paid` without duplicate payment/status columns.
6. Confirm owner notification is created and unread badge updates.

## Firestore Quota Notes

- Listeners are scoped to the current screen.
- Analytics remains fetch-based to avoid unnecessary long-lived listeners.
- Dashboard listens to owner-scoped collections only while the dashboard route is open.

## Pass Criteria

- No page requires manual refresh for normal CRUD or payment updates.
- No repeated loading flicker after the first snapshot.
- No duplicate rows or duplicate chat messages.
- No stale selected conversation after a room/chat list refresh.
- No cross-owner or cross-tenant data leakage.
