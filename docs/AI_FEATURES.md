# AI Features

The system currently uses a local FastAPI AI server and rule-based dashboard intelligence.

## AI Feedback Analysis

Endpoint:

```text
POST http://localhost:8000/api/feedback/analyze
```

Inputs:

- feedback content

Predictions:

- sentiment
- category
- priority
- summary
- confidence scores

Expected behavior:

- Tenant feedback submission must succeed even if the AI server is unavailable.
- When AI analysis fails, the app should store the feedback with pending AI fields.
- Owner UI should display "Pending AI" until AI values exist.

## AI Assistant

Owner AI Assistant uses management data to answer questions about:

- rooms
- tenants
- contracts
- invoices
- utilities
- feedback
- revenue
- urgent actions

History is stored in Supabase:

- `ai_conversations`
- `ai_messages`
- `ai_usage_logs`

UX requirements:

- Web and mobile open Recent Chats first.
- New Chat does not create an empty conversation until the first message is sent.
- Conversation title is generated from the first question.
- Rename and delete are supported.

## AI Analytics

Owner Analytics can derive usage from:

- total AI questions
- total conversations
- questions today
- average questions per conversation
- most asked question types

Question types:

- Revenue
- Invoices
- Contracts
- Rooms
- Feedback
- Utilities

## AI Server Checks

```powershell
cd services/ai-server
venv\Scripts\python.exe scripts\check_feedback_dataset.py
venv\Scripts\python.exe scripts\test_feedback_predictions.py
```

