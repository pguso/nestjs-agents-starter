import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
          'Dev identity stub (AUTH_MODE=dev). Defaults to `demo-user` when omitted. Use Bearer JWT when AUTH_MODE=jwt.',
      },
      'x-user-id',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Required when AUTH_MODE=jwt. Starter accepts an unsigned JWT with a string `sub` claim - replace AuthGuard before production.',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
