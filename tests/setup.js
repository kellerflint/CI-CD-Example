// Load environment variables for testing
require('dotenv').config({ path: '.env.example' });

// Set test environment
process.env.NODE_ENV = 'test';

// Set test database
process.env.DB_NAME = 'taskify_test';

// Set test JWT secret
process.env.JWT_SECRET = 'test_jwt_secret';

// Set test Stripe keys
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';

// Global test timeout (30 seconds)
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Keep error for debugging
  error: jest.fn(),
  // Comment these out if you want to see the output
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup here
}); 