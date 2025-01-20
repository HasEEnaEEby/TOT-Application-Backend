import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import emailService from '../services/emailservices.js';


export const sendVerificationEmail = async (user, verificationToken) => {
  try {
    if (user.role === 'restaurant') {
      await emailService.sendRestaurantRegistrationEmail(user);
    } else {
      await emailService.sendVerificationEmail(user, verificationToken);
    }
  } catch (error) {
    await handleEmailError(user, error);
  }
};


const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log('Error sending email:', err);
  }
};

export const handleEmailError = async (user, error) => {
  logger.error('Failed to send verification email', {
    error: error.message,
    userId: user._id
  });

  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  throw new AppError('Failed to send verification email', 500);
};


export default {
  sendVerificationEmail,
  handleEmailError
};