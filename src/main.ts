import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

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
        '`GET /conversations/:id` returns stored messages as JSON and works well from Swagger UI.',
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
          'Starter stub — AUTH_MODE=dev only (spoofable). Defaults to `demo-user` when omitted. Prefer Bearer for AUTH_MODE=jwt or jwt-stub.',
      },
      'x-user-id',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Starter stub — AUTH_MODE=jwt verifies HS256 with JWT_SECRET; AUTH_MODE=jwt-stub is unsigned (local only). Not a full IdP integration.',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
