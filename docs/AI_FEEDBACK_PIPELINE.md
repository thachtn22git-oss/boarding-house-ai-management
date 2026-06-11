# AI Feedback Pipeline

The feedback AI server runs separately from the web and mobile apps.

Default local endpoint:

```text
http://localhost:8000
```

Analysis endpoint:

```text
POST /api/feedback/analyze
```

Request body:

```json
{
  "content": "The room has no water pressure."
}
```

Response fields used by the apps:

```json
{
  "category": "water",
  "sentiment": "negative",
  "priority": "high",
  "summary": "This feedback appears to be negative, related to water, and high priority.",
  "confidence": {
    "category": 0.91,
    "sentiment": 0.88,
    "priority": 0.82
  }
}
```

## Environment

Web admin:

```text
VITE_AI_SERVER_URL=http://localhost:8000
```

Mobile Expo apps:

```text
EXPO_PUBLIC_AI_SERVER_URL=http://localhost:8000
```

When using Expo Go on a physical phone, `localhost` points to the phone, not the development computer. Use the computer LAN IP instead:

```text
EXPO_PUBLIC_AI_SERVER_URL=http://192.168.1.10:8000
```

## Feedback Creation Flow

Tenant feedback forms only collect:

- Title
- Description

Text flow:

```text
Tenant submits feedback
  -> Web or mobile app calls local AI server
  -> AI predicts sentiment, category, priority, summary, confidence
  -> App saves feedback document in Firestore
  -> App creates owner notification
  -> Owner reviews AI Analysis or re-analyzes later
  -> Analytics reads stored AI fields for reports
```

When submitted, the app calls the AI server before creating the Firestore document.

If AI analysis succeeds, feedback is saved with:

- `category`
- `priority`
- `sentiment`
- `aiGenerated: true`
- `aiSummary`
- `aiSuggestedCategory`
- `aiSuggestedPriority`
- `aiConfidence`
- `aiError: null`

If AI analysis fails or times out, feedback still saves with:

- `category: "other"`
- `priority: null`
- `sentiment: null`
- `aiGenerated: false`
- `aiSummary: null`
- `aiSuggestedCategory: null`
- `aiSuggestedPriority: null`
- `aiConfidence: null`
- `aiError: "AI analysis unavailable"`

Owner notifications are still created after feedback submission. Notification priority uses the AI priority when available and falls back to `medium`.

## Owner Review

Owner Feedback Management displays pending values as `Pending AI`.

Owners can:

- Re-analyze a single feedback item.
- Analyze up to 10 pending feedback items in bulk.

Failed re-analysis does not delete or overwrite existing feedback content.

When re-analysis succeeds, the app updates:

- `category`
- `priority`
- `sentiment`
- `aiGenerated`
- `aiSummary`
- `aiSuggestedCategory`
- `aiSuggestedPriority`
- `aiConfidence`
- `aiError`
- `updatedAt`

When re-analysis fails, the app saves:

- `aiError: "AI analysis failed"`
- `updatedAt`

## Analytics

Analytics pages use stored Firestore fields only. They do not call the AI server.

Owner analytics are scoped to `ownerId`.

Admin analytics use system-wide feedback data.

AI feedback metrics include:

- Total Feedback
- AI Analyzed Feedback
- Pending AI Feedback
- Positive Feedback
- Neutral Feedback
- Negative Feedback
- Urgent Feedback

Charts use:

- Sentiment: `sentiment`
- Category: `aiSuggestedCategory || category`
- Priority: `priority || aiSuggestedPriority`
- Status by priority: `status` grouped with effective AI priority

## Run the AI Server

From the AI server directory:

```bash
cd services/ai-server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

```text
http://localhost:8000/docs
```

For Expo Go on a physical device, use the computer LAN IP in `EXPO_PUBLIC_AI_SERVER_URL` because `localhost` points to the phone itself.
