import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      secure: false,
      requireTLS: true,
      auth: {
        user: "fe22594c3058be",
        pass: "36be25f5ed5a3b"
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });

    logger.info('Email service initialized');
  }

  async verifyConnection() {
    try {
      logger.info('🔄 Verifying email service connection...');
      const verification = await this.transporter.verify();
      
      if (verification) {
        logger.info('✅ Email service connected successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('❌ Email service verification failed:', {
        error: error.message,
        config: {
          host: this.transporter.options.host,
          port: this.transporter.options.port,
          user: this.transporter.options.auth.user
        }
      });
      return false;
    }
  }

  async sendEmail({ to, subject, html }) {
    try {
      if (!to || !subject || !html) {
        throw new Error('Missing required email parameters');
      }

      const mailOptions = {
        from: `"TOT - Touch, Order, Taste" <${process.env.EMAIL_FROM || 'noreply@tot.com'}>`,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('✉️ Email sent successfully', {
        messageId: info.messageId,
        to,
        subject
      });

      return {
        success: true,
        messageId: info.messageId,
        previewURL: nodemailer.getTestMessageUrl(info)
      };
    } catch (error) {
      logger.error('❌ Failed to send email', {
        error: error.message,
        to,
        subject
      });
      throw error;
    }
  }

  async sendVerificationEmail(user, verificationToken) {
    try {
      if (!user || !verificationToken) {
        throw new Error('Missing user or verification token');
      }
  
      logger.info('Preparing verification email', {
        userId: user._id,
        email: user.email,
        tokenPreview: verificationToken.substring(0, 10) + '...'
      });
  
      // Generate platform-specific verification links
      const webVerificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
      const mobileVerificationLink = `tot://verify-email/${verificationToken}`;
      
      const result = await this.sendEmail({
        to: user.email,
        subject: '✨ Verify Your TOT Account',
        html: this.generateVerificationEmail(user, webVerificationLink, mobileVerificationLink)
      });
  
      logger.info('Verification email sent successfully', {
        userId: user._id,
        email: user.email,
        messageId: result.messageId
      });
  
      return result;
    } catch (error) {
      logger.error('Failed to send verification email', {
        error: error.message,
        userId: user?._id,
        email: user?.email
      });
      throw error;
    }
  }
  
  generateVerificationEmail(user, webLink, mobileLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your TOT Account</title>
        <style>
          a { text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 15px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Existing email template content -->
          
          <!-- Verification Links Section -->
          <div style="margin-top: 30px; text-align: center; padding: 15px; background-color: #F3F4F6; border-radius: 8px;">
            <p style="color: #4B5563; font-size: 14px; margin-bottom: 10px;">
              Verify on Web: 
              <a href="${webLink}" style="color: #3B82F6; word-break: break-all;">
                ${webLink}
              </a>
            </p>
            <p style="color: #4B5563; font-size: 14px; margin-top: 0;">
              Verify on Mobile: 
              <a href="${mobileLink}" style="color: #3B82F6; word-break: break-all;">
                ${mobileLink}
              </a>
            </p>
          </div>
  
          <!-- Existing footer -->
        </div>
      </body>
      </html>
    `;
  }

  generateVerificationEmail(user, verificationLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your TOT Account</title>
        <style>
          a { text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 15px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 40px 20px; text-align: center;">
            <div style="background-color: white; width: 80px; height: 80px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #FF6B6B;">TOT</h1>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">
              Welcome to TOT, ${user.username}! 🍽️
            </h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px; text-align: center;">
              Please verify your email to start exploring amazing restaurants!
            </p>

            <!-- Verification Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${verificationLink}" 
                style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); 
                      color: white; text-decoration: none; border-radius: 8px; font-weight: 600;
                      box-shadow: 0 4px 6px rgba(255, 107, 107, 0.2);">
                Verify Email Address
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Or copy this link:<br>
              <a href="${verificationLink}" style="color: #3B82F6; word-break: break-all;">
                ${verificationLink}
              </a>
            </p>

            <!-- Benefits Section -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">What's next after verification?</h3>
              <ul style="color: #4b5563; margin: 15px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Browse restaurants near you</li>
                <li style="margin-bottom: 8px;">Order your favorite dishes</li>
                <li style="margin-bottom: 8px;">Track your orders in real-time</li>
                <li style="margin-bottom: 8px;">Save your favorite places</li>
              </ul>
            </div>

            <!-- Warning Section -->
            <div style="margin-top: 30px; text-align: center; padding: 15px; background-color: #FEF3C7; border-radius: 8px;">
              <p style="color: #92400E; font-size: 14px; margin: 0;">
                ⚠️ This verification link will expire in 24 hours.<br>
                If you didn't create this account, please ignore this email.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} TOT - Touch, Order, Taste. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendRestaurantRegistrationEmail(user) {
    try {
      if (!user || !user.restaurantName) {
        throw new Error('Invalid user data for restaurant registration email');
      }

      logger.info('Preparing restaurant registration email', {
        userId: user._id,
        email: user.email,
        restaurantName: user.restaurantName
      });

      const result = await this.sendEmail({
        to: user.email,
        subject: '🏮 Your TOT Restaurant Application is Pending Review',
        html: this.generateRestaurantPendingEmail(user)
      });

      logger.info('Restaurant registration email sent successfully', {
        userId: user._id,
        email: user.email,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to send restaurant registration email', {
        error: error.message,
        userId: user?._id,
        email: user?.email,
        restaurantName: user?.restaurantName
      });
      throw error;
    }
  }

  generateRestaurantPendingEmail(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your TOT Restaurant Registration</title>
        <style>
          a { text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 15px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 40px 20px; text-align: center;">
            <div style="background-color: white; width: 80px; height: 80px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #FF6B6B;">TOT</h1>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; text-align: center;">
              Thank you for registering ${user.restaurantName}! 🍴
            </h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px; text-align: center;">
              Your restaurant registration is currently under review. Our team will carefully evaluate your application and get back to you soon.
            </p>

            <!-- What to Expect Section -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">What happens next?</h3>
              <ul style="color: #4b5563; margin: 15px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Our team will review your application</li>
                <li style="margin-bottom: 8px;">You'll receive an approval notification email</li>
                <li style="margin-bottom: 8px;">Set up your restaurant profile and menu</li>
                <li style="margin-bottom: 8px;">Start accepting orders through TOT</li>
              </ul>
            </div>

            <!-- Support Section -->
            <div style="margin-top: 30px; text-align: center; padding: 15px; background-color: #F3F4F6; border-radius: 8px;">
              <p style="color: #4B5563; font-size: 14px; margin: 0;">
                Need assistance? Contact our support team at support@tot.com
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} TOT - Touch, Order, Taste. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Create and export a single instance
const emailService = new EmailService();
export default emailService;