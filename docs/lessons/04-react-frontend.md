# Lesson 4 — React frontend

This repo is backend-only. A React (or Next.js) app should treat Nest as a remote API: stream chat with the AI SDK, load history with ordinary `fetch`, and use OpenAPI only where it helps.

## Prerequisites on the Nest side

Already configured in [`main.ts`](../../src/main.ts):

- `app.enableCors()` — fine for local Vite/Next origins; tighten `origin` in production.
- Swagger at `/docs` for humans exploring REST.
- Global auth stub: send `x-user-id` if you want a non-default user (see [`AuthGuard`](../../src/common/auth.guard.ts)).

## Chat: use AI SDK `useChat`, not Swagger

`POST /chat` speaks the AI SDK UI message stream. In the frontend:

```bash
npm install ai @ai-sdk/react
```

Point the transport at your Nest URL (adjust for your AI SDK 6 transport API):

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const transport = new DefaultChatTransport({
  api: 'http://localhost:3000/chat',
  headers: {
    'x-user-id': 'demo-user', // replace with real auth later
  },
});

export function Chat() {
  const { messages, sendMessage, status } = useChat({ transport });

  // render messages; sendMessage({ text: '...' }) on submit
  return null;
}
```

If you persist turns, pass a stable `conversationId` in the request body (extend the transport / prepare-request hook your AI SDK version provides) so Nest can `save` via `ConversationStore`.

### Rendering tool parts

Tool results arrive as message **parts**, not only as plain assistant text. Prefer dedicated UI:

- order lookup → table or detail card
- destructive tools → confirm / reject controls before or after the tool call, depending on your product rules

Do not dump raw JSON into the bubble unless you are debugging.

## History: `GET /conversations/:id`

Load prior messages with normal HTTP:

```ts
const res = await fetch(
  `http://localhost:3000/conversations/${conversationId}`,
  { headers: { 'x-user-id': 'demo-user' } },
);
const messages = await res.json(); // UIMessage[]
```

Seed `useChat` with those messages (initial messages / controlled state — follow the AI SDK version you pin). This endpoint is the one that works cleanly in Swagger Try it out.

## Auth header today vs production

| Environment | Client sends | Nest does |
|-------------|--------------|-----------|
| Dev (this template) | Optional `x-user-id` | Defaults to `demo-user` |
| Production | `Authorization: Bearer …` (or cookies) | Replace `AuthGuard`; still set `RequestContext` |

Keep the frontend and Swagger security scheme in sync when you change auth ([`main.ts`](../../src/main.ts) `addApiKey` / later `addBearerAuth`).

## When to use OpenAPI codegen

Useful for:

- typed clients for future CRUD REST modules
- generating types for `GET /conversations/:id` if you want them

Not useful as the primary chat client:

- generated `fetch` wrappers expect finite JSON responses
- they will not implement the AI SDK UI stream protocol

Practical split:

```text
React UI  --useChat transport-->  POST /chat          (stream)
React UI  --fetch / openapi---->  GET /conversations  (JSON)
Humans    --browser------------>  GET /docs           (Swagger UI)
```

## Checklist for a new React feature against this API

1. Decide stream vs JSON.
2. If stream → AI SDK hook + transport + `x-user-id` (or real auth).
3. If JSON → `fetch` or generated OpenAPI client; document the Nest route with `@Api*` ([Lesson 3](./03-swagger-openapi.md)).
4. Render tool parts intentionally.
5. Tighten CORS and auth before deploying.

## Takeaway

Connect React to Nest the same way the layers are split: streaming chat through the AI SDK, REST through ordinary HTTP (and optionally OpenAPI), identity through headers that populate `RequestContext`.
