# Lesson 4 - React frontend

Use the sample app under [`examples/chat-ui`](../../examples/chat-ui) for a working Vite + `useChat` client, or follow the notes below to wire your own UI.

## Prerequisites on the Nest side

Already configured in [`main.ts`](../../src/main.ts):

- CORS via `CORS_ORIGINS` (comma-separated). Unset allows all origins in non-production; set `http://localhost:5173` when using the sample UI with a locked-down CORS list.
- Helmet + body size limits (`BODY_SIZE_LIMIT`, default `256kb`).
- Swagger at `/docs` for humans exploring REST.
- Global auth: `AUTH_MODE=dev` uses `x-user-id` (default `demo-user`); `AUTH_MODE=jwt` expects a Bearer token (see [`AuthGuard`](../../src/common/auth.guard.ts)).
- Rate limiting via `@nestjs/throttler` (`POST /chat` is capped at 20/min).

## Sample app (recommended)

```bash
# terminal 1 - API
npm run start:dev

# terminal 2 - UI
cd examples/chat-ui
npm install
npm run dev
```

Open http://localhost:5173. See [`examples/chat-ui/README.md`](../../examples/chat-ui/README.md).

## Chat: use AI SDK `useChat`, not Swagger

`POST /chat` speaks the AI SDK UI message stream:

```tsx
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from 'ai';

const transport = new DefaultChatTransport({
  api: 'http://localhost:3000/chat',
  headers: { 'x-user-id': 'demo-user' },
});

const { messages, sendMessage, addToolApprovalResponse, status } = useChat({
  transport,
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
});
```

### Rendering tool parts and approvals

Tool results arrive as message **parts**. Prefer dedicated UI:

- order lookup → table or detail card
- **`cancelOrder`** → Approve / Reject controls (`needsApproval: true` on the Nest tool)

When the model requests cancellation, the stream includes a `tool-approval-request`. Call `addToolApprovalResponse({ id, approved })` so the agent can continue (or stop if rejected). The sample app implements this end-to-end.

Do not dump raw JSON into the bubble unless you are debugging.

## History: `GET /conversations/:id`

```ts
const res = await fetch(
  `http://localhost:3000/conversations/${conversationId}`,
  { headers: { 'x-user-id': 'demo-user' } },
);
const messages = await res.json(); // UIMessage[]
```

## Auth header today vs production

| Environment | Client sends | Nest does |
|-------------|--------------|-----------|
| Dev (this template) | Optional `x-user-id` | Defaults to `demo-user` |
| Production | `Authorization: Bearer …` (or cookies) | Replace `AuthGuard`; still set `RequestContext` |

## When to use OpenAPI codegen

Useful for typed REST clients (`GET /conversations/:id`). Not useful as the primary chat client - generated wrappers expect finite JSON, not the AI SDK UI stream.

## Checklist

1. Decide stream vs JSON.
2. If stream → AI SDK hook + transport + identity header.
3. If a write tool needs approval → render Approve/Reject and call `addToolApprovalResponse`.
4. Tighten CORS, auth, and body limits before deploying.

## Takeaway

Streaming chat through the AI SDK, REST through ordinary HTTP, identity through headers that populate `RequestContext`, and destructive tools behind human approval.
