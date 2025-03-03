import { expect } from 'chai';
import sinon from 'sinon';
import authController from '../../controllers/authController.js';
import { AuthService } from '../../services/authServices.js';
import emailService from '../../services/emailservices.js';
import authFixtures from '../fixtures/auth.fixtures.js';

const { 
  validUser, 
  restaurantUser, 
  adminUser, 
  validCredentials,
  profileUpdateData
} = authFixtures;

describe('Auth Controller', function() {
  let req, res, next;

  beforeEach(function() {
    // Dynamically stub existing email service methods
    const emailServiceMethods = [
      'sendVerificationEmail', 
      'sendRestaurantRegistrationEmail',
      'sendPasswordResetEmail'
    ];
    
    emailServiceMethods.forEach(method => {
      if (typeof emailService[method] === 'function') {
        sinon.stub(emailService, method).resolves();
      }
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Signup', function() {
    it('should register a restaurant user and return 201 status', async function() {
      // Arrange
      req.body = restaurantUser;
      
      // Stub AuthService.createUser
      const createUserStub = sinon.stub(AuthService, 'createUser').resolves({
        user: { 
          ...restaurantUser, 
          _id: 'restaurant-id',
          status: 'pending' // Explicitly set status
        },
        requiresVerification: true
      });
      
      // Act
      await authController.signup(req, res, next);
      
      // Assert
      expect(createUserStub.calledOnce).to.be.true;
      expect(createUserStub.firstCall.args[0]).to.deep.equal(restaurantUser);
      
      const responseData = res._getJSONData();
      expect(res.statusCode).to.equal(201);
      expect(responseData).to.have.property('status', 'success');
      expect(responseData).to.have.property('data');
      expect(responseData.data).to.have.property('user');
      expect(responseData.data).to.have.property('requiresVerification', true);
      
      // Clean up
      createUserStub.restore();
    });
  });

  describe('Login', function() {
    it('should login a user successfully', async function() {
      // Arrange
      req.body = {
        email: validCredentials.email,
        password: validCredentials.password,
        role: validCredentials.role
      };
      
      // Stub AuthService.loginUser
      const loginUserStub = sinon.stub(AuthService, 'loginUser').resolves({
        user: { email: validCredentials.email },
        token: 'test-token',
        refreshToken: 'test-refresh-token'
      });
      
      // Act
      await AuthController.login(req, res, next);
      
      // Assert
      expect(loginUserStub.calledOnce).to.be.true;
      expect(loginUserStub.firstCall.args[0]).to.equal(validCredentials.email);
      expect(loginUserStub.firstCall.args[1]).to.equal(validCredentials.password);
      expect(loginUserStub.firstCall.args[2]).to.equal(validCredentials.role);
      
      const responseData = res._getJSONData();
      expect(res.statusCode).to.equal(200);
      expect(responseData).to.have.property('status', 'success');
      expect(responseData).to.have.property('data');
      expect(responseData.data).to.have.property('user');
      expect(responseData.data).to.have.property('token');
      expect(responseData.data).to.have.property('refreshToken');
      
      // Clean up
      loginUserStub.restore();
    });

    it('should handle login errors', async function() {
      // Arrange
      req.body = {
        email: validCredentials.email,
        password: validCredentials.password,
        role: validCredentials.role
      };
      
      // Stub AuthService.loginUser to throw an error
      const loginUserStub = sinon.stub(AuthService, 'loginUser').throws(new Error('Login failed'));
      
      // Act
      await AuthController.login(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal('Login failed');
      
      // Clean up
      loginUserStub.restore();
    });
  });

  describe('Refresh Token', function() {
    it('should refresh token successfully', async function() {
      // Arrange
      req.body = { refreshToken: 'existing-refresh-token' };
      
      // Stub AuthService.refreshToken
      const refreshTokenStub = sinon.stub(AuthService, 'refreshToken').resolves({
        token: 'new-access-token',
        user: { email: validCredentials.email }
      });
      
      // Act
      await AuthController.refreshToken(req, res, next);
      
      // Assert
      expect(refreshTokenStub.calledOnce).to.be.true;
      expect(refreshTokenStub.firstCall.args[0]).to.equal('existing-refresh-token');
      
      const responseData = res._getJSONData();
      expect(res.statusCode).to.equal(200);
      expect(responseData).to.have.property('status', 'success');
      expect(responseData).to.have.property('data');
      expect(responseData.data).to.have.property('token');
      expect(responseData.data).to.have.property('user');
      
      // Clean up
      refreshTokenStub.restore();
    });

    it('should handle refresh token errors', async function() {
      // Arrange
      req.body = { refreshToken: 'invalid-refresh-token' };
      
      // Stub AuthService.refreshToken to throw an error
      const refreshTokenStub = sinon.stub(AuthService, 'refreshToken').throws(new Error('Token refresh failed'));
      
      // Act
      await AuthController.refreshToken(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal('Token refresh failed');
      
      // Clean up
      refreshTokenStub.restore();
    });
  });

  describe('Email Verification', function() {
    it('should verify email successfully', async function() {
      // Arrange
      req.body = { token: 'verification-token' };
      
      // Stub AuthService.verifyEmail
      const verifyEmailStub = sinon.stub(AuthService, 'verifyEmail').resolves({
        status: 'success',
        message: 'Email verified successfully',
        user: { 
          email: validCredentials.email,
          isEmailVerified: true
        }
      });
      
      // Act
      await authController.verifyEmail(req, res, next);
      
      // Assert
      expect(verifyEmailStub.calledOnce).to.be.true;
      expect(verifyEmailStub.firstCall.args[0]).to.equal('verification-token');
      
      const responseData = res._getJSONData();
      expect(res.statusCode).to.equal(200);
      expect(responseData).to.have.property('status', 'success');
      expect(responseData).to.have.property('message', 'Email verified successfully');
      expect(responseData).to.have.property('data');
      expect(responseData.data).to.have.property('user');
      expect(responseData.data.user).to.have.property('isEmailVerified', true);
      
      // Clean up
      verifyEmailStub.restore();
    });
  });

  describe('Profile Operations', function() {
    it('should get user profile successfully', async function() {
      // Arrange
      req.user = { _id: 'user-id' };
      
      // Stub AuthService.getProfile
      const getProfileStub = sinon.stub(AuthService, 'getProfile').resolves({
        _id: 'user-id',
        email: validCredentials.email,
        username: validUser.username,
        firstName: validUser.firstName,
        lastName: validUser.lastName
      });
      
      // Act
      await authController.getProfile(req, res, next);
      
      // Assert
      expect(getProfileStub.calledOnce).to.be.true;
      expect(getProfileStub.firstCall.args[0]).to.equal('user-id');
      
      const responseData = res._getJSONData();
      expect(res.statusCode).to.equal(200);
      expect(responseData).to.have.property('status', 'success');
      expect(responseData).to.have.property('data');
      expect(responseData.data).to.have.property('email', validCredentials.email);
      expect(responseData.data).to.have.property('firstName', validUser.firstName);
      
      // Clean up
      getProfileStub.restore();
    });

    it('should update user profile successfully', async function() {
      // Arrange
      req.user = { _id: 'user-id' };
      req.body = profileUpdateData;
      
      // Stub AuthService.updateProfile
      const updateProfileStub = sinon.stub(AuthService, 'updateProfile').resolves({
        ...profileUpdateData,
        _id: 'user-id',
        email: validCredentials.email
      });
      
      // Act
      await authController.updateProfile(req, res, next);
      
      // Assert
      expect(updateProfileStub.calledOnce).to.be.true;
      expect(updateProfileStub.firstCall.args[0]).to.equal('user-id');
      expect(updateProfileStub.firstCall.args[1]).to.deep.equal(profileUpdateData);
      
      const responseData = res._getJSONData();
      expect(res.statusCode).to.equal(200);
      expect(responseData).to.have.property('status', 'success');
      expect(responseData).to.have.property('data');
      expect(responseData.data).to.have.property('firstName', profileUpdateData.firstName);
      
      // Clean up
      updateProfileStub.restore();
    });
  });

  // Add additional methods dynamically or verify their existence
  describe('Additional Auth Methods', function() {
    // Dynamically check and test methods
    const additionalMethods = [
      'resendVerificationEmail', 
      'forgotPassword', 
      'resetPassword'
    ];

    additionalMethods.forEach(method => {
      it(`should have ${method} method`, function() {
        expect(authController[method]).to.be.a('function');
      });
    });
  });
});