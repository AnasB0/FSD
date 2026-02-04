const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Session = require('../models/Session');

jest.setTimeout(30000);

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/najah-delivery-auth-test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
});

describe('Auth Service Tests', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'DRIVER'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('username', 'testuser');
      expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should fail when registering with existing email', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser2',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid input', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          username: 'ab',
          email: 'invalid-email',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('username', 'testuser');
    });

    it('should fail with invalid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with non-existent user', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken;

    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      accessToken = loginRes.body.data.accessToken;
    });

    it('should get current user with valid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('username', 'testuser');
      expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
    });

    it('should fail without token', async () => {
      const res = await request(app)
        .get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      accessToken = loginRes.body.data.accessToken;
      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail without token', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe('Auth Service');
      expect(res.body.status).toBe('healthy');
    });
  });
});
