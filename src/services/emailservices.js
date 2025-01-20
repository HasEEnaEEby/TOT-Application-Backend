// src/services/emailservices.js
import crypto from 'crypto';
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
        user: "e240c254403eb4",
        pass: "fc7421274e8527"
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
        from: `"TOT - Touch, Order, Taste" <${process.env.EMAIL_FROM}>`,
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
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateVerificationToken() {
    // Generate raw token
    const rawToken = crypto.randomBytes(32).toString('hex');
    
    // Generate hashed version for storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    return {
      rawToken,
      hashedToken,
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  async sendVerificationEmail(user, verificationToken) {
    try {
      if (!user || !verificationToken) {
        throw new Error('Missing user or verification token');
      }
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
      
      const result = await this.sendEmail({
        to: user.email,
        subject: '✨ Verify Your TOT Account',
        html: this.generateVerificationEmail(user, verificationLink)
      });
  
      logger.info('Verification email sent', {
        userId: user._id,
        email: user.email
      });
  
      return result;
    } catch (error) {
      logger.error('Failed to send verification email', {
        error: error.message,
        userId: user?._id
      });
      throw error;
    }
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
    if (!user || !user.restaurantName) {
      throw new Error('Invalid user data for restaurant registration email');
    }

    return this.sendEmail({
      to: user.email,
      subject: '🏮 Your TOT Restaurant Application is Pending Review',
      html: this.generateRestaurantPendingEmail(user)
    });
  }

  generateRestaurantPendingEmail(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your TOT Restaurant Registration</title>
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
              Registration Received! 🎉
            </h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
              Thank you for registering <strong>${user.restaurantName}</strong>! Our admin team will review your application within 24-48 hours.
            </p>

            <!-- Registration Details -->
            <div style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Your Registration Details:</h3>
              <ul style="color: #4b5563; margin: 10px 0;">
                <li>Restaurant Name: ${user.restaurantName}</li>
                <li>Location: ${user.location}</li>
                <li>Contact: ${user.contactNumber}</li>
              </ul>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #fff3f3; border-radius: 10px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Next Steps:</h3>
              <ol style="color: #4b5563;">
                <li>Admin review (1-2 business days)</li>
                <li>Approval confirmation email</li>
                <li>Complete restaurant profile</li>
                <li>Start accepting orders!</li>
              </ol>
            </div>

            <!-- Support Section -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Questions? Contact our partner support:<br>
                <a href="mailto:partners@tot-app.com" style="color: #FF6B6B; text-decoration: none;">partners@tot-app.com</a>
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

// Create and export single instance
export const emailService = new EmailService();
export default emailService;