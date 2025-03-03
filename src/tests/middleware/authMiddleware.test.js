import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { protect, restrictTo } from '../../middleware/authMiddleware.js';
import User from '../../models/User.js';
import generateToken from '../../utils/generateToken.js';
import authFixtures from '../fixtures/auth.fixtures.js';
import { expect, sinon } from '../setup.mjs';

const { validUser, createHashedUser, validCredentials, invalidCredentials } = authFixtures;

// Add default users needed for the test
const adminUser = {
  email: 'admin@example.com',
  role: 'admin',
  isEmailVerified: true
};

const restaurantUser = {
  email: 'restaurant@example.com',
  role: 'restaurant',
  isEmailVerified: true,
  status: 'approved'
};

describe('Auth Middleware', function() {
  let req, res, next, user, admin, restaurant;

  beforeEach(async function() {
    // Create test users of different roles
    user = await createHashedUser({
      ...validUser,
      isEmailVerified: true
    });
    admin = await createHashedUser({
      ...adminUser
    });
    restaurant = await createHashedUser({
      ...restaurantUser
    });
    
    // Insert users into the database
    await User.insertMany([user, admin, restaurant]);
    
    // Set up request, response, and next function
    req = {
      headers: {},
      cookies: {},
      id: 'test-request-id'
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    next = sinon.stub();
  });

  describe('protect middleware', function() {
    it('should pass when valid token is provided in Authorization header', async function() {
      // Arrange
      const token = generateToken(user._id, user.role);
      req.headers.authorization = `Bearer ${token}`;
      
      // Act
      await protect(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(req.user).to.exist;
      expect(req.user._id.toString()).to.equal(user._id.toString());
      expect(req.user.role).to.equal(user.role);
    });

    it('should accept token from cookie if not in Authorization header', async function() {
      // Arrange
      const token = generateToken(user._id, user.role);
      req.cookies.token = token;
      
      // Act
      await protect(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(req.user).to.exist;
    });

    it('should return 401 when no token is provided', async function() {
      // Act
      await protect(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.status).to.equal('error');
      expect(responseData.message).to.include('not authenticated');
    });

    it('should return 401 when invalid token is provided', async function() {
      // Arrange
      req.headers.authorization = 'Bearer invalid-token';
      
      // Act
      await protect(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.status).to.equal('error');
      expect(responseData.message).to.include('Invalid token');
    });

    it('should return 401 when user no longer exists', async function() {
      // Arrange
      const nonExistingUserId = new Types.ObjectId();
      const token = generateToken(nonExistingUserId, 'customer');
      req.headers.authorization = `Bearer ${token}`;
      
      // Act
      await protect(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.status).to.equal('error');
      expect(responseData.message).to.include('user no longer exists');
    });

    it('should handle expired tokens properly', async function() {
      // Stub jwt.verify to simulate an expired token
      sinon.stub(jwt, 'verify').throws(new TokenExpiredError('jwt expired', new Date()));
      
      // Arrange
      req.headers.authorization = 'Bearer expired-token';
      
      // Act
      await protect(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.status).to.equal('error');
      expect(responseData.message).to.include('expired');
      
      // Restore the original function
      jwt.verify.restore();
    });
  });

  describe('restrictTo middleware', function() {
    beforeEach(function() {
      // Setup authenticated user for each test
      req.user = user;
    });

    it('should call next() when customer user has the required role', function() {
      // Arrange
      const restrictToCustomer = restrictTo('customer');
      
      // Act
      restrictToCustomer(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
    });

    it('should return 403 when customer does not have the required role', function() {
      // Arrange
      const restrictToAdmin = restrictTo('admin');
      
      // Act
      restrictToAdmin(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.status).to.equal('error');
      expect(responseData.message).to.include('not authorized');
    });

    it('should allow admin to access admin-only routes', function() {
      // Arrange
      req.user = admin;
      const restrictToAdmin = restrictTo('admin');
      
      // Act
      restrictToAdmin(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
    });

    it('should allow restaurant to access restaurant-only routes', function() {
      // Arrange
      req.user = restaurant;
      const restrictToRestaurant = restrictTo('restaurant');
      
      // Act
      restrictToRestaurant(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
    });

    it('should work with multiple roles', function() {
      // Arrange
      const restrictToMultiple = restrictTo('admin', 'restaurant', 'manager');
      
      // Act - Test with restaurant user
      req.user = restaurant;
      restrictToMultiple(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      
      // Reset for next test
      next.reset();
      
      // Test with admin user
      req.user = admin;
      restrictToMultiple(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      
      // Reset for next test
      next.reset();
      
      // Test with customer user (should be forbidden)
      req.user = user;
      restrictToMultiple(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
    });
  });

  describe('restaurant middleware', function() {
    it('should allow approved and verified restaurants to proceed', async function() {
      // Arrange
      req.user = restaurant; // restaurant is approved (set in beforeEach)
      req.path = '/some-restaurant-route';
      
      // Act
      await restaurant(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
    });

    it('should block pending restaurants', async function() {
      // Arrange - create pending restaurant
      const pendingRestaurant = await createHashedUser({
        ...restaurantUser,
        email: 'pending@restaurant.com',
        status: 'pending'
      });
      await User.create(pendingRestaurant);
      
      req.user = pendingRestaurant;
      req.path = '/some-restaurant-route';
      
      // Act
      await restaurant(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.message).to.include('pending approval');
    });

    it('should block rejected restaurants', async function() {
      // Arrange - create rejected restaurant
      const rejectedRestaurant = await createHashedUser({
        ...restaurantUser,
        email: 'rejected@restaurant.com',
        status: 'rejected'
      });
      await User.create(rejectedRestaurant);
      
      req.user = rejectedRestaurant;
      req.path = '/some-restaurant-route';
      
      // Act
      await restaurant(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.message).to.include('has been rejected');
    });

    it('should block unverified restaurants', async function() {
      // Arrange - create unverified restaurant
      const unverifiedRestaurant = await createHashedUser({
        ...restaurantUser,
        email: 'unverified@restaurant.com',
        isEmailVerified: false
      });
      await User.create(unverifiedRestaurant);
      
      req.user = unverifiedRestaurant;
      req.path = '/some-restaurant-route';
      
      // Act
      await restaurant(req, res, next);
      
      // Assert
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData.message).to.include('verify your email');
    });
  });
});