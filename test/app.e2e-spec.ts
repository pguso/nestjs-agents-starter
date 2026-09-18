import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { ModelService } from './../src/model/model.service.js';
import { createScriptedModel } from './../src/testing/mock-language-model.js';

describe('Chat (e2e)', () => {
  let app: INestApplication<App>;

  async function bootWithModel(
    model: ReturnType<typeof createScriptedModel>['model'],
  ) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ModelService)
      .useValue({ getModel: () => model })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  }

  afterEach(async () => {
    await app?.close();
  });

  it('GET /conversations/:id returns empty history', async () => {
    const { model } = createScriptedModel(['stop']);
    await bootWithModel(model);

    await request(app.getHttpServer())
      .get('/conversations/demo')
      .expect(200)
      .expect([]);
  });

  it('POST /chat rejects a body without messages', async () => {
    const { model } = createScriptedModel(['stop']);
    await bootWithModel(model);

    await request(app.getHttpServer()).post('/chat').send({}).expect(400);
  });

  it('POST /chat streams a successful response with a mock model', async () => {
    const { model } = createScriptedModel(['stop']);
    await bootWithModel(model);

    const res = await request(app.getHttpServer())
      .post('/chat')
      .send({
        messages: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'Hello' }],
          },
        ],
      })
      .expect(200);

    expect(res.text.length).toBeGreaterThan(0);
  });

  it('POST /chat with conversationId persists messages for GET', async () => {
    const { model } = createScriptedModel(['stop']);
    await bootWithModel(model);

    await request(app.getHttpServer())
      .post('/chat')
      .send({
        conversationId: 'e2e-conv',
        messages: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'Remember this' }],
          },
        ],
      })
      .expect(200);

    const history = await request(app.getHttpServer())
      .get('/conversations/e2e-conv')
      .expect(200);

    expect(Array.isArray(history.body)).toBe(true);
    expect(history.body.length).toBeGreaterThan(0);
    expect(history.body[0]).toMatchObject({
      role: 'user',
    });
  });

  it('scopes tool results to x-user-id and does not leak demo-user orders', async () => {
    const { model } = createScriptedModel([
      [
        {
          toolCallId: 'call-1',
          toolName: 'lookupOrder',
          input: { orderId: 'ord_1001' },
        },
      ],
      'stop',
    ]);
    await bootWithModel(model);

    const res = await request(app.getHttpServer())
      .post('/chat')
      .set('x-user-id', 'other-user')
      .send({
        messages: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'Look up ord_1001' }],
          },
        ],
      })
      .expect(200);

    expect(res.text).not.toMatch(/NestJS sticker pack/);
    expect(res.text).not.toMatch(/4299/);
    expect(res.text.toLowerCase()).toMatch(/not found|error|ord_1001/);
  });
});
