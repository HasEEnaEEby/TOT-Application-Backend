const bcrypt = require('bcryptjs');

// Hash a password
exports.hashPassword = async (password) => {
  const saltRounds = Number(process.env.SALT_ROUNDS || 10); 
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(password, salt);
};


exports.comparePassword = async (enteredPassword, storedPassword) => {
  return await bcrypt.compare(enteredPassword, storedPassword);
};
