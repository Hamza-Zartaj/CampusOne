import nodemailer from 'nodemailer';

/**
 * Email Service for sending OTP and other emails
 */

// Create transporter (configure with your email service)
const createTransporter = () => {
  // For development, use ethereal email or configure with real SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Generate a 6-digit OTP code
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email
 */
export const sendOTPEmail = async (email, name, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"CampusOne" <${process.env.SMTP_USER || 'noreply@campusone.edu'}>`,
      to: email,
      subject: 'Your CampusOne Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .otp-box {
              background: white;
              border: 2px dashed #2563eb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #2563eb;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🎓 CampusOne</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Two-Factor Authentication</p>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>You requested a verification code for your CampusOne account. Use the code below to complete your login:</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Valid for 10 minutes</p>
            </div>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong> Never share this code with anyone. CampusOne staff will never ask for your verification code.
            </div>

            <p>If you didn't request this code, please ignore this email or contact support if you have concerns about your account security.</p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>CampusOne Team</strong>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${name},

Your CampusOne verification code is: ${otp}

This code is valid for 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
CampusOne Team
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send 2FA enabled confirmation email
 */
export const send2FAEnabledEmail = async (email, name, method) => {
  try {
    const transporter = createTransporter();

    const methodText = method === 'email' ? 'Email OTP' : 'Authenticator App';

    const mailOptions = {
      from: `"CampusOne" <${process.env.SMTP_USER || 'noreply@campusone.edu'}>`,
      to: email,
      subject: 'Two-Factor Authentication Enabled',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .success-box {
              background: #d1fae5;
              border-left: 4px solid #10b981;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🔒 Security Update</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            
            <div class="success-box">
              <strong>✓ Two-Factor Authentication has been enabled</strong><br>
              Method: <strong>${methodText}</strong>
            </div>

            <p>Your CampusOne account is now more secure with two-factor authentication. You'll need to verify your identity using ${methodText.toLowerCase()} each time you log in from a new device.</p>

            <p><strong>What this means:</strong></p>
            <ul>
              <li>Enhanced security for your account</li>
              <li>Protection against unauthorized access</li>
              <li>Verification required on untrusted devices</li>
            </ul>

            <p>If you didn't enable this feature, please contact support immediately.</p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>CampusOne Security Team</strong>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${name},

Two-Factor Authentication has been enabled on your CampusOne account.
Method: ${methodText}

Your account is now more secure. You'll need to verify your identity using ${methodText.toLowerCase()} each time you log in from a new device.

If you didn't enable this feature, please contact support immediately.

Best regards,
CampusOne Security Team
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending 2FA confirmation email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  generateOTP,
  sendOTPEmail,
  send2FAEnabledEmail,
};
