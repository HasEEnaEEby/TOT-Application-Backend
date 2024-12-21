const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const createUser = async ({ name, email, password, role, phone_number, address, restaurantId }) => {
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone_number,
      address,
      restaurantId,
    });

    await newUser.save();
    const token = generateToken(newUser);  

    return { newUser, token }; 
  } catch (err) {
    throw new Error('Error creating user: ' + err.message);
  }
};


const getUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (err) {
    throw new Error('Error fetching user by email: ' + err.message);
  }
};

const comparePassword = async (enteredPassword, storedPassword) => {
  try {
    return await bcrypt.compare(enteredPassword, storedPassword);
  } catch (err) {
    throw new Error('Error comparing passwords: ' + err.message);
  }
};

const generateAuthToken = (user) => {
  try {
    return generateToken(user);  
  } catch (err) {
    throw new Error('Error generating token: ' + err.message);
  }
};

module.exports = {
  createUser,
  getUserByEmail,
  comparePassword,
  generateAuthToken,
};
