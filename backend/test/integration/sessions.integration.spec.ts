import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Language } from '../../src/common/enums/language.enum';

describe('Sessions API Integration Tests', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/sessions', () => {
    it('should create a new session with valid language', async () => {
      const response = await request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body.language).toBe(Language.JAVASCRIPT);
      expect(response.body.participantCount).toBe(1);
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should create session with TypeScript language', async () => {
      const response = await request(server)
        .post('/api/sessions')
        .send({ language: Language.TYPESCRIPT })
        .expect(201);

      expect(response.body.language).toBe(Language.TYPESCRIPT);
    });

    it('should create session with Python language', async () => {
      const response = await request(server)
        .post('/api/sessions')
        .send({ language: Language.PYTHON })
        .expect(201);

      expect(response.body.language).toBe(Language.PYTHON);
    });

    it('should reject invalid language', async () => {
      const response = await request(server)
        .post('/api/sessions')
        .send({ language: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should reject missing language', async () => {
      const response = await request(server)
        .post('/api/sessions')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    it('should retrieve existing session', async () => {
      // Create a session first
      const createResponse = await request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201);

      const sessionId = createResponse.body.id;

      // Retrieve the session
      const getResponse = await request(server)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(sessionId);
      expect(getResponse.body.language).toBe(Language.JAVASCRIPT);
      expect(getResponse.body).toHaveProperty('participantCount');
    });

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(server)
        .get(`/api/sessions/${fakeSessionId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('SESSION_NOT_FOUND');
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(server)
        .get('/api/sessions/invalid-id')
        .expect(404);
    });
  });

  describe('POST /api/sessions/:sessionId/join', () => {
    it('should allow user to join existing session', async () => {
      // Create a session
      const createResponse = await request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201);

      const sessionId = createResponse.body.id;

      // Join the session
      const joinResponse = await request(server)
        .post(`/api/sessions/${sessionId}/join`)
        .send({
          userId: 'test-user-123',
          userName: 'Test User',
        })
        .expect(200);

      expect(joinResponse.body.sessionId).toBe(sessionId);
      expect(joinResponse.body.userId).toBe('test-user-123');
      expect(joinResponse.body).toHaveProperty('wsUrl');
      expect(joinResponse.body).toHaveProperty('participantCount');
    });

    it('should reject join to non-existent session', async () => {
      const fakeSessionId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(server)
        .post(`/api/sessions/${fakeSessionId}/join`)
        .send({
          userId: 'test-user',
          userName: 'Test',
        })
        .expect(404);

      expect(response.body.error).toBe('SESSION_NOT_FOUND');
    });

    it('should reject join with missing userId', async () => {
      const createResponse = await request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201);

      const sessionId = createResponse.body.id;

      await request(server)
        .post(`/api/sessions/${sessionId}/join`)
        .send({ userName: 'Test' })
        .expect(400);
    });

    it('should reject join with missing userName', async () => {
      const createResponse = await request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201);

      const sessionId = createResponse.body.id;

      await request(server)
        .post(`/api/sessions/${sessionId}/join`)
        .send({ userId: 'test-user' })
        .expect(400);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });
});

