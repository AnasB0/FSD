/**
 * HMAC Signature Validation Tests
 * 
 * Tests for webhook HMAC authentication functionality
 */

const { computeSignature, verifySignature, generateSecret } = require('../utils/hmac');

describe('HMAC Utility Functions', () => {
  const testSecret = 'test-secret-key-12345';
  const testPayload = JSON.stringify({
    orderNumber: 'ORD-001',
    customer: { name: 'John Doe' },
    amount: 100.50
  });

  describe('computeSignature', () => {
    test('should generate a 64-character hex signature', () => {
      const signature = computeSignature(testPayload, testSecret);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should generate consistent signatures for same input', () => {
      const sig1 = computeSignature(testPayload, testSecret);
      const sig2 = computeSignature(testPayload, testSecret);
      expect(sig1).toBe(sig2);
    });

    test('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ data: 'test1' });
      const payload2 = JSON.stringify({ data: 'test2' });
      const sig1 = computeSignature(payload1, testSecret);
      const sig2 = computeSignature(payload2, testSecret);
      expect(sig1).not.toBe(sig2);
    });

    test('should throw error for empty payload', () => {
      expect(() => computeSignature('', testSecret)).toThrow();
    });

    test('should throw error for empty secret', () => {
      expect(() => computeSignature(testPayload, '')).toThrow();
    });
  });

  describe('verifySignature', () => {
    test('should verify valid signature', () => {
      const signature = computeSignature(testPayload, testSecret);
      const isValid = verifySignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const invalidSignature = 'a'.repeat(64);
      const isValid = verifySignature(testPayload, invalidSignature, testSecret);
      expect(isValid).toBe(false);
    });

    test('should reject tampered payload', () => {
      const signature = computeSignature(testPayload, testSecret);
      const tamperedPayload = testPayload + ' ';
      const isValid = verifySignature(tamperedPayload, signature, testSecret);
      expect(isValid).toBe(false);
    });

    test('should reject signature with wrong secret', () => {
      const signature = computeSignature(testPayload, testSecret);
      const isValid = verifySignature(testPayload, signature, 'wrong-secret');
      expect(isValid).toBe(false);
    });

    test('should return false for empty payload', () => {
      const isValid = verifySignature('', 'a'.repeat(64), testSecret);
      expect(isValid).toBe(false);
    });

    test('should return false for empty signature', () => {
      const isValid = verifySignature(testPayload, '', testSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('generateSecret', () => {
    test('should generate a 64-character hex string by default', () => {
      const secret = generateSecret();
      expect(secret).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should generate unique secrets', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      expect(secret1).not.toBe(secret2);
    });

    test('should generate secret of custom length', () => {
      const secret = generateSecret(16);
      expect(secret).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
    });
  });
});

describe('Webhook Authentication Integration', () => {
  test('should simulate merchant-to-service webhook flow', () => {
    // Merchant side: Create order payload and sign it
    const orderData = {
      orderNumber: 'ORD-12345',
      items: [
        { sku: 'ITEM-001', name: 'Product 1', quantity: 2, price: 25.00 }
      ],
      customer: {
        name: 'Jane Smith',
        phone: '+1234567890',
        email: 'jane@example.com'
      },
      address: {
        street: '123 Main St',
        city: 'Riyadh'
      },
      timeWindow: {
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T17:00:00Z'
      }
    };

    const sharedSecret = 'shared-webhook-secret-abc123';
    const payload = JSON.stringify(orderData);
    
    // Merchant computes signature
    const merchantSignature = computeSignature(payload, sharedSecret);
    
    // Service receives webhook and verifies signature
    const isAuthentic = verifySignature(payload, merchantSignature, sharedSecret);
    
    expect(isAuthentic).toBe(true);
  });

  test('should reject webhook with tampered data', () => {
    const orderData = { orderNumber: 'ORD-12345', amount: 100 };
    const sharedSecret = 'shared-webhook-secret-abc123';
    const payload = JSON.stringify(orderData);
    
    // Merchant computes signature
    const merchantSignature = computeSignature(payload, sharedSecret);
    
    // Attacker tampers with payload
    const tamperedData = { orderNumber: 'ORD-12345', amount: 1 };
    const tamperedPayload = JSON.stringify(tamperedData);
    
    // Service verifies and detects tampering
    const isAuthentic = verifySignature(tamperedPayload, merchantSignature, sharedSecret);
    
    expect(isAuthentic).toBe(false);
  });
});
