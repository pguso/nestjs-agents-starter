# Lesson 2 - Adding features

Patterns for extending this starter without breaking the layer boundaries from [Lesson 1](./01-project-structure.md).

## Add a tool

Tools are Nest providers. They inject domain services and expose a `build(ctx: RequestContext)` method that returns an AI SDK `tool()`.

Checklist:

1. Create `src/tools/your-feature.tool.ts` (copy [`order-lookup.tool.ts`](../../src/tools/order-lookup.tool.ts)).
2. Use a Zod `inputSchema` for tool arguments (tools use Zod; HTTP DTOs use `class-validator`).
3. Call your domain service with `ctx.userId` - never trust an id from the model alone for authorization.
4. Register and export the tool in [`ToolsModule`](../../src/tools/tools.module.ts).
5. Inject it into the agent that should have it and add it to the `tools: { ... }` map in `create()`.
6. Add a unit test that calls `build(ctx)` / exercises the tool with a fixed context (see existing `*.tool.spec.ts`).

Do **not** register tools on a global map that every agent can reach. Explicit wiring is how you avoid accidental privilege.

If the tool is user-facing, update the sample UI (or your own client) next: at minimum it will show as a JSON tool card; optionally add empty-state suggestions, a dedicated result renderer, or `needsApproval` + Approve/Reject. See [Lesson 4](./04-react-frontend.md#how-to-design-and-wire-a-new-capability).

## Add an agent

1. Copy [`assistant.agent.ts`](../../src/agents/assistant.agent.ts).
2. Set a unique `readonly id` (this is the `agentId` clients send).
3. Change instructions, tool list, and `MAX_STEPS` / `stopWhen` as needed.
4. Export the agent from [`AgentsModule`](../../src/agents/agents.module.ts).
5. Inject it into [`AgentRegistry`](../../src/agents/agent.registry.ts) and call `register(...)` in the constructor (same place `AssistantAgent` is registered).
6. Call `POST /chat` with `"agentId": "your-id"` (omit to use the default `assistant`).

Keep the agent file limited to `create(ctx)` → `new ToolLoopAgent({ ... })`. Do not import Express types, inject `@Res()`, or write to `Response` - streaming stays in [`ChatController`](../../src/chat/chat.controller.ts) / [`ChatService`](../../src/chat/chat.service.ts).

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

Implement [`ConversationStore`](../../src/chat/conversation-store.ts) (`load(userId, conversationId)` / `save(userId, conversationId, messages)`) against Postgres, Redis, etc. Start from the [`PostgresConversationStore`](../../src/chat/postgres-conversation.store.ts) skeleton, then swap `useClass` (or `useFactory`). Controllers and agents do not change. Always key by user so history cannot leak across accounts.

## Auth beyond the stub

[`AuthGuard`](../../src/common/auth.guard.ts) supports:

- `AUTH_MODE=dev` (default): spoofable `x-user-id`
- `AUTH_MODE=jwt`: requires Bearer token; starter reads an **unsigned** `sub` claim

To go to production:

1. Set `AUTH_MODE=jwt` and replace the guard with real JWT/JWKS or session validation.
2. Still populate `RequestContext` the same way (`userId`, later roles, tenant, …).
3. Keep tools reading only from `ctx` - not from raw headers inside tool code.
4. Set `CORS_ORIGINS` and update the Swagger security scheme in [`main.ts`](../../src/main.ts) to match.
5. See [Deployment](../deployment.md).

## Feature integration rules (summary)

| Kind | Where | Document with Swagger? |
|------|-------|-------------------------|
| Tool | `tools/` + agent wiring | No (not HTTP) |
| Agent | `agents/` + `AgentRegistry` | No (not HTTP) |
| Stream chat | `chat/` controller + service | Yes, but mark as stream / limited Try it out |
| JSON REST | controller + DTO | Yes, full Try it out |
| Store | `ConversationStore` impl | No |

Next: [Swagger / OpenAPI](./03-swagger-openapi.md).
