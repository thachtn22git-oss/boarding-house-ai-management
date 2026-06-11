# Owner AI Assistant

The Owner AI Assistant is a local, rule-based assistant for boarding house data.
It does not call external AI APIs.

## Data Flow

```text
Owner asks a question
  -> App detects intent with local keyword rules
  -> App reads only the Firestore collections needed for that intent
  -> Queries are scoped by ownerId == currentUser.uid
  -> App generates a readable answer
  -> App optionally writes a lightweight aiAssistantLogs document
```

## Supported Intents

- `room_availability`: available or vacant room counts and room numbers.
- `monthly_revenue`: paid invoice revenue for the current month.
- `overdue_invoices`: overdue or unpaid invoice list.
- `expiring_contracts`: active contracts ending within 30 days.
- `urgent_feedback`: feedback with `priority` or `aiSuggestedPriority` set to `urgent`.
- `feedback_summary`: top feedback categories and sentiment counts.
- `utility_summary`: current-month electricity, water, and utility cost totals.
- `tenant_count`: total and active tenant counts.
- `unknown`: fallback guidance for unsupported questions.

## Example Questions

- How many rooms are available?
- How much revenue did I earn this month?
- Which invoices are overdue?
- Which contracts expire soon?
- Show urgent feedback.
- What are the main tenant complaints?
- Electricity usage this month.
- How many tenants do I have?

## Response Generation

Answers are deterministic summaries built from Firestore data. The assistant uses
keyword-based intent detection, then formats counts, currency totals, and short
lists. It does not perform generative reasoning.

## Firestore Scope

Owner queries always filter by:

```text
ownerId == currentUser.uid
```

This prevents one owner from seeing another owner’s rooms, tenants, contracts,
invoices, utilities, or feedback.

## Logging

When possible, assistant interactions are saved to:

```text
aiAssistantLogs
```

Fields:

- `ownerId`
- `question`
- `intent`
- `answer`
- `createdAt`

Log writes are non-blocking. If logging fails, the assistant answer still shows.

## Limitations

- Intent detection is keyword-based.
- The assistant only supports the listed intents.
- It reads Firestore when the user asks a question; it does not use realtime listeners.
- It does not use the feedback AI model or external AI APIs.
