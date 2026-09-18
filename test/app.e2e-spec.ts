import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('Chat (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /conversations/:id returns empty history', () => {
    return request(app.getHttpServer())
      .get('/conversations/demo')
      .expect(200)
      .expect([]);
  });

  it('POST /chat rejects a body without messages', () => {
    return request(app.getHttpServer())
      .post('/chat')
      .send({})
      .expect(400);
  });
});
