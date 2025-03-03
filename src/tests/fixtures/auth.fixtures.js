import { createHash, randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { hashPassword } from '../../utils/passwordUtils.js';

// Wrapper function to safely hash password
async function safeHashPassword(password) {
  try {
    // Ensure password is a string
    const passwordToHash = password ? String(password) : '';
    return await hashPassword(passwordToHash);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw error;
  }
}

// Test user fixtures
const validUser = {
  email: 'test@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'customer',
  username: 'testuser'
};

const adminUser = {
  email: 'admin@example.com',
  password: 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  username: 'adminuser'
};

const restaurantUser = {
  email: 'restaurant@example.com',
  password: 'RestaurantPass123!',
  firstName: 'Restaurant',
  lastName: 'Owner',
  role: 'restaurant',
  username: 'restaurantuser',
  restaurantName: 'Test Restaurant',
  location: 'Test Location, City 12345',
  contactNumber: '1234567890',
  quote: 'Best food in town',
  hours: 'Mon-Sat: 9:00 AM - 10:00 PM',
  status: 'pending',
  adminCode: '123ABC'
};

const approvedRestaurantUser = {
  ...restaurantUser,
  email: 'approved@restaurant.com',
  username: 'approvedrestaurant',
  restaurantName: 'Approved Restaurant',
  status: 'approved'
};

const invalidUser = {
  email: 'invalid@example',
  password: 'short',
  firstName: '',
  lastName: ''
};

const createHashedUser = async (userData) => {
    // Merge default values with provided userData
    const userDataWithDefaults = {
      ...userData,
      username: userData.username || userData.email.split('@')[0],
      isEmailVerified: userData.isEmailVerified !== undefined ? userData.isEmailVerified : false,
      status: userData.status || (userData.role === 'restaurant' ? 'pending' : 'approved'),
      verificationTokenUsed: userData.verificationTokenUsed !== undefined ? userData.verificationTokenUsed : false,
      biometricLoginEnabled: userData.biometricLoginEnabled || false
    };
  
    try {
      // Hash the password safely
      const hashedPassword = await safeHashPassword(userDataWithDefaults.password);
      
      return {
        ...userDataWithDefaults,
        password: hashedPassword,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating hashed user:', error);
      throw error;
    }
  };

// Generate verification tokens
const generateVerificationToken = () => {
  const token = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(token).digest('hex');
  
  return {
    token,
    hashedToken,
    expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
};

// Login credentials
const validCredentials = {
  email: validUser.email,
  password: validUser.password,
  role: validUser.role
};

const adminCredentials = {
  email: adminUser.email,
  password: adminUser.password,
  role: adminUser.role
};

const restaurantCredentials = {
  email: restaurantUser.email,
  password: restaurantUser.password,
  role: restaurantUser.role,
  adminCode: restaurantUser.adminCode
};

const invalidCredentials = {
  email: 'nonexistent@example.com',
  password: 'WrongPassword123!',
  role: 'customer'
};

// Auth tokens
const generateAuthTokens = (userId, role) => {
  // These functions should use the same token generation logic as in your auth service
  // This is a simplified version for testing purposes
  const generateToken = (id, role) => {
    return `auth-token-${id}-${role}-${Date.now()}`;
  };
  
  const generateRefreshToken = (id) => {
    return `refresh-token-${id}-${Date.now()}`;
  };

  return {
    token: generateToken(userId, role),
    refreshToken: generateRefreshToken(userId)
  };
};

// Profile update data
const profileUpdateData = {
  firstName: 'Updated',
  lastName: 'Name',
  phone: '9876543210'
};

const restaurantProfileUpdateData = {
  restaurantName: 'Updated Restaurant',
  contactNumber: '9876543210',
  hours: 'Mon-Sun: 8:00 AM - 11:00 PM',
  quote: 'Updated restaurant quote'
};

// Sample profile images for testing file uploads
const sampleProfileImage = {
  fieldname: 'image',
  originalname: 'test-profile.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.from('sample image data'),
  size: 1024,
  filename: 'test-profile-123456.jpg',
  path: '/uploads/test-profile-123456.jpg'
};

export default {
    validUser,
    adminUser,
    restaurantUser,
    approvedRestaurantUser,
    invalidUser,
    createHashedUser,
    generateVerificationToken,
    validCredentials,
    adminCredentials,
    restaurantCredentials,
    invalidCredentials,
    generateAuthTokens,
    profileUpdateData,
    restaurantProfileUpdateData,
    sampleProfileImage
  };