# Chat UI agents notes

Parent rules: [/AGENTS.md](../../AGENTS.md). Frontend lesson: [docs/lessons/04-react-frontend.md](../../docs/lessons/04-react-frontend.md).

## Scope

Vite + React + `@ai-sdk/react` `useChat` against Nest `POST /chat`. Plain CSS; no UI library.

## When editing here

- Keep streaming protocol compatible with the AI SDK UI message stream from the Nest backend.
- New tools from Nest: default JSON tool card is fine; add dedicated renderers / empty-state chips / `needsApproval` only when useful.
- Prefer small UI changes colocated with existing `App.tsx` patterns unless splitting is clearly needed.
- Playwright: prefer `e2e/demo.spec.ts` (`?demo`) for deterministic CI. Live LLM specs are opt-in (`LIVE_LLM_TEST=1`).

## Do not

- Introduce a component library or rewrite styling without being asked.
- Point the client at a different API shape than `POST /chat` without updating Nest and lesson 4.
- Assert live model prose in default UI tests.
