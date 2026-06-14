# Realtime Sync Test Plan

## Scope

Core business data remains in Firestore and uses page-scoped `onSnapshot` listeners:

- Web owner: rooms, tenants, contracts, invoices, utilities, feedback, dashboard.
- Web tenant: room, active contract, invoices, utilities, feedback.
- Mobile owner app: dashboard, rooms, tenants, contracts, invoices, utilities, feedback.
- Notifications already use realtime listeners.

Chat and AI Assistant history remain on Supabase.

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

## Firestore Quota Notes

- Listeners are scoped to the current screen.
- Analytics remains fetch-based to avoid unnecessary long-lived listeners.
- Dashboard listens to owner-scoped collections only while the dashboard route is open.
