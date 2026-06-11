# Supabase Setup

This project uses Firebase for authentication and core business data, and Supabase for high-read interaction data such as AI Assistant history and chat.

## Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/policies.sql`.
5. Copy the Project URL and anon key.
6. Add the values to:
   - `apps/web-admin/.env`
   - `apps/mobile-owner/.env`
7. Restart the web and mobile development servers.

## Environment Variables

Web:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Mobile Owner:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Security Warning

`policies.sql` includes temporary development policies that allow anon read/write access.

Do not use these policies in production.

Because the app currently uses Firebase Auth, Supabase RLS cannot verify Firebase user ids directly from browser or mobile clients. Production should use one of these approaches:

- Supabase Auth with matching user ids.
- A secure backend proxy that verifies Firebase ID tokens and performs Supabase reads/writes server-side.

Client services still filter by `owner_id` and `participant_ids`, but client-side filtering is not a security boundary.

## Realtime Setup

To make chat realtime updates work:

1. Go to the Supabase Dashboard.
2. Open Database -> Replication.
3. Enable Realtime for:
   - `chat_rooms`
   - `chat_messages`
   - `ai_conversations`
   - `ai_messages` if AI realtime updates are needed later.
4. Restart the web and mobile apps after enabling replication.

If Realtime is not enabled, chat messages are still saved, but clients may need to refresh or navigate away and back before seeing updates.
