# Agent instructions (nestjs-agents-starter)

Canonical rules for AI coding tools (Cursor, Codex, Claude Code, Copilot, Windsurf, etc.). Humans: see [docs/lessons/06-ai-assisted-development.md](docs/lessons/06-ai-assisted-development.md).

Before changing architecture or adding a feature, read [docs/lessons/01-project-structure.md](docs/lessons/01-project-structure.md) and [docs/lessons/02-adding-features.md](docs/lessons/02-adding-features.md).

## Hard invariants

1. **Layer boundaries**
   - `agents/` - instructions, tool wiring, step limits; return `ToolLoopAgent` from `create(ctx)`. No Express, no `@Res()`, no streaming, no persistence.
 - `tools/` - Nest providers with `build(ctx: RequestContext)` returning an AI SDK `tool()`. Scope every domain call with `ctx.userId`.
 - `orders/` - sample domain (`OrdersService`); tools stay thin wrappers over it.
 - `chat/` - HTTP, UI message streaming, conversation store. Owns controllers and `@Res()`.
 - `model/` - provider selection from env only.
 - `common/` - `RequestContext`, auth guard, filters - not feature logic.

2. **No global tool registry.** Agents only get tools you pass explicitly in that agent’s `create()`.

3. **Authorization.** Never trust model-supplied user/tenant ids. Tools authorize via `ctx` from `AuthGuard`.

4. **Schemas.** Tool args use Zod (`inputSchema`). HTTP DTOs use `class-validator` + Swagger decorators.

5. **Tests (Chicago / Detroit).** Real collaborators; double only the LLM (`MockLanguageModelV3`). Assert outcomes (HTTP, store, tool results), not model wording or internal spies. See [docs/testing.md](docs/testing.md).

6. **AI SDK 6.** This template is pinned to AI SDK 6. Do not upgrade major versions casually; check migration notes first.

## Where to put new work

| Change | Location | Also update |
|--------|----------|-------------|
| New tool | `src/tools/*.tool.ts` + `ToolsModule` | Agent tool map; unit `*.tool.spec.ts`; UI if user-facing ([lesson 4](docs/lessons/04-react-frontend.md)) |
| New agent | `src/agents/*.agent.ts` + `AgentsModule` + `AgentRegistry.register` | Call with `agentId` |
| Stream/chat HTTP | `src/chat/` | Swagger notes for streams ([lesson 3](docs/lessons/03-swagger-openapi.md)) |
| JSON REST | Controller + DTO + service | OpenAPI; e2e/unit test |
| Conversation store | Implement `ConversationStore`; swap in `ChatModule` | Keep keyed by `(userId, conversationId)` |

## Do not

- Register tools on a shared map every agent can reach
- Stream or write HTTP responses from agent/tool files
- Mock `OrdersService` / tools inside agent or tool tests
- Assert free-form model prose
- Commit `.env` or API keys
- Replace the JWT stub casually without noting production checklist in README

## Preferred workflows

**Add a tool:** copy `order-lookup.tool.ts` → Zod schema → use `ctx.userId` → register in `ToolsModule` → wire into one agent → add `*.tool.spec.ts` → optional UI card/approval ([lesson 4](docs/lessons/04-react-frontend.md)).

**Add an agent:** copy `assistant.agent.ts` → unique `id` → instructions + tools + `stopWhen` / step limit → export + `register` in `AgentRegistry`.

**Verify:** `npm run check` (lint, format check, unit, e2e, build). UI: `npm run test:ui`. Do not run live LLM tests unless asked (`LIVE_LLM_TEST=1`).

## Env / secrets

- Copy `.env.example` → `.env`. Never invent or commit real keys.
- Boot validates provider keys; for local-only use `AI_PROVIDER=ollama`.
- Default tests mock the model; no cloud key required.

## Docs map

| Doc | Use when |
|-----|----------|
| [Lesson 1](docs/lessons/01-project-structure.md) | Layers / request path |
| [Lesson 2](docs/lessons/02-adding-features.md) | Extending the template |
| [Lesson 3](docs/lessons/03-swagger-openapi.md) | OpenAPI / streaming limits |
| [Lesson 4](docs/lessons/04-react-frontend.md) | `examples/chat-ui` + tool cards |
| [Lesson 5](docs/lessons/05-playwright-ui-tests.md) | Playwright demo vs live |
| [Lesson 6](docs/lessons/06-ai-assisted-development.md) | Driving this repo with AI tools |
| [Testing](docs/testing.md) | Classicist test rules |
| [Deployment](docs/deployment.md) | Prod env, proxies, Docker |
