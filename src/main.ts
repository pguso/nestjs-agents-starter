import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Agents Starter')
    .setDescription(
      [
        'HTTP API for the AI agents starter template.',
        '',
        '`POST /chat` streams the AI SDK UI message protocol — use curl or a React `useChat` client, not Swagger Try it out.',
        '`GET /conversations/:id` returns stored messages as JSON and works well from Swagger UI.',
      ].join('\n'),
    )
    .setVersion('0.0.1')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description:
          'Dev identity stub. Defaults to `demo-user` when omitted. Swap for JWT/session auth in production.',
      },
      'x-user-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
