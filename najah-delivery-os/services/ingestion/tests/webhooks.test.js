const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');
const app = require('../index');
const Merchant = require('../models/Merchant');
const Order = require('../models/Order');
const WebhookLog = require('../models/WebhookLog');

const generateSignature = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

describe('Webhook Endpoints', () => {
  let testMerchant;
  const webhookSecret = 'test-webhook-secret-123';

  beforeAll(async () => {
    const MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/najah_delivery_test';
    await mongoose.connect(MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Merchant.deleteMany({});
    await Order.deleteMany({});
    await WebhookLog.deleteMany({});

    testMerchant = await Merchant.create({
      name: 'Test Merchant',
      email: 'test@merchant.com',
      webhook_secret: webhookSecret,
      active: true
    });
  });

  describe('POST /webhooks/:merchantId/orders', () => {
    const validPayload = {
      externalOrderId: 'EXT-12345',
      customerName: 'Ahmed Ali',
      customerPhone: '+966501234567',
      address: {
        ar: 'شارع الملك فهد، الرياض',
        en: 'King Fahd Road, Riyadh',
        components: {
          street: 'King Fahd Road',
          district: 'Olaya',
          city: 'Riyadh',
          postalCode: '12345'
        },
        coordinates: {
          lat: 24.7136,
          lng: 46.6753
        }
      },
      items: [
        {
          name: 'Pizza Margherita',
          quantity: 2,
          price: 45.00,
          sku: 'PIZZA-001'
        }
      ],
      totalAmount: 90.00,
      timeWindow: {
        start: new Date(Date.now() + 3600000).toISOString(),
        end: new Date(Date.now() + 7200000).toISOString()
      }
    };

    it('should accept webhook with valid signature', async () => {
      const signature = generateSignature(validPayload, webhookSecret);

      const response = await request(app)
        .post(`/webhooks/${testMerchant._id}/orders`)
        .set('Content-Type', 'application/json')
        .set('x-merchant-signature', signature)
        .send(validPayload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('webhookId');

      const order = await Order.findById(response.body.orderId);
      expect(order).toBeTruthy();
      expect(order.externalOrderId).toBe(validPayload.externalOrderId);
      expect(order.customerName).toBe(validPayload.customerName);

      const webhookLog = await WebhookLog.findOne({ 
        webhookId: response.body.webhookId 
      });
      expect(webhookLog).toBeTruthy();
      expect(webhookLog.status).toBe('validated');
    });

    it('should reject webhook with invalid signature', async () => {
      const invalidSignature = 'invalid-signature-12345';

      const response = await request(app)
        .post(`/webhooks/${testMerchant._id}/orders`)
        .set('Content-Type', 'application/json')
        .set('x-merchant-signature', invalidSignature)
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject webhook without signature', async () => {
      const response = await request(app)
        .post(`/webhooks/${testMerchant._id}/orders`)
        .set('Content-Type', 'application/json')
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('signature');
    });

    it('should reject webhook with invalid payload', async () => {
      const invalidPayload = {
        externalOrderId: 'EXT-12345',
        customerName: 'Ahmed Ali'
      };

      const signature = generateSignature(invalidPayload, webhookSecret);

      const response = await request(app)
        .post(`/webhooks/${testMerchant._id}/orders`)
        .set('Content-Type', 'application/json')
        .set('x-merchant-signature', signature)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid payload');
    });

    it('should reject webhook for non-existent merchant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const signature = generateSignature(validPayload, webhookSecret);

      const response = await request(app)
        .post(`/webhooks/${fakeId}/orders`)
        .set('Content-Type', 'application/json')
        .set('x-merchant-signature', signature)
        .send(validPayload);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Merchant not found');
    });

    it('should reject webhook for inactive merchant', async () => {
      testMerchant.active = false;
      await testMerchant.save();

      const signature = generateSignature(validPayload, webhookSecret);

      const response = await request(app)
        .post(`/webhooks/${testMerchant._id}/orders`)
        .set('Content-Type', 'application/json')
        .set('x-merchant-signature', signature)
        .send(validPayload);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Merchant inactive');
    });

    it('should update existing order with same externalOrderId', async () => {
      const signature1 = generateSignature(validPayload, webhookSecret);

      const response1 = await request(app)
        .post(`/webhooks/${testMerchant._id}/orders`)
        .set('Content-Type', 'application/json')
        .set('x-merchant-signature', signature1)
        .send(validPayload);

      expect(response1.status).toBe(200);
      const orderId1 = response1.body.orderId;

      const updatedPayload = {
        ...validPayload,
        customerName: 'Ahmed Ali Updated'
      };

      const signature2 = generateSignature(updatedPayload, webhookSecret);

      const response2 = await request(app)
        .post(`/webhooks/${testMerchant._id}/orders`)
        .set('Content-Type', 'application/json')
        .set('x-merchant-signature', signature2)
        .send(updatedPayload);

      expect(response2.status).toBe(200);
      expect(response2.body.orderId).toBe(orderId1);

      const order = await Order.findById(orderId1);
      expect(order.customerName).toBe('Ahmed Ali Updated');

      const orderCount = await Order.countDocuments({
        merchantId: testMerchant._id,
        externalOrderId: validPayload.externalOrderId
      });
      expect(orderCount).toBe(1);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('mongodb', 'connected');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});
