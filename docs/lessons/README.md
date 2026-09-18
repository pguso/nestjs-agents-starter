# Lessons

Short lessons for this NestJS agents starter: how the project is structured, how to add features, how OpenAPI/Swagger fits, how a React app should talk to the API, how to cover the sample UI with Playwright, and how to drive the template with AI coding tools.

## Reading order

1. [Project structure](./01-project-structure.md) - layers, ownership, request path
2. [Adding features](./02-adding-features.md) - tools, agents, HTTP endpoints, stores
3. [Swagger / OpenAPI](./03-swagger-openapi.md) - documenting the API, streaming limits
4. [React frontend](./04-react-frontend.md) - UI elements, design choices, `useChat` wiring, tool cards / approvals, extending for new tools
5. [Browser tests with Playwright](./05-playwright-ui-tests.md) - why Playwright, demo vs live, writing a UI test
6. [AI-assisted development](./06-ai-assisted-development.md) - Cursor, Codex, Claude Code, Copilot, Windsurf; prompt patterns and review checklist

Also see [Deployment](../deployment.md) for production env, Docker, auth/CORS, and streaming proxies, [Testing](../testing.md) for the Vitest pyramid and inventory, and root [AGENTS.md](../../AGENTS.md) for machine-readable coding rules.

Run the app (`npm run start:dev`), then open [http://localhost:3000/docs](http://localhost:3000/docs) while reading lessons 3 and 4. For lesson 5, run `npm run test:ui` from the repo root.
