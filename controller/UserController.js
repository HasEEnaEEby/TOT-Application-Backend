const userService = require('../services/userService');
const logger = require('../utils/logger');

// Register
const createUser = async (req, res) => {
  try {
    const { name, email, password, phone_number, address } = req.body;

    logger.info(`User registration attempt for email: ${email}`);
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      logger.warn(`User registration failed for email: ${email} - User already exists`);
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = await userService.createUser({
      name,
      email,
      password,
      phone_number,
      address,
    });

    logger.info(`User successfully registered with email: ${email}`);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        name: newUser.name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        address: newUser.address,
      },
    });
  } catch (error) {
    logger.error('Error creating user:', error.message);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();

    logger.info('Fetched all users');

    res.status(200).json(users);
  } catch (error) {
    logger.error('Error fetching users:', error.message);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userService.getUserById(userId);

    if (!user) {
      logger.warn(`User with ID: ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`Fetched user details for ID: ${userId}`);

    res.status(200).json(user);
  } catch (error) {
    logger.error('Error fetching user by ID:', error.message);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

// Update user by ID
const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedData = req.body;

    logger.info(`Updating user details for ID: ${userId}`);

    const updatedUser = await userService.updateUser(userId, updatedData);

    if (!updatedUser) {
      logger.warn(`User with ID: ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`User details updated successfully for ID: ${userId}`);

    res.status(200).json(updatedUser);
  } catch (error) {
    logger.error('Error updating user:', error.message);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

// Delete user by ID
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    logger.info(`Attempting to delete user with ID: ${userId}`);

    const deletedUser = await userService.deleteUser(userId);

    if (!deletedUser) {
      logger.warn(`User with ID: ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`User with ID: ${userId} deleted successfully`);

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting user:', error.message);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

// User login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    logger.info(`Login attempt for email: ${email}`);
    const user = await userService.getUserByEmail(email);
    if (!user) {
      logger.warn(`Login failed for email: ${email} - User not found`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await userService.comparePassword(password, user.password);
    if (!isMatch) {
      logger.warn(`Login failed for email: ${email} - Invalid password`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = userService.generateAuthToken(user);
    logger.info(`User logged in successfully for email: ${email}`);

    res.status(200).json({
      message: 'Login successful',
      token,
    });
  } catch (error) {
    logger.error('Error logging in user:', error.message);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
};
