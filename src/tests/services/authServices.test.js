import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { AuthService } from '../../services/authServices.js';
import emailService from '../../services/emailservices.js';
import { generateRefreshToken } from '../../utils/generateToken.js';
import authFixtures from '../fixtures/auth.fixtures.js';
import { expect, mongoose, sinon } from '../setup.mjs';

// Destructure from the default import
const { 
  adminCredentials,
  adminUser,
  createHashedUser,
  generateVerificationToken,
  restaurantCredentials,
  restaurantUser,
  validCredentials,
  validUser
} = authFixtures;

describe('Auth Service', function() {
    beforeEach(async function() {
      // Create test users with unique usernames and emails
      const uniqueEmailSuffix = Date.now();
      
      const testUsers = [
        {
          ...validUser,
          email: `test-${uniqueEmailSuffix}@example.com`,
          username: `testuser-${uniqueEmailSuffix}`,
          isEmailVerified: true
        },
        {
          ...adminUser,
          email: `admin-${uniqueEmailSuffix}@example.com`,
          username: `adminuser-${uniqueEmailSuffix}`,
          isEmailVerified: true
        },
        {
          ...restaurantUser,
          email: `restaurant-${uniqueEmailSuffix}@example.com`,
          username: `restaurantuser-${uniqueEmailSuffix}`,
          status: 'approved',
          isEmailVerified: true
        }
      ];
  
      // Create and save users
      for (const userData of testUsers) {
        const hashedUser = await createHashedUser(userData);
        await User.create(hashedUser);
      }
    });

  afterEach(function() {
    sinon.restore();
  });

  describe('createUser', function() {
    it('should create a regular user and send verification email', async function() {
      // Act
      const result = await AuthService.createUser(validUser);
      
      // Assert
      expect(result).to.be.an('object');
      expect(result).to.have.property('user');
      expect(result.user).to.have.property('email', validUser.email);
      expect(result.user).to.have.property('role', validUser.role);
      expect(result.user).to.not.have.property('password');
      expect(result).to.have.property('requiresVerification', true);
      
      // Verify database entry
      const dbUser = await User.findOne({ email: validUser.email });
      expect(dbUser).to.exist;
      expect(dbUser.isEmailVerified).to.be.false;
      expect(dbUser.password).to.not.equal(validUser.password); // Password should be hashed
      
      // Check that verification email was sent
      expect(emailService.sendVerificationEmail.calledOnce).to.be.true;
    });

    it('should create a restaurant user with pending status', async function() {
      // Act
      const result = await AuthService.createUser(restaurantUser);
      
      // Assert
      expect(result.user).to.have.property('restaurantName', restaurantUser.restaurantName);
      expect(result.user).to.have.property('status', 'pending');
      
      // Verify database entry
      const dbUser = await User.findOne({ email: restaurantUser.email });
      expect(dbUser.status).to.equal('pending');
      
      // Restaurant emails should get the registration email, not verification
      expect(emailService.sendRestaurantRegistrationEmail.calledOnce).to.be.true;
      expect(emailService.sendVerificationEmail.called).to.be.false;
    });

    it('should generate username if not provided', async function() {
      // Arrange
      const userWithoutUsername = { ...validUser };
      delete userWithoutUsername.username;
      
      // Act
      const result = await AuthService.createUser(userWithoutUsername);
      
      // Assert
      expect(result.user).to.have.property('username');
      expect(result.user.username).to.equal(validUser.email.split('@')[0]);
    });

    it('should reject duplicate email', async function() {
      // Arrange - Create a user first
      await AuthService.createUser(validUser);
      
      // Act & Assert
      try {
        await AuthService.createUser(validUser);
        expect.fail('Should have thrown an error for duplicate email');
      } catch (error) {
        expect(error.message).to.include('Email already exists');
        expect(error.statusCode).to.equal(400);
      }
    });

    it('should clean up user if email sending fails', async function() {
      // Arrange
      emailService.sendVerificationEmail.rejects(new Error('Email service failure'));
      
      // Act & Assert
      try {
        await AuthService.createUser(validUser);
        expect.fail('Should have thrown an error for email service failure');
      } catch (error) {
        expect(error.message).to.include('Failed to send verification email');
        
        // Verify user was cleaned up
        const user = await User.findOne({ email: validUser.email });
        expect(user).to.be.null;
      }
    });
  });

  describe('createAdmin', function() {
    it('should create an admin with verified status', async function() {
      // Act
      const result = await AuthService.createAdmin(adminUser);
      
      // Assert
      expect(result).to.have.property('user');
      expect(result.user).to.have.property('role', 'admin');
      expect(result).to.have.property('token');
      expect(result).to.have.property('refreshToken');
      
      // Verify database entry
      const admin = await User.findOne({ email: adminUser.email });
      expect(admin.isEmailVerified).to.be.true;
      expect(admin.status).to.equal('approved');
    });

    it('should reject creating multiple admins', async function() {
      // Arrange - Create an admin first
      await AuthService.createAdmin(adminUser);
      
      // Act & Assert
      try {
        await AuthService.createAdmin({
          ...adminUser,
          email: 'second-admin@example.com'
        });
        expect.fail('Should have thrown an error for multiple admins');
      } catch (error) {
        expect(error.message).to.include('Admin already exists');
      }
    });
  });

describe('Login User', function() {
  let sandbox;
  let mockUser;
  
  beforeEach(function() {
    // Create a fresh sandbox for each test
    sandbox = sinon.createSandbox();
    
    // Create mock user data
    mockUser = {
      _id: new mongoose.Types.ObjectId(),
      username: "testuser",
      email: "test@example.com",
      password: "$2a$12$someHashedPasswordValue", // Mocked hashed password
      role: "customer",
      isEmailVerified: true,
      comparePassword: sandbox.stub().resolves(true), // Mock password comparison
      save: sandbox.stub().resolves(this)
    };
  });

  afterEach(function() {
    // Restore all stubs
    sandbox.restore();
  });
  
  it('should login a regular user successfully', async function() {
    // Arrange
    // Stub User.findOne to return the mock user
    sandbox.stub(User, 'findOne').resolves(mockUser);
    
    // Stub token generation methods
    sandbox.stub(generateToken, 'generateAuthToken').returns('mock-token');
    sandbox.stub(generateToken, 'generateRefreshToken').returns('mock-refresh-token');
    
    // Act
    const result = await AuthService.loginUser(
      mockUser.email, 
      'PlainTextPassword', 
      mockUser.role
    );
    
    // Assert
    expect(result).to.be.an('object');
    expect(result).to.have.property('user');
    expect(result.user.email).to.equal(mockUser.email);
    expect(result).to.have.property('token', 'mock-token');
    expect(result).to.have.property('refreshToken', 'mock-refresh-token');
  });
  
  it('should throw error for incorrect password', async function() {
    // Arrange
    const userWithFailedAuth = {
      ...mockUser,
      comparePassword: sandbox.stub().resolves(false) // Simulate incorrect password
    };
    
    sandbox.stub(User, 'findOne').resolves(userWithFailedAuth);
    
    // Act & Assert
    try {
      await AuthService.loginUser(
        mockUser.email, 
        'WrongPassword', 
        mockUser.role
      );
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.include('Invalid email or password');
    }
  });
  
  it('should throw error for unverified user', async function() {
    // Arrange
    const unverifiedUser = {
      ...mockUser,
      isEmailVerified: false
    };
    
    sandbox.stub(User, 'findOne').resolves(unverifiedUser);
    
    // Act & Assert
    try {
      await AuthService.loginUser(
        unverifiedUser.email, 
        'PlainTextPassword', 
        unverifiedUser.role
      );
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.include('Please verify your email');
    }
  });
  
  it('should throw error for non-existent user', async function() {
    // Arrange
    sandbox.stub(User, 'findOne').resolves(null);
    
    // Act & Assert
    try {
      await AuthService.loginUser(
        'nonexistent@example.com', 
        'SomePassword', 
        'customer'
      );
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.include('Invalid email or password');
    }
  });
});
  describe('refreshToken', function() {
    let user, refreshToken;

    beforeEach(async function() {
      // Create a verified user
      user = await User.create(await createHashedUser({
        ...validUser,
        isEmailVerified: true
      }));
      
      // Generate a refresh token
      refreshToken = generateRefreshToken(user._id);
    });

    it('should generate a new access token with valid refresh token', async function() {
      // Mock token verification to return expected payload
      sinon.stub(jwt, 'verify').returns({ id: user._id });
      
      // Act
      const result = await AuthService.refreshToken(refreshToken);
      
      // Assert
      expect(result).to.have.property('token');
      expect(result).to.have.property('user');
      expect(result.user._id.toString()).to.equal(user._id.toString());
      
      // Restore original function
      jwt.verify.restore();
    });

    it('should reject invalid refresh tokens', async function() {
      // Act & Assert
      try {
        await AuthService.refreshToken('invalid-token');
        expect.fail('Should have thrown an error for invalid token');
      } catch (error) {
        expect(error.message).to.include('Invalid refresh token');
      }
    });

    it('should reject tokens for non-existent users', async function() {
      // Create token for a non-existent user ID
      const nonExistentId = new mongoose.Types.ObjectId();
      const invalidToken = generateRefreshToken(nonExistentId);
      
      // Mock token verification to return non-existent ID
      sinon.stub(jwt, 'verify').returns({ id: nonExistentId });
      
      // Act & Assert
      try {
        await AuthService.refreshToken(invalidToken);
        expect.fail('Should have thrown an error for non-existent user');
      } catch (error) {
        expect(error.message).to.include('User not found');
      }
      
      // Restore original function
      jwt.verify.restore();
    });
  });

  describe('verifyEmail', function() {
    let user, verificationData;

    beforeEach(async function() {
      // Create a user with verification token
      verificationData = generateVerificationToken();
      
      user = await User.create({
        ...validUser,
        isEmailVerified: false,
        verificationToken: verificationData.hashedToken,
        verificationExpires: verificationData.expires,
        verificationTokenUsed: false
      });
    });

    it('should verify a user with valid token', async function() {
      // Act
      const result = await AuthService.verifyEmail(verificationData.token);
      
      // Assert
      expect(result).to.have.property('status', 'success');
      expect(result).to.have.property('message', 'Email verified successfully');
      expect(result).to.have.property('user');
      
      // Check database
      const verifiedUser = await User.findById(user._id);
      expect(verifiedUser.isEmailVerified).to.be.true;
      expect(verifiedUser.verificationToken).to.be.undefined;
      expect(verifiedUser.verificationTokenUsed).to.be.true;
      expect(verifiedUser.verificationExpires).to.be.undefined;
    });

    it('should reject invalid verification tokens', async function() {
      // Act & Assert
      try {
        await AuthService.verifyEmail('invalid-token');
        expect.fail('Should have thrown an error for invalid token');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired verification token');
      }
    });

    it('should reject expired verification tokens', async function() {
      // Set token to be expired
      await User.findByIdAndUpdate(user._id, {
        verificationExpires: Date.now() - 1000 // Expired 1 second ago
      });
      
      // Act & Assert
      try {
        await AuthService.verifyEmail(verificationData.token);
        expect.fail('Should have thrown an error for expired token');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired verification token');
      }
    });

    it('should reject tokens for already verified users', async function() {
      // Set user to already be verified
      await User.findByIdAndUpdate(user._id, {
        isEmailVerified: true
      });
      
      // Act & Assert
      try {
        await AuthService.verifyEmail(verificationData.token);
        expect.fail('Should have thrown an error for already verified user');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired verification token');
      }
    });

    it('should reject used verification tokens', async function() {
      // Set token to be already used
      await User.findByIdAndUpdate(user._id, {
        verificationTokenUsed: true
      });
      
      // Act & Assert
      try {
        await AuthService.verifyEmail(verificationData.token);
        expect.fail('Should have thrown an error for already used token');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired verification token');
      }
    });
  });

  describe('resendVerificationEmail', function() {
    beforeEach(async function() {
      // Create unverified user
      await User.create(await createHashedUser({
        ...validUser,
        isEmailVerified: false
      }));
    });

    it('should resend verification email to unverified user', async function() {
      // Act
      const result = await AuthService.resendVerificationEmail(validUser.email, validUser.role);
      
      // Assert
      expect(result).to.have.property('message', 'New verification email sent successfully');
      expect(result).to.have.property('status', 'success');
      
      // Check a new token was generated
      const user = await User.findOne({ email: validUser.email });
      expect(user.verificationToken).to.exist;
      expect(user.verificationExpires).to.exist;
      expect(user.verificationTokenUsed).to.be.false;
      
      // Check email was sent
      expect(emailService.sendVerificationEmail.calledOnce).to.be.true;
    });

    it('should reject for non-existent user', async function() {
      // Act & Assert
      try {
        await AuthService.resendVerificationEmail('nonexistent@example.com', 'customer');
        expect.fail('Should have thrown an error for non-existent user');
      } catch (error) {
        expect(error.message).to.include('User not found');
      }
    });

    it('should reject for already verified user', async function() {
      // Update user to be verified
      await User.findOneAndUpdate(
        { email: validUser.email },
        { isEmailVerified: true }
      );
      
      // Act & Assert
      try {
        await AuthService.resendVerificationEmail(validUser.email, validUser.role);
        expect.fail('Should have thrown an error for already verified user');
      } catch (error) {
        expect(error.message).to.include('already verified');
      }
    });
  });

  describe('forgotPassword', function() {
    beforeEach(async function() {
      // Create a verified user
      await User.create(await createHashedUser({
        ...validUser,
        isEmailVerified: true
      }));
    });

    it('should generate reset token and send email', async function() {
      // Act
      const result = await AuthService.forgotPassword(validUser.email);
      
      // Assert
      expect(result).to.have.property('message', 'Password reset email sent successfully');
      
      // Check a reset token was generated
      const user = await User.findOne({ email: validUser.email });
      expect(user.resetPasswordToken).to.exist;
      expect(user.resetPasswordExpires).to.exist;
      
      // Check email was sent
      expect(emailService.sendPasswordResetEmail.calledOnce).to.be.true;
    });

    it('should reject for non-existent user', async function() {
      // Act & Assert
      try {
        await AuthService.forgotPassword('nonexistent@example.com');
        expect.fail('Should have thrown an error for non-existent user');
      } catch (error) {
        expect(error.message).to.include('User not found');
      }
    });
  });

  describe('resetPassword', function() {
    let user, resetToken, hashedToken;

    beforeEach(async function() {
      // Create a user with reset token
      resetToken = crypto.randomBytes(32).toString('hex');
      hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      // Save user with reset token
      user = await User.create(await createHashedUser({
        ...validUser,
        isEmailVerified: true,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: Date.now() + 3600000 // 1 hour
      }));
    });

    it('should reset password with valid token', async function() {
      // Arrange
      const newPassword = 'NewPassword123!';
      
      // Act
      const result = await AuthService.resetPassword(resetToken, newPassword);
      
      // Assert
      expect(result).to.have.property('message', 'Password reset successful');
      
      // Check password was changed
      const updatedUser = await User.findById(user._id).select('+password');
      const isNewPasswordValid = await updatedUser.comparePassword(newPassword);
      expect(isNewPasswordValid).to.be.true;
      
      // Check reset token was cleared
      expect(updatedUser.resetPasswordToken).to.be.undefined;
      expect(updatedUser.resetPasswordExpires).to.be.undefined;
    });

    it('should reject invalid reset tokens', async function() {
      // Act & Assert
      try {
        await AuthService.resetPassword('invalid-token', 'NewPassword123!');
        expect.fail('Should have thrown an error for invalid token');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired reset token');
      }
    });

    it('should reject expired reset tokens', async function() {
      // Set token to be expired
      await User.findByIdAndUpdate(user._id, {
        resetPasswordExpires: Date.now() - 1000 // Expired 1 second ago
      });
      
      // Act & Assert
      try {
        await AuthService.resetPassword(resetToken, 'NewPassword123!');
        expect.fail('Should have thrown an error for expired token');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired reset token');
      }
    });
  });

  describe('toggleBiometricLogin', function() {
    let userId;

    beforeEach(async function() {
      // Create a verified user
      const user = await User.create(await createHashedUser({
        ...validUser,
        isEmailVerified: true,
        biometricLoginEnabled: false
      }));
      
      userId = user._id;
    });

    it('should enable biometric login', async function() {
      // Act
      const result = await AuthService.toggleBiometricLogin(userId, true);
      
      // Assert
      expect(result.biometricLoginEnabled).to.be.true;
      
      // Check database
      const user = await User.findById(userId);
      expect(user.biometricLoginEnabled).to.be.true;
    });

    it('should disable biometric login', async function() {
      // Enable first
      await User.findByIdAndUpdate(userId, { biometricLoginEnabled: true });
      
      // Act
      const result = await AuthService.toggleBiometricLogin(userId, false);
      
      // Assert
      expect(result.biometricLoginEnabled).to.be.false;
      
      // Check database
      const user = await User.findById(userId);
      expect(user.biometricLoginEnabled).to.be.false;
    });

    it('should reject for non-existent user', async function() {
      // Act & Assert
      try {
        await AuthService.toggleBiometricLogin(new mongoose.Types.ObjectId(), true);
        expect.fail('Should have thrown an error for non-existent user');
      } catch (error) {
        expect(error.message).to.include('User not found');
      }
    });

    it('should reject for unverified users', async function() {
      // Create an unverified user
      const unverifiedUser = await User.create(await createHashedUser({
        ...validUser,
        email: 'unverified@example.com',
        isEmailVerified: false
      }));
      
      // Act & Assert
      try {
        await AuthService.toggleBiometricLogin(unverifiedUser._id, true);
        expect.fail('Should have thrown an error for unverified user');
      } catch (error) {
        expect(error.message).to.include('Email must be verified');
      }
    });
  });

  describe('getProfile', function() {
    let userId;

    beforeEach(async function() {
      // Create a verified user
      const user = await User.create(await createHashedUser({
        ...validUser,
        isEmailVerified: true
      }));
      
      userId = user._id;
    });

    it('should return customer profile data', async function() {
      // Act
      const result = await AuthService.getProfile(userId);
      
      // Assert
      expect(result).to.be.an('object');
      expect(result).to.have.property('_id');
      expect(result).to.have.property('email', validUser.email);
      expect(result).to.have.property('username', validUser.username);
      expect(result).to.have.property('role', validUser.role);
      
      // Customer specific fields
      expect(result).to.have.property('firstName', validUser.firstName);
      expect(result).to.have.property('lastName', validUser.lastName);
      
      // Should not contain sensitive data
      expect(result).to.not.have.property('password');
      expect(result).to.not.have.property('resetPasswordToken');
      expect(result).to.not.have.property('verificationToken');
    });

    it('should return restaurant profile with appropriate fields', async function() {
      // Create a restaurant user
      const restaurant = await User.create(await createHashedUser({
        ...restaurantUser,
        status: 'approved',
        isEmailVerified: true
      }));
      
      // Act
      const result = await AuthService.getProfile(restaurant._id);
      
      // Assert
      expect(result).to.have.property('restaurantName', restaurantUser.restaurantName);
      expect(result).to.have.property('location', restaurantUser.location);
      expect(result).to.have.property('contactNumber', restaurantUser.contactNumber);
      expect(result).to.have.property('hours', restaurantUser.hours);
      expect(result).to.have.property('quote', restaurantUser.quote);
      
      // Restaurant profile should not have customer-specific fields
      expect(result).to.not.have.property('firstName');
      expect(result).to.not.have.property('lastName');
    });

    it('should reject for non-existent user', async function() {
      // Act & Assert
      try {
        await AuthService.getProfile(new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error for non-existent user');
      } catch (error) {
        expect(error.message).to.include('User not found');
      }
    });
  });

  describe('updateProfile', function() {
    let userId;

    beforeEach(async function() {
      // Create a verified user
      const user = await User.create(await createHashedUser({
        ...validUser,
        isEmailVerified: true
      }));
      
      userId = user._id;
    });

    it('should update basic profile fields', async function() {
      // Arrange
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        phone: '9876543210'
      };
      
      // Act
      const result = await AuthService.updateProfile(userId, updateData);
      
      // Assert
      expect(result).to.have.property('firstName', updateData.firstName);
      expect(result).to.have.property('lastName', updateData.lastName);
      expect(result).to.have.property('phone', updateData.phone);
      
      // Check database
      const user = await User.findById(userId);
      expect(user.firstName).to.equal(updateData.firstName);
      expect(user.fullName).to.equal(`${updateData.firstName} ${updateData.lastName}`);
    });

    it('should sanitize sensitive fields from updates', async function() {
      // Original state of user
      const originalUser = await User.findById(userId);
      
      // Attempt to update sensitive fields
      const updateData = {
        role: 'admin',
        isEmailVerified: false,
        status: 'rejected',
        password: 'HackedPassword123!',
        verificationToken: 'fake-token',
        resetPasswordToken: 'fake-reset-token'
      };
      
      // Act
      const result = await AuthService.updateProfile(userId, updateData);
      
      // Check database - sensitive fields should not be updated
      const user = await User.findById(userId);
      expect(user.role).to.equal(originalUser.role);
      expect(user.isEmailVerified).to.equal(originalUser.isEmailVerified);
      expect(user.status).to.equal(originalUser.status);
    });

    it('should reject for non-existent user', async function() {
      // Act & Assert
      try {
        await AuthService.updateProfile(new mongoose.Types.ObjectId(), { firstName: 'Test' });
        expect.fail('Should have thrown an error for non-existent user');
      } catch (error) {
        expect(error.message).to.include('User not found');
      }
    });
  });
});