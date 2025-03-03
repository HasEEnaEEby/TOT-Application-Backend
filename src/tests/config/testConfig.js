import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

// Mock services configuration
const mockServices = {
  email: {
    enabled: false,
    mockSuccess: true
  },
  cloudinary: {
    enabled: false,
    mockSuccess: true
  }
};

// **Fix: Use a function to dynamically load `app`**
export const loadApp = async () => {
  try {
    const { default: app } = await import('../../../index.js');
    return app;
  } catch (error) {
    console.error('Error importing app:', error);
    throw error;
  }
};

// Export configuration
export const testConfig = {
  mockServices,
  rootDir: path.resolve(__dirname, '../../../'),
  testDataDir: path.resolve(__dirname, '../fixtures')
};

export default testConfig;
