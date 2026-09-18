# Lesson 5 - Browser tests with Playwright

Vitest covers Nest behavior and HTTP. Playwright covers what the **user sees** in [`examples/chat-ui`](../../examples/chat-ui): empty state, tool cards, Approve/Reject, theme toggle, and the composer blocking while an approval is pending.

This lesson is about **when** to use Playwright, **how** the suite is set up here, and **how to write** a new UI test without coupling to the LLM.

## Why Playwright exists in this starter

| Layer | Tool | What it proves |
|-------|------|----------------|
| Sociable unit / behavior | Vitest (`src/**/*.spec.ts`) | Tools, agents, store - real collaborators, mock LLM |
| HTTP e2e | Vitest + Supertest (`test/*.e2e-spec.ts`) | Status codes, streams, conversation save - Nest in-process |
| Browser e2e | Playwright (`examples/chat-ui/e2e`) | Layout, roles, clicks, disabled controls - real Chromium |

Playwright does **not** replace Nest tests. An HTTP e2e can pass while the Approve button is broken or the composer stays enabled during approval. That class of bug is what browser tests catch.

Use Playwright when the change is **UI behavior**:

- A new empty-state chip
- A new tool card or approval flow
- Composer / status / theme interactions
- Regressions that only appear after React renders parts

Prefer Vitest when the change is **domain or API** (tool ownership, stream protocol, auth). Those stay fast and deterministic without a browser.

Philosophy matches [docs/testing.md](../testing.md): assert **observable outcomes**, not model wording or private wiring.

## Two modes: demo vs live

```
┌─────────────────────────────────────────┐
│  Demo suite (default CI)                │
│  /?demo -> static UIMessage fixture      │
│  No Nest, no API keys, no LLM           │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Live smoke (opt-in)                    │
│  LIVE_LLM_TEST=1 + Nest on :3000        │
│  Real stream; assert structure only     │
└─────────────────────────────────────────┘
```

**Demo (`/?demo`)** loads messages from [`demo-fixture.ts`](../../examples/chat-ui/src/lib/demo-fixture.ts): a completed `listOrders` card and a `cancelOrder` in `approval-requested`. Approve/Reject update local state only. That is what CI runs.

**Live** opens `/`, clicks a suggestion, and waits until the agent finishes. Assert that an assistant turn appeared and there is no error banner - never assert exact assistant prose (models change wording).

## Run the suite

```bash
# from repo root - demo mode only
npm run test:ui

# or from the UI package
cd examples/chat-ui
npm install
npx playwright install chromium   # first time / CI
npm run test:e2e
```

Live (Nest must already be running with a provider or Ollama):

```bash
# terminal 1
npm run start:dev   # CORS_ORIGINS=http://127.0.0.1:5173 if you locked CORS

# terminal 2
LIVE_LLM_TEST=1 npm run test:ui:live
```

Playwright’s config builds the UI and serves `vite preview` on `127.0.0.1:5173`. See [`playwright.config.ts`](../../examples/chat-ui/playwright.config.ts).

## How a demo test is structured

Specs live under [`examples/chat-ui/e2e`](../../examples/chat-ui/e2e). Prefer **roles and accessible names** already in the UI (`getByRole`, headings, `aria-label`) over CSS classes.

```ts
import { expect, test } from '@playwright/test';

test.describe('demo fixture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo');
  });

  test('blocks the composer while approval is pending', async ({ page }) => {
    const message = page.getByRole('textbox', { name: 'Message' });
    await expect(message).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Send message' }),
    ).toBeDisabled();
  });
});
```

Pattern:

1. `page.goto('/')` for empty state, or `/?demo` for the fixture
2. Locate controls the way a screen reader would (`getByRole`, `getByText` when unique)
3. Assert visibility, enabled/disabled, or attributes - outcomes the user can notice
4. For interactions: click Approve/Reject / New chat / theme, then assert the new state

Full suite: [`demo.spec.ts`](../../examples/chat-ui/e2e/demo.spec.ts).

## Write a new demo test (walkthrough)

Suppose you add an empty-state chip **“Track ord_1001”**.

1. **Ship the UI first** - add the chip in [`empty-state.tsx`](../../examples/chat-ui/src/components/empty-state.tsx) (see [Lesson 4](./04-react-frontend.md)).
2. **Add an assertion** in `e2e/demo.spec.ts` (or a new `e2e/empty-state.spec.ts`):

```ts
test('shows the track-order suggestion', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Track ord_1001' }),
  ).toBeVisible();
});
```

3. **Run** `npm run test:ui` and fix until green.
4. If the change is under `/?demo` (new card copy, approval label), extend [`DEMO_MESSAGES`](../../examples/chat-ui/src/lib/demo-fixture.ts) so the fixture still matches what the UI should render, then assert on that page.

Do **not** start Nest or call a real model for these tests. Keep demo mode free of network.

## When you need the fixture, not a live LLM

| Scenario | Use |
|----------|-----|
| Approval card + blocked composer | `/?demo` (pending `cancelOrder` is already in the fixture) |
| Tool card with order rows | `/?demo` (`listOrders` output in the fixture) |
| Empty state / theme / New chat | `/` or `/?demo` + click New chat |
| “Does streaming still work end-to-end?” | Live smoke only (`test:ui:live`) |

Extending the fixture: edit `DEMO_MESSAGES` in `demo-fixture.ts`. Keep part shapes aligned with what [`parts.ts`](../../examples/chat-ui/src/lib/parts.ts) and the cards expect (`dynamic-tool`, `approval-requested` + `approval.id`, order-shaped `output`).

## Live smoke: what to assert

[`live.spec.ts`](../../examples/chat-ui/e2e/live.spec.ts) is skipped unless `LIVE_LLM_TEST=1`. Good assertions:

- Status leaves “Streaming” / “Thinking”
- An assistant turn is present (e.g. the sr-only “Assistant” label)
- No `role="alert"` error banner

Bad assertions:

- Exact assistant text (“I can help you with…”)
- Timing that assumes a particular model speed beyond a generous timeout

## Layout (where things live)

```
examples/chat-ui/
  playwright.config.ts     projects: chromium (CI) + live (opt-in)
  e2e/
    demo.spec.ts           default suite
    live.spec.ts           LIVE_LLM_TEST=1
  src/lib/demo-fixture.ts  static messages for ?demo
```

Root convenience scripts: `npm run test:ui` / `npm run test:ui:live`. CI runs the demo suite in the `chat-ui` job ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)); live UI tests stay local/opt-in.

## Checklist when adding UI

1. Does Vitest already cover the Nest/tool behavior? If not, add that first ([docs/testing.md](../testing.md)).
2. Does the user-visible path change? Add or extend a Playwright demo test.
3. Prefer `/?demo` over live LLM for anything that must stay green in CI.
4. Use roles/labels; avoid brittle `.class` selectors.
5. Never assert free-form model prose.

## Next

- Wire a new Nest tool into cards/approvals: [Lesson 4](./04-react-frontend.md)
- Drive changes with Cursor/Codex/etc.: [Lesson 6](./06-ai-assisted-development.md)
- Testing pyramid and inventory: [docs/testing.md](../testing.md)
- Sample UI README (commands + `?demo`): [`examples/chat-ui/README.md`](../../examples/chat-ui/README.md)
