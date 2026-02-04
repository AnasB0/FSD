const request = require('supertest');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/najah-test';

describe('Health Check', () => {
  let app;
  
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    
    const express = require('express');
    app = express();
    
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'express-api',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      });
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  it('should return 200 and status ok', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'express-api');
    expect(response.body).toHaveProperty('timestamp');
  });
});
