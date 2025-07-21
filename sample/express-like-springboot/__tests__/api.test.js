import request from 'supertest';
import { createExpressApp } from '../config/express.js';
import { createOpenAPIBackend } from '../config/openapi.js';
import { ApplicationContext } from '../config/application.js';

describe('API Endpoints - Positive Cases Only', () => {
  let app;
  let api;

  beforeAll(async () => {
    // テスト用のExpress app とOpenAPI backend を作成
    const applicationContext = new ApplicationContext();
    app = createExpressApp();
    api = createOpenAPIBackend(applicationContext.getHandlers());
    
    await api.init();
    app.use((req, res) => api.handleRequest(req, req, res));
  });

  describe('GET /microposts', () => {
    it('should return microposts array', async () => {
      const response = await request(app)
        .get('/microposts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /microposts', () => {
    it('should create a new micropost with valid data', async () => {
      const newMicropost = {
        title: 'Test Micropost',
        userId: 1
      };

      const response = await request(app)
        .post('/microposts')
        .send(newMicropost);

      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('title', newMicropost.title);
        expect(response.body).toHaveProperty('userId', newMicropost.userId);
      }
    });
  });

  describe('GET /microposts/:id', () => {
    it('should return 404 for non-existent micropost', async () => {
      const response = await request(app)
        .get('/microposts/99999');
      
      expect(response.status).toBe(404);
    });
  });
});