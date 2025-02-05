import nodemailer from 'nodemailer';
import config from '../config/config.js';

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
    }
});

const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `${config.appName} <${config.email.from}>`,
            to: options.email,
            subject: options.subject,
            html: options.html
        };

        const info = await transporter.sendMail(mailOptions);
        if (config.nodeEnv === 'development') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        return info;
    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error('Error sending email');
    }
};

export const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${config.frontendUrl}${config.verificationUrl}?token=${token}`;
    
    const html = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Welcome to ${config.appName}!</h1>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 5px;">
                    Verify Email
                </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
        </div>
    `;

    return sendEmail({
        email,
        subject: 'Verify Your Email Address',
        html
    });
};

export const sendApprovalEmail = async (email, restaurantName) => {
    const loginUrl = `${config.frontendUrl}/login`;
    
    const html = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Congratulations!</h1>
            <p>Dear ${restaurantName},</p>
            <p>We are pleased to inform you that your restaurant registration has been approved.</p>
            <p>You can now log in to your dashboard and start managing your restaurant:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 5px;">
                    Login to Dashboard
                </a>
            </div>
            <p>Welcome to the ${config.appName} family!</p>
        </div>
    `;

    return sendEmail({
        email,
        subject: 'Restaurant Registration Approved',
        html
    });
};

export const sendRejectionEmail = async (email, restaurantName) => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Registration Update</h1>
            <p>Dear ${restaurantName},</p>
            <p>We regret to inform you that your restaurant registration could not be approved at this time.</p>
            <p>This could be due to various reasons, including:</p>
            <ul>
                <li>Incomplete or incorrect documentation</li>
                <li>Non-compliance with our platform's requirements</li>
                <li>Quality standards not met</li>
            </ul>
            <p>You're welcome to submit a new application after addressing these potential issues.</p>
            <p>If you need clarification or have any questions, please don't hesitate to contact our support team.</p>
        </div>
    `;

    return sendEmail({
        email,
        subject: 'Restaurant Registration Status Update',
        html
    });
};

export const sendPasswordResetEmail = async (email, resetToken) => {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    
    const html = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 5px;">
                    Reset Password
                </a>
            </div>
            <p>If you didn't request this, please ignore this email. Your password will stay safe and won't be changed.</p>
            <p>This link will expire in 1 hour.</p>
        </div>
    `;

    return sendEmail({
        email,
        subject: 'Password Reset Request',
        html
    });
};

// For order notifications
export const sendOrderNotificationEmail = async (email, orderDetails) => {
    const html = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">New Order Received</h1>
            <p>You have received a new order:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Total Amount:</strong> Rs. ${orderDetails.total.toFixed(2)}</p>
                <p><strong>Items:</strong></p>
                <ul>
                    ${orderDetails.items.map(item => `
                        <li>${item.quantity}x ${item.name} - Rs. ${item.price.toFixed(2)}</li>
                    `).join('')}
                </ul>
            </div>
            <p>Please process this order as soon as possible.</p>
        </div>
    `;

    return sendEmail({
        email,
        subject: 'New Order Notification',
        html
    });
};