# Sample chat UI

Minimal Vite + React + AI SDK `useChat` client for the Nest starter.

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

## Human-in-the-loop

Ask the assistant to cancel `ord_1002`. The stream pauses on a `tool-approval-request` for `cancelOrder`. Use **Approve** / **Reject** in the UI; the client sends the approval response and continues automatically.
