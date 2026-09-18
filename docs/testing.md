# Testing (Chicago / Detroit school)

This project follows the **Chicago / Detroit / classicist** approach to automated tests. A unit is a **unit of behavior**, not a single class. Collaborators stay real unless they are an external or shared boundary. Assertions prefer **observable state and outcomes** over interaction spies.

## Philosophy

| Principle | Practice here |
|-----------|----------------|
| Unit = **unit of behavior** | Prefer sociable tests spanning collaborators (e.g. tool + `OrdersService`), not one mock-heavy class at a time |
| Isolation = **tests don’t share state** | Fresh Nest modules / fresh service instances per test; no cross-test `Map` residue |
| Doubles only at **external / shared** boundaries | Double the **LLM** (`MockLanguageModelV3`); keep real `OrdersService`, tools, in-memory store |
| Prefer **state verification** | Assert returned orders, store contents, HTTP status/body, stream outcome—not `toHaveBeenCalledWith` on internal methods |
| Bottom-up | Domain → tools → agent (with mock model) → chat persistence → HTTP e2e |
| Refactor resilience | Don’t couple tests to private wiring or spy call graphs |

### Anti-patterns

- Mocking `OrdersService` inside tool or agent tests
- Mocking tools inside agent tests
- Using `vi.spyOn` / `toHaveBeenCalledWith` on internal collaborators as the **primary** assertion
- Asserting free-form model prose (wording changes across models and versions)
- Hitting live OpenAI / Anthropic / Ollama in the default CI suite

### Allowed doubles

| Boundary | Double |
|----------|--------|
| LLM | `MockLanguageModelV3` from `ai/test` (see `src/testing/mock-language-model.ts`) |
| Conversation persistence (future Postgres / Redis) | Real `InMemoryConversationStore` in tests; swap only the shared store behind `CONVERSATION_STORE` |
| Config / env for `ModelService` | Stub `ConfigService` values; mock `@ai-sdk/*` factories at the provider boundary |

Doubling the LLM is Detroit, not London: the model is the *external* system. Keep tools, orders, and the in-memory store real.

## Pyramid

```
        ┌─────────────────┐
        │  Live provider  │  optional, never default CI
        │  contract tests │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  HTTP e2e with  │  few; override ModelService
        │  mock LLM       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Sociable unit / │  many; real collaborators
        │ behavior specs  │
        └─────────────────┘
```

Most coverage lives in sociable Vitest specs under `src/**/*.spec.ts`. Fewer e2e specs under `test/**/*.e2e-spec.ts` exercise HTTP with a mocked model. Live-provider contract tests are out of scope for the default suite.

## How to double the LLM

Use `createScriptedModel` from `src/testing/mock-language-model.ts` (implements both `doGenerate` and `doStream`). Pass the model into `AssistantAgent.create`, or override `ModelService` in a Nest testing module. Assert **tool results and persisted state**, not internal call graphs.

```ts
import { createScriptedModel, toolOutputs } from '../testing/mock-language-model.js';

const { model } = createScriptedModel([
  [{ toolCallId: 'call-1', toolName: 'lookupOrder', input: { orderId: 'ord_1001' } }],
  'stop',
]);

const result = await agent.generate({ prompt: '…' });
expect(toolOutputs(result)).toContainEqual({
  toolName: 'lookupOrder',
  output: expect.objectContaining({ id: 'ord_1001', status: 'shipped' }),
});
```

## Commands

```bash
npm test          # vitest run — src/**/*.spec.ts
npm run test:watch
npm run test:cov  # coverage via @vitest/coverage-v8
npm run test:e2e  # vitest run --config ./vitest.config.e2e.ts
```

## Behavior inventory

### 1. Domain — `OrdersService`

Target: `src/tools/orders.service.spec.ts`

- [x] `findForUser` returns the owned order for `demo-user` / `ord_1001`
- [x] Unknown id → `NotFoundException` with a stable message shape
- [x] Other user’s id (`ord_2001`) → `NotFoundException` (no leak)
- [x] `listForUser` returns only that user’s rows
- [x] Fresh service instance per test (seed data is constructor-local)

