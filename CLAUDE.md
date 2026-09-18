# Claude Code

Follow the root [AGENTS.md](./AGENTS.md) for all coding work in this repository. That file is the source of truth for layer boundaries, tools/agents patterns, and tests.

## Quick start for this session

1. If adding a tool, agent, endpoint, or store - read [docs/lessons/02-adding-features.md](docs/lessons/02-adding-features.md) first.
2. Prefer copying existing files (`order-lookup.tool.ts`, `assistant.agent.ts`) over new patterns.
3. Keep changes scoped; do not refactor unrelated layers.
4. Run `npm run check` before considering the task done (unless the user asked for a docs-only change).

## NestJS agents reminders

- Agents: `create(ctx)` → `ToolLoopAgent` only; no HTTP streaming.
- Tools: `build(ctx)` + `ctx.userId`; explicit per-agent wiring.
- Tests: mock only the LLM; assert observable outcomes (`docs/testing.md`).

Human-oriented guide for prompting against this template: [docs/lessons/06-ai-assisted-development.md](docs/lessons/06-ai-assisted-development.md).
