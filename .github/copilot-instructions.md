# GitHub Copilot instructions

This is a NestJS + AI SDK 6 agents starter. Follow root `AGENTS.md` for full rules.

## Must follow

- Put agent config in `src/agents/` (return `ToolLoopAgent` from `create(ctx)`). Never stream HTTP or use `@Res()` there.
- Put tools in `src/tools/` as Nest providers with `build(ctx: RequestContext)`. Always scope domain calls with `ctx.userId`.
- Put streaming and persistence in `src/chat/`. Conversation keys are `(userId, conversationId)`.
- Do not create a global tool registry; wire tools explicitly on each agent.
- Tool inputs: Zod. HTTP DTOs: class-validator + Swagger.
- Tests: Chicago/Detroit — real collaborators; double only the LLM (`MockLanguageModelV3`). Do not assert model wording. See `docs/testing.md`.
- When extending the template, mirror `docs/lessons/02-adding-features.md` and existing `*.tool.ts` / `*.agent.ts` files.
- Sample UI lives in `examples/chat-ui` (plain CSS + `useChat`). Tool cards / approvals: `docs/lessons/04-react-frontend.md`.
- Do not commit secrets or `.env`. Template is AI SDK 6 — avoid casual major upgrades.