### 2. Tools — `OrderLookupTool`, `ListOrdersTool`

Targets: `src/tools/order-lookup.tool.spec.ts`, `src/tools/list-orders.tool.spec.ts`

- [x] `OrderLookupTool` returns the order for the current user (real `OrdersService`)
- [x] `OrderLookupTool` rejects another user’s order
- [x] `ListOrdersTool` returns id / status / totalCents for the current user only
- [x] `ListOrdersTool` built with a different `RequestContext` never sees `demo-user` rows

No service mocks in these specs.

### 3. Agent — `AssistantAgent` + mock model

Target: `src/agents/assistant.agent.spec.ts`

Sociable: real tools + `OrdersService`; double only the model. Assert tool step **output**, not spies on `OrdersService`.

- [x] Model requests `lookupOrder` → tool result state matches `ord_1001` for `demo-user`
- [x] Model requests `listOrders` → result lists only demo-user orders
- [x] Cross-user order id in tool input → tool-error path (ownership holds under the agent)
- [x] Step budget: mock model that keeps requesting tools; assert finite stop via `stepCountIs(8)`

### 4. Chat — `ChatService` + store

Targets: `src/chat/chat.service.spec.ts`, `src/chat/in-memory-conversation.store.spec.ts`

- [x] `InMemoryConversationStore` round-trips messages; ids are isolated
- [x] Without `conversationId`: stream completes; store stays empty for unrelated ids
- [x] With `conversationId`: after finish, `load` returns final messages (user ids via `ensureMessageIds`)
- [x] `loadConversation` returns what was saved
- [x] Abort does not corrupt unrelated conversation ids

### 5. Common — auth context & errors

Targets: `src/common/auth.guard.spec.ts`, `src/common/http-exception.filter.spec.ts`

- [x] `AuthGuard`: no `x-user-id` → `demo-user` on the request context
- [x] `AuthGuard`: header present → that user id
- [x] `HttpExceptionFilter`: `NotFoundException` → JSON status/body
- [x] `HttpExceptionFilter`: headers already sent → no double-write

### 6. Model — `ModelService`

Target: `src/model/model.service.spec.ts`

- [x] Provider selection from config (`openai` / `anthropic` / `ollama`)
- [x] Missing API key throws a clear error
- [x] Ollama uses default base URL when unset
- [x] No network calls in these tests (config / SDK factory boundary)

### 7. HTTP e2e

Target: `test/app.e2e-spec.ts`

Override `ModelService.getModel()` with a scripted mock model.

- [x] `GET /conversations/:id` → `[]` when empty
- [x] `POST /chat` without `messages` → 400
- [x] `POST /chat` valid body → 200 streaming response
- [x] `POST /chat` + `conversationId` → subsequent `GET /conversations/:id` returns saved messages
- [x] `x-user-id: other-user` + mock tool-call for `ord_1001` → no demo-user order leakage

## When to add a double

Add a test double when the dependency is:

- **External** — LLM providers, third-party HTTP APIs
- **Shared mutable infrastructure** — a real database or Redis that would couple tests or slow the suite

Do **not** add a double when:

- The collaborator is in-process domain logic (`OrdersService`, tools, agents)
- An in-memory implementation already exists behind a token (`CONVERSATION_STORE`)

If a new feature needs Postgres or Redis, keep the interface, ship an in-memory (or testcontainer) implementation for tests, and reserve mocks for true network edges.

## Contribution rule

New tools and agents land with Detroit-style behavior tests before merge:

1. Real domain collaborators
2. Mock model only if the test drives an agent or chat stream
3. Assert observable outcomes (return values, store contents, HTTP status/body, tool results)
4. Do not assert model wording or internal spy call graphs as the contract

## Out of scope (for now)

- Live OpenAI / Anthropic / Ollama contract tests in default CI
- Enforced coverage thresholds
- Property-based testing
