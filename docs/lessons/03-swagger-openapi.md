# Lesson 3 - Swagger / OpenAPI

OpenAPI documents the **HTTP** surface of this app so humans and REST clients can discover routes, bodies, and headers. It does not replace the AI SDK stream protocol for chat.

## What is wired

| Piece | Location |
|-------|----------|
| Dependency | `@nestjs/swagger` |
| Document + UI | [`main.ts`](../../src/main.ts) - `DocumentBuilder`, `SwaggerModule.setup('docs', ...)` |
| CLI plugin | [`nest-cli.json`](../../nest-cli.json) - infers DTO metadata, shims `class-validator` |
| Route annotations | [`chat.controller.ts`](../../src/chat/chat.controller.ts) |
| Body / response schemas | [`chat.dto.ts`](../../src/chat/chat.dto.ts) |
| Auth scheme | API key security named `x-user-id` (header), matching [`AuthGuard`](../../src/common/auth.guard.ts) |

After `npm run start:dev`:

- UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- Raw OpenAPI JSON: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

## Streaming vs REST

`POST /chat` uses `@Res()` and streams the AI SDK UI message protocol. Swagger can still show:

- request body (`ChatRequestDto`)
- security (`x-user-id`)
- that the response is a stream (`text/plain` / protocol notes in the description)

Swagger **Try it out** is the wrong tool for that stream. Prefer:

```bash
curl -N http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: demo-user" \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"What can you do?"}]}]}'
```

or a React `useChat` client ([Lesson 4](./04-react-frontend.md)).

`GET /conversations/:id` is normal JSON - use Try it out freely (empty array if the id was never saved).

## Document a new endpoint

When you add a REST route:

1. Put it under a tag: `@ApiTags('chat')` or a new tag for the feature.
2. Add `@ApiSecurity('x-user-id')` if the route depends on identity (controller-level is fine).
3. Write `@ApiOperation({ summary, description })`.
4. Type the body with a DTO class that has `@ApiProperty` / `@ApiPropertyOptional`.
5. Declare `@ApiOkResponse({ type: ... })` (or `@ApiCreatedResponse`, etc.).
6. Rebuild / restart so the CLI plugin and decorators refresh the document.

For another streaming endpoint, copy the honesty pattern from `POST /chat`: document the contract, say Try it out is unsupported, point to curl or the UI SDK.

## Exporting the spec

`/docs-json` is enough for:

- sharing the contract with frontend teammates
- feeding OpenAPI generators for **non-streaming** clients
- CI checks that the public API did not change unintentionally

Do not expect a generated client to speak the AI SDK UI stream. Generate clients for REST only.

## Takeaway

Swagger is the catalog for HTTP. Chat streaming is documented but exercised outside Swagger. New JSON features should be fully annotated; new stream features should be annotated with clear limits.

Next: [React frontend](./04-react-frontend.md).
