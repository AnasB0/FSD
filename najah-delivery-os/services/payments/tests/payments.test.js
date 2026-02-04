const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../index');
const PaymentIntent = require('../models/PaymentIntent');

const generateToken = () => {
  return jwt.sign(
    { userId: 'test-user-id', role: 'merchant' },
    process.env.JWT_ACCESS_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

const generateWebhookSignature = (payload) => {
  return crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET || 'test-webhook-secret')
    .update(JSON.stringify(payload))
    .digest('hex');
};

describe('Payments Service', () => {
  let token;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/najah_payments_test');
    }
    token = generateToken();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await PaymentIntent.deleteMany({});
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('payments-service');
    });
  });

  describe('POST /payments/intents', () => {
    it('should create a payment intent', async () => {
      const intentData = {
        orderId: new mongoose.Types.ObjectId().toString(),
        merchantId: new mongoose.Types.ObjectId().toString(),
        amount: 150.50,
        paymentMethod: 'mada'
      };

      const res = await request(app)
        .post('/payments/intents')
        .set('Authorization', `Bearer ${token}`)
        .send(intentData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('intentId');
      expect(res.body.data.amount).toBe(intentData.amount);
      expect(res.body.data.paymentMethod).toBe('mada');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.currency).toBe('SAR');
    });

    it('should fail without authentication', async () => {
      const intentData = {
        orderId: new mongoose.Types.ObjectId().toString(),
        merchantId: new mongoose.Types.ObjectId().toString(),
        amount: 100,
        paymentMethod: 'stc_pay'
      };

      const res = await request(app)
        .post('/payments/intents')
        .send(intentData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/payments/intents')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate payment method', async () => {
      const intentData = {
        orderId: new mongoose.Types.ObjectId().toString(),
        merchantId: new mongoose.Types.ObjectId().toString(),
        amount: 100,
        paymentMethod: 'invalid_method'
      };

      const res = await request(app)
        .post('/payments/intents')
        .set('Authorization', `Bearer ${token}`)
        .send(intentData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /payments/intents/:id', () => {
    it('should get a payment intent by id', async () => {
      const intent = await PaymentIntent.create({
        orderId: new mongoose.Types.ObjectId(),
        merchantId: new mongoose.Types.ObjectId(),
        amount: 200,
        paymentMethod: 'cash_on_delivery'
      });

      const res = await request(app)
        .get(`/payments/intents/${intent.intentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intentId).toBe(intent.intentId);
      expect(res.body.data.amount).toBe(200);
    });

    it('should return 404 for non-existent intent', async () => {
      const res = await request(app)
        .get('/payments/intents/pi_nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /payments/intents/:id/confirm', () => {
    it('should confirm a payment intent', async () => {
      const intent = await PaymentIntent.create({
        orderId: new mongoose.Types.ObjectId(),
        merchantId: new mongoose.Types.ObjectId(),
        amount: 150,
        paymentMethod: 'mada'
      });

      const res = await request(app)
        .post(`/payments/intents/${intent.intentId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('succeeded');
      expect(res.body.data.confirmedAt).toBeDefined();
      expect(res.body.processing).toBeDefined();
      expect(res.body.processing.transactionId).toContain('mada_');
    });

    it('should process STC Pay payment', async () => {
      const intent = await PaymentIntent.create({
        orderId: new mongoose.Types.ObjectId(),
        merchantId: new mongoose.Types.ObjectId(),
        amount: 75.25,
        paymentMethod: 'stc_pay'
      });

      const res = await request(app)
        .post(`/payments/intents/${intent.intentId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('succeeded');
      expect(res.body.processing.transactionId).toContain('stc_');
    });

    it('should process Cash on Delivery', async () => {
      const intent = await PaymentIntent.create({
        orderId: new mongoose.Types.ObjectId(),
        merchantId: new mongoose.Types.ObjectId(),
        amount: 100,
        paymentMethod: 'cash_on_delivery'
      });

      const res = await request(app)
        .post(`/payments/intents/${intent.intentId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('succeeded');
      expect(res.body.processing.transactionId).toContain('cod_');
    });

    it('should not confirm already confirmed intent', async () => {
      const intent = await PaymentIntent.create({
        orderId: new mongoose.Types.ObjectId(),
        merchantId: new mongoose.Types.ObjectId(),
        amount: 100,
        paymentMethod: 'mada',
        status: 'succeeded'
      });

      const res = await request(app)
        .post(`/payments/intents/${intent.intentId}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /payments/intents/:id/cancel', () => {
    it('should cancel a payment intent', async () => {
      const intent = await PaymentIntent.create({
        orderId: new mongoose.Types.ObjectId(),
        merchantId: new mongoose.Types.ObjectId(),
        amount: 100,
        paymentMethod: 'mada'
      });

      const res = await request(app)
        .post(`/payments/intents/${intent.intentId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data.cancelledAt).toBeDefined();
    });

    it('should not cancel succeeded payment', async () => {
      const intent = await PaymentIntent.create({
        orderId: new mongoose.Types.ObjectId(),
        merchantId: new mongoose.Types.ObjectId(),
        amount: 100,
        paymentMethod: 'mada',
        status: 'succeeded'
      });

      const res = await request(app)
        .post(`/payments/intents/${intent.intentId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /payments/webhook', () => {
    it('should accept valid webhook with correct signature', async () => {
      const payload = {
        type: 'payment.succeeded',
        intentId: 'pi_test123',
        timestamp: new Date().toISOString()
      };

      const signature = generateWebhookSignature(payload);

      const res = await request(app)
        .post('/payments/webhook')
        .set('x-payment-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = {
        type: 'payment.succeeded',
        intentId: 'pi_test123',
        timestamp: new Date().toISOString()
      };

      const res = await request(app)
        .post('/payments/webhook')
        .set('x-payment-signature', 'invalid_signature_12345')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject webhook without signature', async () => {
      const payload = {
        type: 'payment.succeeded',
        intentId: 'pi_test123',
        timestamp: new Date().toISOString()
      };

      const res = await request(app)
        .post('/payments/webhook')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /payments/reconcile', () => {
    beforeEach(async () => {
      const merchantId = new mongoose.Types.ObjectId();
      
      await PaymentIntent.create([
        {
          orderId: new mongoose.Types.ObjectId(),
          merchantId,
          amount: 100,
          paymentMethod: 'mada',
          status: 'succeeded'
        },
        {
          orderId: new mongoose.Types.ObjectId(),
          merchantId,
          amount: 50,
          paymentMethod: 'stc_pay',
          status: 'succeeded'
        },
        {
          orderId: new mongoose.Types.ObjectId(),
          merchantId,
          amount: 75,
          paymentMethod: 'cash_on_delivery',
          status: 'pending'
        },
        {
          orderId: new mongoose.Types.ObjectId(),
          merchantId,
          amount: 200,
          paymentMethod: 'mada',
          status: 'failed'
        }
      ]);
    });

    it('should get all intents for reconciliation', async () => {
      const res = await request(app)
        .get('/payments/reconcile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.summary.totalCount).toBe(4);
      expect(res.body.summary.totalAmount).toBe(425);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/payments/reconcile?status=succeeded')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every(intent => intent.status === 'succeeded')).toBe(true);
    });

    it('should filter by merchantId', async () => {
      const merchantId = (await PaymentIntent.findOne()).merchantId;

      const res = await request(app)
        .get(`/payments/reconcile?merchantId=${merchantId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(intent => intent.merchantId.toString() === merchantId.toString())).toBe(true);
    });
  });
});
