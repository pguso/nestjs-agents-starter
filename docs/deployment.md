# Deployment

Production checklist and ops notes for this starter.

## Build and run

```bash
npm ci
npm run build
NODE_ENV=production npm run start:prod
```

Or use Docker:

```bash
docker compose up --build
```

Compose defaults to `AI_PROVIDER=ollama` with a local Ollama service. Pull a model once Ollama is up:

```bash
docker compose exec ollama ollama pull llama3.2
```

Then hit `GET /health` and stream `POST /chat`.

## Environment

Copy [`.env.example`](../.env.example). Boot fails fast if the selected provider is missing a required key.

| Variable | Notes |
|----------|--------|
| `AI_PROVIDER` / `AI_MODEL` | `openai`, `anthropic`, or `ollama` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Required for the matching provider |
| `OLLAMA_BASE_URL` | OpenAI-compatible base URL (compose uses `http://ollama:11434/v1`) |
| `AUTH_MODE` | `dev` (spoofable `x-user-id`), `jwt-stub` (unsigned Bearer `sub`), or `jwt` (HS256 via `JWT_SECRET`). Stubs need `ALLOW_INSECURE_AUTH` + `NODE_ENV=development`\|`test`; refused in production. |
| `ALLOW_INSECURE_AUTH` | Required for `dev` / `jwt-stub` (`true`/`1`/`yes`/`on`). Never set in deployed environments. Not required for `AUTH_MODE=jwt`. |
| `JWT_SECRET` | Required when `AUTH_MODE=jwt`; minimum 32 characters. Optional `JWT_ISSUER` / `JWT_AUDIENCE`. For IdP SSO, swap the guard to JWKS later. |
| `CORS_ORIGINS` | Comma-separated origins. Unset allows all in non-production; production requires an explicit list (or CORS stays locked) |
| `BODY_SIZE_LIMIT` | JSON/urlencoded limit (default `256kb`) |
| `THROTTLE_TTL_MS` / `THROTTLE_LIMIT` | Global rate limit; `POST /chat` uses a tighter 20/min override |
| `AGENT_METRICS_LOG` | When `true`/`1`, log agent step usage and finish events as JSON |
| `HOST` | Bind address. Defaults to `127.0.0.1` outside production; `0.0.0.0` in production. Compose sets `0.0.0.0` for container port mapping. |
| `PORT` | Defaults to `3000` |

## Auth and CORS

Before exposing the API:

1. Set `AUTH_MODE=jwt` and `JWT_SECRET` (min 32 characters; required when `NODE_ENV=production`). Do not set `ALLOW_INSECURE_AUTH` in deployed environments - stub modes also fail if `NODE_ENV` is unset or not `development`/`test`. Optionally set `JWT_ISSUER` / `JWT_AUDIENCE`. For Auth0/Clerk/Cognito, replace HS256 with JWKS in [`AuthGuard`](../src/common/auth.guard.ts) - still populate `RequestContext` the same way.
2. Set `CORS_ORIGINS` to your frontend origin(s).
3. Keep populating `RequestContext` the same way so tools stay user-scoped.

Errors and agent logs include `requestId` (from `x-request-id` or a generated UUID) for correlation.

## Security defaults

- Helmet is enabled in [`main.ts`](../src/main.ts).
- Body size is capped (`BODY_SIZE_LIMIT`).
- `@nestjs/throttler` guards the app; health checks skip throttling.
- Non-production binds to `127.0.0.1` by default (set `HOST=0.0.0.0` only when you intentionally expose the process, e.g. Docker).
- `JWT_SECRET` must be at least 32 characters when `AUTH_MODE=jwt`.

## Conversations

The default store is in-memory and user-scoped (`userId` + `conversationId`). Boot warns `conversation store = in-memory (ephemeral)` in non-production, and **refuses to start** when `NODE_ENV=production` (same fail-closed idea as auth stubs). For production, copy [`postgres-conversation.store.skeleton.ts`](../src/chat/postgres-conversation.store.skeleton.ts), implement `load`/`save`, then swap the provider in [`ChatModule`](../src/chat/chat.module.ts) (binding the skeleton as-is fails at module init). When to choose Postgres vs Redis (and why agent APIs care): [Lesson 2 - Persist conversations](lessons/02-adding-features.md#persist-conversations-differently).

## Streaming and reverse proxies

`POST /chat` is a long-lived stream. Disable response buffering on the proxy:

- **nginx:** `proxy_buffering off;` and adequate `proxy_read_timeout`
- **Cloudflare / ALB:** prefer streaming-friendly settings; avoid response buffering features

Client disconnects abort the agent via the controller’s `AbortSignal`.

## Health

`GET /health` is process liveness only. It does not probe the LLM provider. Use it for compose/k8s readiness of the Nest process; add a separate readiness check if you need model reachability.

## Multi-agent

Register agents on [`AgentRegistry`](../src/agents/agent.registry.ts) and pass `agentId` on `POST /chat` (default `assistant`).
