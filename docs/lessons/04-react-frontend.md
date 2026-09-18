# Lesson 4 - React frontend

Use the sample app under [`examples/chat-ui`](../../examples/chat-ui) for a working Vite + `useChat` client, or follow the notes below to wire your own UI.

The sample is intentionally small: plain CSS, no component library, and a clear split between **transport** (how messages move), **parts adapter** (what the UI understands), and **presentational components** (how it looks). Copy that shape into your product UI; do not treat the CSS as a design system you must keep.

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

Add `?demo` to the URL to load a static fixture (orders + pending `cancelOrder` approval) without hitting the API - useful when restyling cards.

## Design choices (why the UI looks like this)

| Choice | Reason |
|--------|--------|
| Chat is a **parts renderer**, not a custom SSE parser | Nest already streams the AI SDK UI message protocol; `useChat` owns reconnect, stop, and approvals |
| **Tool calls are cards**, not JSON in the bubble | Users need state (`running` / `done` / `needs approval`) and scannable results; raw dumps hide that |
| **Dedicated renderers when shape is known** | Order tools return `{ id, status, totalCents }` → row UI; everything else falls back to JSON so new tools still work |
| **Approval is a separate card** below the tool | Destructive tools declare `needsApproval` on Nest; the UI reacts to part **state**, not a special endpoint |
| **Composer blocks during approval** | Stops the user from sending a competing message while the agent is waiting on Approve/Reject |
| **Empty-state suggestions** | Teach the three tools without reading Nest code first |
| **Plain CSS + tokens** | Easy to delete or restyle; themes flip via `data-theme` on `<html>` |
| **No agent picker in the sample** | Backend accepts `agentId`; the demo hard-codes the default `assistant` so the happy path stays one file |

Mental model: the Nest agent produces a sequence of **parts** (text, reasoning, tool-\*). The UI never invents tool UX from the prompt - it maps part types and states to components.

```
Nest tool / agent                 Stream part                    UI element
─────────────────                 ───────────                    ──────────
text step                         text                           bubble + Markdown
reasoning                         reasoning                      collapsible "Reasoning" card
listOrders / lookupOrder          tool-* + output                ToolCallCard (+ OrderRow if shape matches)
cancelOrder + needsApproval       tool-* + approval-requested    ToolCallCard + ApprovalCard
(any new tool)                    tool-*                         ToolCallCard with JSON fallback
```

## UI elements and where they live

```
examples/chat-ui/src/
  App.tsx                 shell: transport, useChat, conversationId, status, errors
  components/
    empty-state.tsx       first screen + suggestion chips → send()
    message-turn.tsx      one user/assistant turn; routes blocks to bubble / tool / approval
    tool-call-card.tsx    collapsible tool card, state chips, order rows or JSON
    approval-card.tsx     Approve / Reject → addToolApprovalResponse
    composer.tsx          textarea, Enter send, Stop while streaming, blocked while approval
    icons.tsx             inline SVGs
  lib/
    parts.ts              UIMessage.parts → MessageBlock / ToolCall (the adapter)
    markdown.tsx          small markdown subset for assistant text
    hooks.ts              theme + auto-scroll (pauses when user scrolls up)
  styles.css              design tokens (--bg, --surface, --accent, chip tones, …)
```

### App shell (`App.tsx`)

Owns everything that is **session-scoped**:

- `DefaultChatTransport` → `POST ${VITE_API_BASE}/chat` with `x-user-id` and `body: { conversationId }`
- `useChat` with `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses` so approving a tool continues the turn without a second Send
- Status pill (`Connected` / `Thinking` / `Streaming` / `Waiting for you`)
- Error banner + Retry (`regenerate`) / dismiss
- New chat → new `conversationId`, clear messages (server history for the old id is left alone)

### Message turn

`MessageTurn` does not talk to Nest. It calls `messageBlocks(message)` and switches:

1. **text** → bubble + `Markdown`
2. **reasoning** → `<details>` card (same chrome as tools, different label)
3. **tool** → `ToolCallCard`, and if `call.approvalId` is set → `ApprovalCard`

Consecutive text parts from multi-step runs are merged into one bubble in `parts.ts`.

### Tool call card

Shows name, state chip, one-line preview, and (when expanded) input / output / error.

**Order-shaped output** is detected by structure (`id` + `status` + `totalCents`), not by tool name. That keeps `listOrders` and `lookupOrder` on one renderer. Unknown shapes stringify to JSON so a new Nest tool is visible on day one without frontend work.

### Approval card

Only appears when the Nest tool set `needsApproval: true` and the part is in state `approval-requested`. It calls `addToolApprovalResponse({ id, approved })`. Filter on **state**, not on a part type named `tool-approval-request` - that name exists on the wire protocol, not in `message.parts`.

### Composer

