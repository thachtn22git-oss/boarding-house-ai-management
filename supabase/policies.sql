alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

-- Production security note:
-- This project still uses Firebase Auth. Supabase RLS cannot verify Firebase uid
-- from browser/mobile clients automatically. For production, use Supabase Auth
-- with matching user ids or route Supabase writes through a secure backend proxy
-- that verifies Firebase ID tokens before accessing Supabase.

-- Future Supabase Auth examples:
-- create policy "owners can read own ai conversations"
--   on public.ai_conversations for select
--   using (auth.uid()::text = owner_id);
--
-- create policy "owners can write own ai messages"
--   on public.ai_messages for all
--   using (auth.uid()::text = owner_id)
--   with check (auth.uid()::text = owner_id);
--
-- create policy "participants can read chat rooms"
--   on public.chat_rooms for select
--   using (auth.uid()::text = any(participant_ids));
--
-- create policy "participants can write chat messages"
--   on public.chat_messages for insert
--   with check (
--     exists (
--       select 1 from public.chat_rooms
--       where chat_rooms.id = chat_messages.chat_room_id
--       and auth.uid()::text = any(chat_rooms.participant_ids)
--     )
--   );

-- DEV ONLY POLICY
-- DO NOT USE IN PRODUCTION.
-- These policies allow anon clients to develop against Supabase while the app
-- performs Firebase uid filtering in client services.
create policy "dev anon ai conversations access"
  on public.ai_conversations for all
  using (true)
  with check (true);

create policy "dev anon ai messages access"
  on public.ai_messages for all
  using (true)
  with check (true);

create policy "dev anon ai usage logs access"
  on public.ai_usage_logs for all
  using (true)
  with check (true);

create policy "dev anon chat rooms access"
  on public.chat_rooms for all
  using (true)
  with check (true);

create policy "dev anon chat messages access"
  on public.chat_messages for all
  using (true)
  with check (true);
