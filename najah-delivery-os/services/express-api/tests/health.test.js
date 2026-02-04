const request = require('supertest');
const app = require('../server');

describe('Health Endpoint', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('service', 'express-api');
    expect(response.body).toHaveProperty('version');
  });

  it('should include database status', async () => {
    const response = await request(app)
      .get('/api/v1/health');

    expect(response.body).toHaveProperty('database');
    expect(response.body.database).toHaveProperty('status');
    expect(response.body.database).toHaveProperty('state');
  });

  it('should return 503 if database is disconnected', async () => {
    const mongoose = require('mongoose');
    const originalReadyState = mongoose.connection.readyState;
    
    Object.defineProperty(mongoose.connection, 'readyState', {
      get: () => 0,
      configurable: true
    });

    const response = await request(app)
      .get('/api/v1/health')
      .expect(503);

    expect(response.body.status).toBe('degraded');

    Object.defineProperty(mongoose.connection, 'readyState', {
      get: () => originalReadyState,
      configurable: true
    });
  });
});

describe('Root Endpoint', () => {
  it('should return service information', async () => {
    const response = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('service', 'Najah Delivery API');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('status', 'running');
    expect(response.body).toHaveProperty('endpoints');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/v1/unknown-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Not Found');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('path', '/api/v1/unknown-route');
  });
});
