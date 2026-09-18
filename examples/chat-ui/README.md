# Sample chat UI

Vite + React + AI SDK `useChat` client for the Nest starter. No UI library, no
CSS framework: one stylesheet with design tokens and a handful of components you
can delete or copy into your own app.

For the full design/wiring guide (parts adapter, tool cards, approvals, extending
for new Nest tools), see [Lesson 4](../../docs/lessons/04-react-frontend.md).
AI coding agents working in this folder should follow [AGENTS.md](./AGENTS.md)
(and the repo root [AGENTS.md](../../AGENTS.md)).

## Run

From the repo root, start the API:

```bash
npm run start:dev
```

In another terminal:

```bash
cd examples/chat-ui
npm install
npm run dev
```

Open http://localhost:5173. Set `CORS_ORIGINS=http://localhost:5173` in the API `.env` if you tightened CORS.

Optional env (create `examples/chat-ui/.env`):

```bash
VITE_API_BASE=http://localhost:3000
VITE_USER_ID=demo-user
```

`?demo` on the URL loads a static fixture (completed `listOrders` card + pending
`cancelOrder` approval) without calling the API - handy for CSS work and for
deterministic Playwright tests. Approve / Reject update local message state only.

## Playwright

From the repo root (or from this directory):

```bash
npm run test:ui
# or: cd examples/chat-ui && npm run test:e2e
```

That builds the UI, serves `vite preview`, and runs Chromium against `/` and
`/?demo`. No Nest server or LLM is required.

Optional live UI smoke (Nest must already be running on `:3000` with a real
provider or Ollama, and `CORS_ORIGINS` allowing `http://127.0.0.1:5173`):

```bash
# terminal 1
npm run start:dev
# terminal 2
LIVE_LLM_TEST=1 npm run test:ui:live
```

Live tests assert structure only (an assistant turn appears, no error banner) -
not model wording.

Walkthrough (when to use Playwright, how to add a test):
[Lesson 5](../../docs/lessons/05-playwright-ui-tests.md).

## Design choices

| Element | Role |
|---------|------|
| **Transport + `useChat`** | Talks to `POST /chat`; owns streaming, stop, regenerate, approvals |
| **`lib/parts.ts`** | Turns `UIMessage.parts` into text / reasoning / tool blocks the UI can switch on |
| **Message turn** | One avatar + body; routes each block to a bubble, tool card, or approval |
| **Tool call card** | Collapsible; state chip; order-shaped output as rows, else JSON |
| **Approval card** | Approve / Reject for Nest tools with `needsApproval: true` |
| **Composer** | Send / Stop; disabled while an approval is pending |
| **Empty state** | Suggestion chips that call `send()` - update these when you add tools |
| **Tokens in `styles.css`** | Light/dark via `data-theme`; components consume CSS variables |

Chat is a **renderer of agent parts**, not a second API client. Nest defines tools and approval rules; the UI maps part **types** and **states** to components.

## What it shows

- **Streaming turns** with a typing indicator, auto-scroll that stops when you
  scroll up, and a stop button while the agent is running.
- **Tool calls as cards** instead of raw JSON in the bubble: tool name, state
  (`running`, `done`, `failed`, `needs approval`), and a dedicated renderer for
  order results. Unknown output falls back to formatted JSON, so your own tools
  still render something readable.
- **Approve / Reject** for `cancelOrder`, with the composer blocked until you
  decide.
- Light and dark themes (system preference, remembered per browser), and a
  **New chat** button that starts a fresh `conversationId`.

The sample does not load `GET /conversations/:id` on refresh, and does not send
`agentId` (Nest defaults to `assistant`). Lesson 4 covers wiring both.

## Human-in-the-loop

Ask the assistant to cancel `ord_1002`. Because the Nest tool declares
`needsApproval: true`, the matching tool part arrives in state
`approval-requested` with an `approval.id`. Use **Approve** / **Reject**; the
client sends `addToolApprovalResponse({ id, approved })` and
`sendAutomaticallyWhen` continues the turn for you.

Note the part *state* - `tool-approval-request` is a name in the stream
protocol, not a `message.parts` entry, so filtering parts for that type never
matches.

## Extending for a new Nest tool

1. Add the tool on the Nest side ([Lesson 2](../../docs/lessons/02-adding-features.md)).
2. Reload the UI - you already get a JSON tool card.
3. Optionally: add a suggestion in `empty-state.tsx`, a shape- or name-specific
   renderer in `tool-call-card.tsx`, and/or `needsApproval` + the existing
   `ApprovalCard` path.

Keep presentation in components; keep `parts.ts` as a thin adapter.

## Layout

```
src/
  App.tsx              transport, useChat wiring, app shell, ?demo loader
  components/          composer, message turn, tool card, approval card, empty state
  lib/parts.ts         UIMessage parts -> what the UI renders
  lib/demo-fixture.ts  static messages for ?demo
  lib/markdown.tsx     tiny markdown renderer for assistant text
  lib/hooks.ts         theme + auto-scroll
  styles.css           design tokens and all component styles
e2e/
  demo.spec.ts         Playwright demo-mode suite (CI)
  live.spec.ts         optional LIVE_LLM_TEST=1 smoke
```