- Enter sends, Shift+Enter newline
- While `busy`, Send becomes Stop (`stop()`)
- While any message has a pending approval, the field is disabled (`blocked`)

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
  body: () => ({ conversationId }), // optional; Nest persists on finish
});

const { messages, sendMessage, addToolApprovalResponse, status } = useChat({
  transport,
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
});
```

To target a non-default agent, add `agentId` to the transport `body` (same field as in [Lesson 2](./02-adding-features.md)). The sample UI does not expose a picker yet.

### Rendering tool parts and approvals

```tsx
for (const part of message.parts.filter(isToolUIPart)) {
  if (part.state === 'approval-requested') {
    // render Approve / Reject for part.approval.id
  }
}
```

Call `addToolApprovalResponse({ id, approved })` with that id so the agent can continue (or stop if rejected). The sample app implements this end-to-end.

Do not dump raw JSON into the bubble unless you are debugging.

## How to design and wire a new capability

When you add a Nest tool or agent ([Lesson 2](./02-adding-features.md)), decide what the UI should do. Use this ladder:

### 1. Nothing (JSON fallback)

Ship the Nest tool only. `ToolCallCard` already shows name, state, input, and pretty-printed output. Good for internal/debug tools.

### 2. Better empty-state copy

Edit `SUGGESTIONS` (and the blurb) in [`empty-state.tsx`](../../examples/chat-ui/src/components/empty-state.tsx) so users can discover the new capability in one click.

### 3. Dedicated result UI

In [`tool-call-card.tsx`](../../examples/chat-ui/src/components/tool-call-card.tsx):

- Prefer **output shape** sniffing when several tools share a DTO (orders pattern), or
- Switch on `call.name` / `getToolName(part)` when the UX is tool-specific

Keep the adapter in [`parts.ts`](../../examples/chat-ui/src/lib/parts.ts) generic; put presentation in components.

### 4. Human approval

1. Set `needsApproval: true` on the Nest `tool({ ... })`.
2. Teach the model (agent instructions) **not** to ask for verbal confirmation - the UI owns Approve/Reject (see `cancelOrder`).
3. No new React endpoint: reuse `ApprovalCard` + `hasPendingApproval` so the composer stays blocked.
4. Optionally specialize the approval copy per `call.name`.

### 5. Multi-agent UX

Send `"agentId": "your-id"` in the chat body. Add a select in the topbar that updates the transport `body` (and usually starts a new `conversationId` so histories do not mix).

### 6. Reload history

The sample writes `conversationId` on each turn but does **not** load on refresh. To restore:

```ts
const res = await fetch(
  `http://localhost:3000/conversations/${conversationId}`,
  { headers: { 'x-user-id': 'demo-user' } },
);
const messages = await res.json(); // UIMessage[]
setMessages(messages);
```

Persist the id in `localStorage` or the URL if you want refresh-safe threads.

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

The sample only wires `x-user-id` via `VITE_USER_ID`. For JWT, change the transport `headers` (and drop the spoofable header).

## Styling without rewriting the app

Tokens live at the top of [`styles.css`](../../examples/chat-ui/src/styles.css): `--bg`, `--panel`, `--surface`, `--text`, `--accent`, status tones (`--ok` / `--warn` / `--bad`). Components use classes (`bubble`, `tool-card`, `approval`, `composer`), not inline colors.

Keep structure (turn → body → bubble | tool-block); swap tokens and radii if you brand the demo. Chip `data-tone` values (`ok`, `warn`, `bad`, `running`, `neutral`) drive status color - reuse them for any new status UI.

## When to use OpenAPI codegen

Useful for typed REST clients (`GET /conversations/:id`). Not useful as the primary chat client - generated wrappers expect finite JSON, not the AI SDK UI stream.

## Checklist

1. Decide stream vs JSON.
2. If stream → AI SDK hook + transport + identity header (+ optional `conversationId` / `agentId`).
3. Render `message.parts` via an adapter; never parse the raw stream in components.
4. Unknown tools → JSON card; known shapes or names → dedicated UI.
5. If a write tool needs approval → `needsApproval` on Nest + Approve/Reject + `addToolApprovalResponse`.
6. Update empty-state suggestions when you add user-facing tools.
7. Cover the visible path with a Playwright demo test ([Lesson 5](./05-playwright-ui-tests.md)).
8. Tighten CORS, auth, and body limits before deploying.

## Takeaway

Streaming chat through the AI SDK, REST through ordinary HTTP, identity through headers that populate `RequestContext`, and destructive tools behind human approval. The sample UI is a **parts → components** map: change Nest contracts first, then decide whether JSON fallback, a custom card, or an approval flow is enough. Lock the UI with [Playwright demo tests](./05-playwright-ui-tests.md) so approvals and cards stay green without a live model.
