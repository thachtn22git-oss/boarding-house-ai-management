# Supabase Chat and AI History

Supabase stores realtime chat and persistent AI Assistant history. Web and mobile must use the same tables.

## Chat Tables

`chat_rooms`

- `id`
- `type`
- `owner_id`
- `room_id`
- `participant_ids`
- `participant_roles`
- `participant_names`
- `participant_emails`
- `last_message`
- `last_message_sender_id`
- `last_message_at`
- `unread_counts`
- `created_at`
- `updated_at`

`chat_messages`

- `id`
- `chat_room_id`
- `sender_id`
- `sender_name`
- `sender_role`
- `text`
- `read_by`
- `created_at`

## AI Assistant Tables

`ai_conversations`

- `id`
- `owner_id`
- `title`
- `created_at`
- `updated_at`

`ai_messages`

- `id`
- `conversation_id`
- `role`
- `content`
- `created_at`

`ai_usage_logs`

- owner/question/intent/response metadata used for analytics.

## Realtime Rules

- Register every `.on("postgres_changes", ...)` callback before `.subscribe()`.
- Use unique channel names that include `userId` or `chatRoomId`.
- Fetch initial data once, then apply realtime changes without toggling initial loading state.
- Remove channels on unmount with `supabase.removeChannel(channel)`.
- Do not refetch all messages on every insert unless recovery is required.

## Manual Chat Tests

- Owner Web to Tenant Mobile
- Owner Mobile to Tenant Web
- Tenant Web to Tenant Mobile
- Unread count increments for receivers
- Unread count resets when opening the room
- Last message updates on all clients
- Message list does not flicker with "Loading messages..."

## Manual AI History Tests

- Open AI Assistant and confirm Recent Chats appears first.
- Start New Chat and verify no Supabase conversation exists until first send.
- Send first question and verify conversation and messages are saved.
- Refresh and confirm the conversation remains in Recent Chats but is not auto-opened.
- Rename a conversation and verify Supabase updates.
- Delete a conversation and verify related messages are removed by database cascade or cleanup policy.

