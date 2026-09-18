# Lesson 2 — Adding features

Patterns for extending this starter without breaking the layer boundaries from [Lesson 1](./01-project-structure.md).

## Add a tool

Tools are Nest providers. They inject domain services and expose a `build(ctx: RequestContext)` method that returns an AI SDK `tool()`.

Checklist:

1. Create `src/tools/your-feature.tool.ts` (copy [`order-lookup.tool.ts`](../../src/tools/order-lookup.tool.ts)).
2. Use a Zod `inputSchema` for tool arguments (tools use Zod; HTTP DTOs use `class-validator`).
3. Call your domain service with `ctx.userId` — never trust an id from the model alone for authorization.
4. Register and export the tool in [`ToolsModule`](../../src/tools/tools.module.ts).
5. Inject it into the agent that should have it and add it to the `tools: { ... }` map in `create()`.
6. Add a unit test that calls `build(ctx)` / exercises the tool with a fixed context (see existing `*.tool.spec.ts`).

Do **not** register tools on a global map that every agent can reach. Explicit wiring is how you avoid accidental privilege.

## Add an agent

1. Copy [`assistant.agent.ts`](../../src/agents/assistant.agent.ts).
2. Change instructions, tool list, and `MAX_STEPS` / `stopWhen` as needed.
3. Export the agent from [`AgentsModule`](../../src/agents/agents.module.ts).
4. Expose it either by injecting it into [`ChatService`](../../src/chat/chat.service.ts) (replace or branch) or by adding a dedicated controller under `chat/` (or a new feature module that owns HTTP for that agent).

Agents must not import Express types or write to `Response`. Streaming belongs in the chat layer.

## Add a REST endpoint

Use this for non-streaming JSON APIs (conversation load is the template).

1. Add a method on an existing controller or create a feature module with its own controller.
2. Define a DTO with `class-validator` and `@ApiProperty` / `@ApiPropertyOptional` (see [`chat.dto.ts`](../../src/chat/chat.dto.ts)).
3. Document with `@ApiTags`, `@ApiOperation`, `@ApiOkResponse`, and `@ApiSecurity('x-user-id')` if the route is user-scoped.
4. Keep business logic in a service; keep the controller thin.
5. Add an e2e or unit test under `test/` or next to the service.

Swagger Try it out works well for these endpoints. See [Lesson 3](./03-swagger-openapi.md).

## Persist conversations differently

[`ChatModule`](../../src/chat/chat.module.ts) binds:

```ts
{ provide: CONVERSATION_STORE, useClass: InMemoryConversationStore }
```

Implement [`ConversationStore`](../../src/chat/conversation-store.ts) (`load` / `save`) against Postgres, Redis, etc., then swap `useClass` (or `useFactory`). Controllers and agents do not change.

## Auth beyond the stub

[`AuthGuard`](../../src/common/auth.guard.ts) is a dev identity stub. To go to production:

1. Replace the guard with JWT/session validation.
2. Still populate `RequestContext` the same way (`userId`, later roles, tenant, …).
3. Keep tools reading only from `ctx` — not from raw headers inside tool code.
4. Update the Swagger security scheme in [`main.ts`](../../src/main.ts) to match (Bearer instead of `x-user-id`).

## Feature integration rules (summary)

| Kind | Where | Document with Swagger? |
|------|-------|-------------------------|
| Tool | `tools/` + agent wiring | No (not HTTP) |
| Agent | `agents/` | No (not HTTP) |
| Stream chat | `chat/` controller + service | Yes, but mark as stream / limited Try it out |
| JSON REST | controller + DTO | Yes, full Try it out |
| Store | `ConversationStore` impl | No |

Next: [Swagger / OpenAPI](./03-swagger-openapi.md).
