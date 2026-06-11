create extension if not exists pgcrypto;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null default 'New Conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  owner_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  intent text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  question text not null,
  intent text,
  answer_preview text,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('owner_tenant', 'tenant_tenant')),
  owner_id text,
  room_id text,
  participant_ids text[] not null,
  participant_roles jsonb not null default '{}'::jsonb,
  participant_names jsonb not null default '{}'::jsonb,
  participant_emails jsonb not null default '{}'::jsonb,
  last_message text,
  last_message_sender_id text,
  last_message_at timestamptz,
  unread_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  sender_role text not null check (sender_role in ('owner', 'tenant', 'admin')),
  text text not null,
  read_by text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_owner_updated_idx
  on public.ai_conversations (owner_id, updated_at desc);

create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at asc);

create index if not exists ai_usage_logs_owner_created_idx
  on public.ai_usage_logs (owner_id, created_at desc);

create index if not exists chat_rooms_participant_ids_idx
  on public.chat_rooms using gin (participant_ids);

create index if not exists chat_rooms_updated_idx
  on public.chat_rooms (updated_at desc);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (chat_room_id, created_at asc);
