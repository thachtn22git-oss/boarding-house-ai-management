# Hybrid Database Architecture

The system uses Firebase and Supabase together so each database handles the workload it is best suited for.

## Firebase

Firebase remains the source of truth for authentication and core business data:

- Firebase Authentication
- `users`
- `rooms`
- `tenants`
- `contracts`
- `invoices`
- `utilities`
- `feedbacks`
- `notifications`

These collections represent business state and should remain stable, auditable, and compatible with the existing owner, tenant, and admin workflows.

## Supabase

Supabase stores high-frequency interaction data:

- `ai_conversations`
- `ai_messages`
- `ai_usage_logs`
- `chat_rooms`
- `chat_messages`

These features are read-heavy and realtime-heavy. Moving them to Supabase reduces Firestore quota pressure while keeping chat and AI Assistant history responsive.

## Why This Split

- Reduce Firestore read/write pressure from chat and AI Assistant activity.
- Keep business data isolated from high-volume interaction data.
- Use Supabase Realtime for chat rooms and messages.
- Keep Firebase Auth unchanged during this phase.

## Security Notes

The current phase still uses Firebase Auth. Supabase client-side services perform `owner_id` and `participant_ids` checks, but that is not a production security boundary.

Production should use Supabase Auth or a backend proxy that validates Firebase ID tokens before allowing Supabase access.
