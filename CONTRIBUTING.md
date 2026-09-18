# Contributing

Issues and pull requests are welcome. For larger structural changes, open an issue first.

## Setup

```bash
npm install
cp .env.example .env
# For tests you do not need a real API key - ModelService is mocked in specs.
```

Use Node from [`.nvmrc`](.nvmrc) (Node 20+).

## Checks before opening a PR

```bash
npm run lint
npm run build
npm test
npm run test:e2e
```

## Tests

Follow the Chicago/Detroit (classicist) approach documented in [docs/testing.md](docs/testing.md):

- Prefer real collaborators; double only the LLM boundary.
- Assert on observable outcomes (HTTP, store contents, tool results), not model wording or internal spies.

## Style

- Format with Prettier (`npm run format`).
- Lint with oxlint (`npm run lint`).
