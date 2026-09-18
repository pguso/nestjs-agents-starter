# NestJS Agents Starter Template

A NestJS template for building agent features into a real backend, using the [AI SDK](https://ai-sdk.dev).

Most AI SDK examples assume Next.js and a single route handler. That works for a demo, but it gets awkward once agents need your existing services, your auth, your database and your tests. This template is how I'd set up a NestJS project for that: agents and tools are regular Nest providers, every tool call knows which user it runs for, and responses stream to the client in the format the AI SDK UI hooks expect.

If you want to understand what happens under the hood first (tool loops, memory, ReAct and friends, built by hand with local models), start with [ai-agents-from-scratch](https://github.com/pguso/ai-agents-from-scratch). This repo picks up where that one stops.

## Getting started

You need Node.js 20 or newer (see [`.nvmrc`](.nvmrc)).

```bash
git clone https://github.com/pguso/nestjs-agents-starter.git my-project
cd my-project
npm install
cp .env.example .env
```

Open `.env`, pick a provider and fill in the key:

```bash
AI_PROVIDER=openai        # openai | anthropic | ollama
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=sk-...
```

The process **validates env at boot** and exits with a clear message if the selected provider is missing a key.

To run everything locally without a cloud API key, set `AI_PROVIDER=ollama` and point `OLLAMA_BASE_URL` at your Ollama instance - or use Docker Compose (below).

Then start the dev server:

```bash
npm run start:dev
```

- OpenAPI: [http://localhost:3000/docs](http://localhost:3000/docs)
- Health: [http://localhost:3000/health](http://localhost:3000/health)
- Lessons: [docs/lessons](docs/lessons)
- AI coding tools: [AGENTS.md](AGENTS.md) · [lesson 6](docs/lessons/06-ai-assisted-development.md)
- Deployment: [docs/deployment.md](docs/deployment.md)

Send a message to the example agent:

```bash
curl -N http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: demo-user" \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"What can you do?"}]}]}'
```

You should see the response arrive as a stream.

### Docker Compose (app + Ollama)

```bash
docker compose up --build
docker compose exec ollama ollama pull llama3.2
curl -s http://localhost:3000/health
```

Compose defaults to `AI_PROVIDER=ollama`. Override with a `.env` file if you prefer OpenAI/Anthropic keys on the host.

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Process exits on start mentioning `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Wrong `AI_PROVIDER` or empty key - fix `.env` or use `ollama` |
| Stream errors / connection refused to Ollama | Ollama not running, or wrong `OLLAMA_BASE_URL`; pull the model (`ollama pull …`) |
| Empty or truncated stream behind nginx | Disable proxy buffering; see [docs/deployment.md](docs/deployment.md) |
| `401` with `AUTH_MODE=jwt` | Send a signed HS256 Bearer JWT (`JWT_SECRET`); for unsigned local tokens use `AUTH_MODE=jwt-stub`, or switch to `AUTH_MODE=dev` |

## Lessons

| # | Lesson | Covers |
|---|--------|--------|
| 1 | [Project structure](docs/lessons/01-project-structure.md) | Layers, ownership, request path |
| 2 | [Adding features](docs/lessons/02-adding-features.md) | Tools, agents, HTTP endpoints, stores |
| 3 | [Swagger / OpenAPI](docs/lessons/03-swagger-openapi.md) | Documenting the API, streaming limits |
| 4 | [React frontend](docs/lessons/04-react-frontend.md) | `useChat` wiring, tool cards / approvals, extending for new tools |
| 5 | [Browser tests with Playwright](docs/lessons/05-playwright-ui-tests.md) | Demo vs live UI e2e, writing Playwright tests |
| 6 | [AI-assisted development](docs/lessons/06-ai-assisted-development.md) | Cursor, Codex, Claude Code, Copilot - prompts and review checklist |

Full index: [docs/lessons](docs/lessons). Also see [deployment](docs/deployment.md).

### AI coding tools

This repo ships rules for common agents so they respect the Nest layer boundaries:

| File | Environment |
|------|-------------|
| [AGENTS.md](AGENTS.md) | Canonical (Codex, Cursor, others) |
| [CLAUDE.md](CLAUDE.md) | Claude Code |
| [.cursor/rules/](.cursor/rules/) | Cursor |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | GitHub Copilot |
| [.windsurfrules](.windsurfrules) | Windsurf |

Start from [lesson 6](docs/lessons/06-ai-assisted-development.md) if you will extend the template with an AI coding tool.

## Production checklist

Before you ship:

1. Set `AUTH_MODE=jwt` and `JWT_SECRET` (boot refuses `dev` / `jwt-stub` when `NODE_ENV=production`). For IdP SSO, swap HS256 for JWKS in `AuthGuard`.
2. Set `CORS_ORIGINS` to your frontend origin(s).
3. Swap `InMemoryConversationStore` for a durable, **user-scoped** store (copy `postgres-conversation.store.skeleton.ts`, implement it, then bind — do not bind the skeleton as-is).
4. Run behind a reverse proxy configured for streaming.

## How the project is laid out

```
src/
  agents/        agent definitions + AgentRegistry
  tools/         tools as injectable providers
  chat/          streaming controller and conversation storage
  model/         provider setup, reads AI_PROVIDER and AI_MODEL
  config/        boot-time env validation
  health/        liveness endpoint
  common/        request context, guards, error mapping
  app.module.ts
```

The split is deliberate. An agent file says what the agent is for, which model it uses and which tools it gets, then returns a `ToolLoopAgent` - nothing more. It never sees Express or `@Res()`. The chat module owns HTTP streaming and persistence but not what any particular agent does. Tools know about your domain and nothing else. When something breaks, it's usually obvious which of the three to look at.

## Writing a tool

Tools are Nest providers, so they can inject whatever they need. The one rule: tools get built per request, with the request context passed in, so they can never act on behalf of someone other than the current user.

```ts
@Injectable()
export class OrderLookupTool {
  constructor(private readonly orders: OrdersService) {}

  build(ctx: RequestContext) {
    return tool({
      description: 'Look up one of the current user\'s orders by id',
      inputSchema: z.object({ orderId: z.string() }),
      execute: ({ orderId }) => this.orders.findForUser(ctx.userId, orderId),
    });
  }
}
```

Register it in `ToolsModule`, then add it to the agent that should have access to it. Agents only see the tools you hand them explicitly. There is no global tool registry that every agent can reach into, because that is exactly how an agent ends up with access it shouldn't have.

## Adding an agent

1. Copy `src/agents/assistant.agent.ts`, give it a unique `id`, change instructions and tools.
2. Export it from `AgentsModule` and `register` it in `AgentRegistry` (inject it into the registry constructor or call `register` after construction).
3. Call `POST /chat` with `"agentId": "your-id"` (default is `assistant`).

The example agent uses `ToolLoopAgent` with a step limit, so a confused model can't loop forever and run up your bill.

## Conversations

Messages are stored through a `ConversationStore` interface keyed by **`(userId, conversationId)`**. The default implementation keeps them in memory (boot warns `conversation store = in-memory (ephemeral)`), which is fine for development and useless for anything else. Swap in your own implementation by copying `postgres-conversation.store.skeleton.ts`, implementing `load`/`save`, and providing that class for the same token in `ChatModule`. `GET /conversations/:id` returns `[]` for missing or empty history for the current user — not an error, and not authorization success for another user’s id.

## Frontend

A Vite + React + `useChat` client lives in [`examples/chat-ui`](examples/chat-ui). It streams against `POST /chat`, renders tool calls as cards rather than raw JSON, and shows Approve/Reject for the `cancelOrder` tool. Plain CSS, no UI library, so it is easy to strip down or copy from.

```bash
cd examples/chat-ui && npm install && npm run dev
```

The `/chat` endpoint speaks the AI SDK UI message stream protocol. [Lesson 4](docs/lessons/04-react-frontend.md) explains the UI elements, why they are split that way, and how to wire new Nest tools into cards, approvals, and empty-state suggestions.

## Tests

```bash
npm test
npm run test:e2e
npm run test:ui
# optional live provider smoke (needs real keys / Ollama):
LIVE_LLM_TEST=1 npm run test:live
# optional live chat-ui smoke (Nest on :3000 + provider keys / Ollama):
LIVE_LLM_TEST=1 npm run test:ui:live
```

Or `npm run check` for lint + format check + unit + e2e + build.

Tests follow the Chicago/Detroit (classicist) school: real collaborators, doubles only at the LLM boundary, and assertions on observable outcomes (tool results, store contents, HTTP)-not model wording or internal spies. See [docs/testing.md](docs/testing.md) for principles, the behavior inventory, and how to mock the model in agent and e2e specs. Sample UI browser tests live under [`examples/chat-ui/e2e`](examples/chat-ui/e2e) (demo fixture in CI; live LLM opt-in) - [Lesson 5](docs/lessons/05-playwright-ui-tests.md) explains how to write them.

## Versions

The AI SDK moves quickly and has renamed things between major versions. This template is pinned to AI SDK 6. If you upgrade, read the migration guide before you bump the version, not after.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT - see [LICENSE](LICENSE).
