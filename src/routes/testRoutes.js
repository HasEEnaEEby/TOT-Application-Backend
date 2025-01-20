import express from 'express';
import emailService  from '../services/emailservices.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/email', async (req, res) => {
  try {
    logger.info('Test email request received', { email: req.body.email });

    const result = await emailService.sendEmail({
      to: req.body.email,
      subject: 'Test Email from TOT App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">Test Email</h2>
          <p>This is a test email from TOT App.</p>
          <p>Current time: ${new Date().toLocaleString()}</p>
          <p>If you're seeing this, the email service is working correctly!</p>
        </div>
      `,
      text: 'This is a test email from TOT App.'
    });

    logger.info('Test email sent successfully', { 
      messageId: result.messageId,
      email: req.body.email 
    });

    res.status(200).json({
      status: 'success',
      message: 'Test email sent successfully',
      data: {
        messageId: result.messageId,
        preview: result.preview
      }
    });
  } catch (error) {
    logger.error('Test email failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

export default router;