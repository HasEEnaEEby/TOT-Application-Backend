const Guest = require('../models/Guest');
const AppError = require('../utils/AppError');

const guestModeTimeValidation = async (req, res, next) => {
  const { guestSessionId } = req.body;

  try {
    const guest = await Guest.findOne({ sessionId: guestSessionId });

    if (!guest) {
      throw new AppError('Guest session not found', 404);
    }

    const currentTime = Date.now();
    if (currentTime > new Date(guest.expiresAt).getTime()) {
      throw new AppError('Guest session has expired. Please create a new session.', 403);
    }

    next(); 
  } catch (error) {
    next(error); 
  }
};

module.exports = guestModeTimeValidation;
