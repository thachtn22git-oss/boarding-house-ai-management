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
