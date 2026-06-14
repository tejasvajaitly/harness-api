# harness-api

TypeScript backend for the Harness iOS app. Uses the [Vercel AI SDK](https://sdk.vercel.ai/docs) (`ai` package) with the same **UI message stream** protocol as [@ai-sdk/react `useChat`](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot).

## Data model (synced with iOS)

| Entity | Meaning |
|--------|---------|
| `exercise` | Catalog entry (bench press, squat, …) |
| `workoutPlan` | Reusable template for one training day |
| `workoutSession` | One actual gym visit |
| `sessionExercise` | One exercise on a plan **or** on a session |
| `set` | Logged reps/weight for a session exercise |

Starting a session from a plan: `workoutSession` **create** with `workoutPlanId` — the app copies plan `sessionExercise` rows into that session.

**Tool definitions:** `harness/Services/Backend/HarnessClientTools.swift` — sent on every chat request; the backend forwards them to `streamText` and does not duplicate schemas in TypeScript.

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

Set provider credentials (e.g. Vercel AI Gateway / OpenAI) in your environment.

## `POST /api/chat`

**Request** (UI message / `useChat` shape):

```json
{
  "id": "harness-coach",
  "messages": [
    {
      "id": "…",
      "role": "user",
      "parts": [{ "type": "text", "text": "Hello", "state": "done" }]
    }
  ],
  "trigger": "submit-message"
}
```

**Response**: SSE (`x-vercel-ai-ui-message-stream: v1`), e.g. `data: {"type":"text-delta",...}`.

The model may call **`data_operation`**; CRUD runs on the **iPhone** (SwiftData), not on this server.

## Verify

```bash
curl -s -N -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"id":"test","messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"hi","state":"done"}]}],"trigger":"submit-message"}' | head -8
```

Rebuild after source changes:

```bash
npm run build
```
