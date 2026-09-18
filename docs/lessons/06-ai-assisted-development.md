# Lesson 6 - AI-assisted development

How to use Cursor, Codex, Claude Code, Copilot, Windsurf, and similar tools against this template without fighting the architecture.

Machine-readable rules live in several places (same invariants, different loaders):

| File | Loaded by |
|------|-----------|
| [AGENTS.md](../../AGENTS.md) | Codex, Cursor, many others (canonical) |
| [CLAUDE.md](../../CLAUDE.md) | Claude Code |
| [.cursor/rules/](../../.cursor/rules/) | Cursor (always-on + file-scoped) |
| [.github/copilot-instructions.md](../../.github/copilot-instructions.md) | GitHub Copilot |
| [.windsurfrules](../../.windsurfrules) | Windsurf |
| [examples/chat-ui/AGENTS.md](../../examples/chat-ui/AGENTS.md) | Nested Codex/Cursor work in the sample UI |

You do not need to duplicate these into chat. Point the tool at the repo root and give a concrete task.

## Before you prompt

1. Have the app runnable (`cp .env.example .env`, `npm install`, `npm run start:dev`) or at least tests green (`npm test`).
2. Skim [Lesson 1](./01-project-structure.md) once so you can spot when the model crosses a layer boundary.
3. Prefer one vertical slice per session (one tool, or one agent, or one UI card) - not “build our product.”

## Prompt patterns that work

**Add a tool (backend first):**

> Read `docs/lessons/02-adding-features.md` and `AGENTS.md`. Add an `OrderStatusTool` following `src/tools/order-lookup.tool.ts`: Zod input, `build(ctx)`, authorize with `ctx.userId`, register in `ToolsModule`, wire only into `AssistantAgent`, add a sociable `*.tool.spec.ts`. Do not change chat streaming.

**Add an agent:**

> Copy `assistant.agent.ts` to a new agent with id `support`, shorter instructions, only `orderLookup`. Register it in `AgentsModule` and `AgentRegistry`. No HTTP changes.

**Wire UI for a tool:**

> Read `docs/lessons/04-react-frontend.md`. In `examples/chat-ui`, add an empty-state suggestion and a small result card for tool X. Keep plain CSS. Add or extend a Playwright demo test if there is a stable fixture hook.

**Fix a failing test:**

> Follow `docs/testing.md`. Keep real collaborators; only the LLM may be mocked. Fix the assertion to check store/HTTP/tool output, not model wording.

## What to ask the model to open

| Task | Open first |
|------|------------|
| Any feature | `AGENTS.md` + lesson 2 |
| Layer confusion | lesson 1 |
| Swagger / stream docs | lesson 3 |
| `useChat` / tool cards | lesson 4 + `examples/chat-ui/AGENTS.md` |
| Playwright | lesson 5 |
| Test style | `docs/testing.md` |

## Review checklist (you, not the model)

After the agent finishes:

- [ ] New tools use `ctx.userId` (or equivalent on `RequestContext`)
- [ ] Tools are not on a global registry
- [ ] Agents still do not import Express / `@Res()`
- [ ] Specs mock only the LLM
- [ ] `npm run check` passes (and `npm run test:ui` if you touched the sample UI)
- [ ] No `.env` or keys in the diff

## Anti-patterns to reject

- “Also refactor the chat module / switch to a different agent framework”
- Mocking Nest services heavily to unit-test one class in isolation
- Upgrading AI SDK major version mid-task
- Pasting production API keys into the prompt or into committed files
- Huge PRs that mix backend tools, auth rewrites, and a UI redesign

## Multi-tool tip

If you switch between Cursor and Codex (or Copilot), keep **`AGENTS.md` as the source of truth**. The other files are thin adapters so each product auto-loads guidance; edit invariants in `AGENTS.md` first, then mirror any must-not-miss rules into `.cursor/rules` and Copilot instructions.

Next steps: ship a small feature with the checklist above, then read [Deployment](../deployment.md) before production auth/CORS/store changes.
