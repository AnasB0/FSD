require('dotenv').config({ path: '.env.example' });

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/najah_delivery_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.PORT = '0';

beforeAll(() => {
  // Suppress console output during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
