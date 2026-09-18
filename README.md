# NestJS Agents Starter Template

A NestJS template for building agent features into a real backend, using the [AI SDK](https://ai-sdk.dev).

Most AI SDK examples assume Next.js and a single route handler. That works for a demo, but it gets awkward once agents need your existing services, your auth, your database and your tests. This template is how I'd set up a NestJS project for that: agents and tools are regular Nest providers, every tool call knows which user it runs for, and responses stream to the client in the format the AI SDK UI hooks expect.

If you want to understand what happens under the hood first (tool loops, memory, ReAct and friends, built by hand with local models), start with [ai-agents-from-scratch](https://github.com/pguso/ai-agents-from-scratch). This repo picks up where that one stops.

## Getting started

You need Node.js 20 or newer.

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

To run everything locally without an API key, set `AI_PROVIDER=ollama` and point `OLLAMA_BASE_URL` at your Ollama instance.

Then start the dev server:

```bash
npm run start:dev
```

OpenAPI docs are at [http://localhost:3000/docs](http://localhost:3000/docs). `POST /chat` is a stream (use curl or a React `useChat` client for that); `GET /conversations/:id` works well from Swagger Try it out. Short lessons on structure, features, Swagger, and React live in [docs/lessons](docs/lessons).

Send a message to the example agent:

```bash
curl -N http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"What can you do?"}]}]}'
```

You should see the response arrive as a stream.

## How the project is laid out

```
src/
  agents/        agent definitions, one file per agent
  tools/         tools as injectable providers
  chat/          streaming controller and conversation storage
  model/         provider setup, reads AI_PROVIDER and AI_MODEL
  common/        request context, guards, error mapping
  app.module.ts
```

The split is deliberate. An agent file says what the agent is for, which model it uses and which tools it gets. It does not know about HTTP. The chat module knows about HTTP and persistence but not about what any particular agent does. Tools know about your domain and nothing else. When something breaks, it's usually obvious which of the three to look at.

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

Copy `src/agents/assistant.agent.ts`, change the instructions and the tool list, and expose it through the chat controller or a controller of its own. The example agent uses `ToolLoopAgent` with a step limit, so a confused model can't loop forever and run up your bill.

## Conversations

Messages are stored through a `ConversationStore` interface. The default implementation keeps them in memory, which is fine for development and useless for anything else. Swap in your own implementation (Postgres, Redis, whatever you already run) by providing a different class for the same token in `ChatModule`.

## Frontend

The `/chat` endpoint speaks the AI SDK UI message stream protocol, so a React app can talk to it with `useChat` and a transport pointed at your API. Tool calls come through as message parts, which means you can render them properly (a table for an order lookup, an approve/reject button for anything that changes data) instead of dumping JSON into the chat. See [docs/lessons/04-react-frontend.md](docs/lessons/04-react-frontend.md) for headers, history loading, and how OpenAPI fits beside `useChat`.

## Tests

```bash
npm test
```

Tests follow the Chicago/Detroit (classicist) school: real collaborators, doubles only at the LLM boundary, and assertions on observable outcomes (tool results, store contents, HTTP)—not model wording or internal spies. See [docs/testing.md](docs/testing.md) for principles, the behavior inventory, and how to mock the model in agent and e2e specs.

## Versions

The AI SDK moves quickly and has renamed things between major versions. This template is pinned to AI SDK 6. If you upgrade, read the migration guide before you bump the version, not after.

## Contributing

Issues and pull requests are welcome. If you want to propose a bigger structural change, open an issue first so we can talk it through before you put time into it.

## License

MIT