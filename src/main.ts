import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { resolveListenHost } from './config/listen-host.js';

function corsOriginOption(): boolean | string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  // Open CORS in local/dev when unset; lock down in production until configured.
  return process.env.NODE_ENV === 'production' ? false : true;
}

function bodySizeLimit(): string {
  return process.env.BODY_SIZE_LIMIT?.trim() || '256kb';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(helmet());
  app.use(json({ limit: bodySizeLimit() }));
  app.use(urlencoded({ extended: true, limit: bodySizeLimit() }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: corsOriginOption() });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Agents Starter')
    .setDescription(
      [
        'HTTP API for the AI agents starter template.',
        '',
        '`POST /chat` streams the AI SDK UI message protocol - use curl or a React `useChat` client, not Swagger Try it out.',
        '`GET /conversations/:id` returns stored messages as JSON (empty `[]` = missing or empty for this user, not an error).',
        '`GET /health` is a liveness check.',
      ].join('\n'),
    )
    .setVersion('0.0.1')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description:
          'Starter stub - AUTH_MODE=dev only (spoofable). Requires ALLOW_INSECURE_AUTH + NODE_ENV=development|test. Defaults to `demo-user` when omitted. Prefer Bearer for AUTH_MODE=jwt.',
      },
      'x-user-id',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'AUTH_MODE=jwt verifies HS256 with JWT_SECRET. AUTH_MODE=jwt-stub is unsigned and needs ALLOW_INSECURE_AUTH (local only). Not a full IdP integration.',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  const host = resolveListenHost({
    HOST: process.env.HOST,
    NODE_ENV: process.env.NODE_ENV,
  });
  await app.listen(port, host);
}

await bootstrap();
