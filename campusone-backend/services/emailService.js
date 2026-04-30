import { Resend } from 'resend';

/**
 * Email Service for sending OTP, 2FA, admission, and announcement emails via Resend.
 */

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM || 'CampusOne <onboarding@resend.dev>';
const ANNOUNCEMENT_FROM = process.env.RESEND_FROM_ANNOUNCEMENT || FROM_ADDRESS;

/**
 * Internal helper — wraps resend.emails.send and normalises the response.
 */
const sendEmail = async ({ from = FROM_ADDRESS, to, subject, html, text }) => {
  if (!process.env.RESEND_API_KEY) {
    console.error('Email send skipped: RESEND_API_KEY is not set');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message || String(error) };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, error: err.message };
  }
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
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .otp-box { background: white; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; font-family: 'Courier New', monospace; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
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
        <p style="margin-top: 30px;">Best regards,<br><strong>CampusOne Team</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nYour CampusOne verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nCampusOne Team`;

  return sendEmail({
    to: email,
    subject: 'Your CampusOne Verification Code',
    html,
    text,
  });
};

/**
 * Send 2FA enabled confirmation email
 */
export const send2FAEnabledEmail = async (email, name, method) => {
  const methodText = method === 'email' ? 'Email OTP' : 'Authenticator App';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header"><h1 style="margin: 0;">🔒 Security Update</h1></div>
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
        <p style="margin-top: 30px;">Best regards,<br><strong>CampusOne Security Team</strong></p>
      </div>
      <div class="footer"><p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p></div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nTwo-Factor Authentication has been enabled on your CampusOne account.\nMethod: ${methodText}\n\nYour account is now more secure. You'll need to verify your identity using ${methodText.toLowerCase()} each time you log in from a new device.\n\nIf you didn't enable this feature, please contact support immediately.\n\nBest regards,\nCampusOne Security Team`;

  return sendEmail({
    to: email,
    subject: 'Two-Factor Authentication Enabled',
    html,
    text,
  });
};

/**
 * Send admission application confirmation email
 */
export const sendAdmissionApplicationConfirmationEmail = async (email, name, applicationNumber, program) => {
  const submissionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .app-box { background: white; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .app-number { font-size: 18px; font-weight: bold; color: #2563eb; font-family: 'Courier New', monospace; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { color: #6b7280; font-weight: bold; }
        .info-value { color: #1f2937; }
        .status-box { background: #e0e7ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .next-steps { background: #eff6ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header"><h1 style="margin: 0;">🎓 CampusOne</h1><p style="margin: 10px 0 0 0; opacity: 0.9;">Admission Portal</p></div>
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for submitting your admission application to CampusOne. We have successfully received your application.</p>
        <div class="app-box">
          <div class="info-row"><span class="info-label">Application Number:</span><span class="app-number">${applicationNumber}</span></div>
          <div class="info-row"><span class="info-label">Program Applied:</span><span class="info-value">${program}</span></div>
          <div class="info-row"><span class="info-label">Submission Date:</span><span class="info-value">${submissionDate}</span></div>
          <div class="info-row"><span class="info-label">Status:</span><span class="info-value">Pending Review</span></div>
        </div>
        <div class="status-box">
          <strong>📋 Application Status:</strong><br>
          Your application is currently pending review. Our admissions team will evaluate your application and contact you with updates within the specified timeline.
        </div>
        <div class="next-steps">
          <strong>📌 Next Steps:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Keep your application number safe for future reference</li>
            <li>Check your email regularly for updates</li>
            <li>Upload required documents if you haven't already done so</li>
            <li>Do not share your application number with unauthorized persons</li>
          </ul>
        </div>
        <p><strong>Important:</strong> If you need to submit additional documents or make changes to your application, please use your application number to login to the portal and update your information before the deadline.</p>
        <p>If you have any questions or concerns about your application, please don't hesitate to contact our admissions office.</p>
        <p style="margin-top: 30px;">Best regards,<br><strong>CampusOne Admissions Team</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email. Contact admissions@campusone.edu for support.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nThank you for submitting your admission application to CampusOne. We have successfully received your application.\n\nApplication Number: ${applicationNumber}\nProgram Applied: ${program}\nSubmission Date: ${submissionDate}\nStatus: Pending Review\n\nYour application is currently pending review. Our admissions team will evaluate your application and contact you with updates within the specified timeline.\n\nNext Steps:\n- Keep your application number safe for future reference\n- Check your email regularly for updates\n- Upload required documents if you haven't already done so\n- Do not share your application number with unauthorized persons\n\nBest regards,\nCampusOne Admissions Team`;

  return sendEmail({
    to: email,
    subject: 'Admission Application Received - CampusOne',
    html,
    text,
  });
};

/**
 * Send admission application under review email
 */
export const sendApplicationUnderReviewEmail = async (email, name, applicationNumber, reviewNotes) => {
  const reviewDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0891b2 0%, #0369a1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .app-box { background: white; border: 2px solid #0891b2; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .app-number { font-size: 18px; font-weight: bold; color: #0891b2; font-family: 'Courier New', monospace; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { color: #6b7280; font-weight: bold; }
        .info-value { color: #1f2937; }
        .status-box { background: #cffafe; border-left: 4px solid #0891b2; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .review-notes { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px; font-style: italic; }
        .next-steps { background: #eff6ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header"><h1 style="margin: 0;">🎓 CampusOne</h1><p style="margin: 10px 0 0 0; opacity: 0.9;">Admission Portal</p></div>
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        <p>We are writing to inform you that your admission application is now under review.</p>
        <div class="app-box">
          <div class="info-row"><span class="info-label">Application Number:</span><span class="app-number">${applicationNumber}</span></div>
          <div class="info-row"><span class="info-label">Current Status:</span><span class="info-value" style="color: #0891b2; font-weight: bold;">Under Review</span></div>
          <div class="info-row"><span class="info-label">Review Date:</span><span class="info-value">${reviewDate}</span></div>
        </div>
        <div class="status-box">
          <strong>📋 Application Status Update:</strong><br>
          Your application has been reviewed by our admissions team and is currently being evaluated. We will notify you of the final decision shortly.
        </div>
        ${reviewNotes ? `<div class="review-notes"><strong>📝 Review Notes:</strong><br>${reviewNotes}</div>` : ''}
        <div class="next-steps">
          <strong>📌 What Next?</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Your application is being carefully reviewed</li>
            <li>We may contact you for additional information if needed</li>
            <li>Keep your email and phone number updated</li>
            <li>You will receive a final decision notification soon</li>
          </ul>
        </div>
        <p>We appreciate your patience and interest in CampusOne. If you have any questions, please feel free to contact our admissions office.</p>
        <p style="margin-top: 30px;">Best regards,<br><strong>CampusOne Admissions Team</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email. Contact admissions@campusone.edu for support.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nWe are writing to inform you that your admission application is now under review.\n\nApplication Number: ${applicationNumber}\nCurrent Status: Under Review\nReview Date: ${reviewDate}\n\nYour application has been reviewed by our admissions team and is currently being evaluated. We will notify you of the final decision shortly.\n\n${reviewNotes ? `Review Notes:\n${reviewNotes}\n\n` : ''}Best regards,\nCampusOne Admissions Team`;

  return sendEmail({
    to: email,
    subject: 'Your Application is Under Review - CampusOne',
    html,
    text,
  });
};

/**
 * Send admission application acceptance email
 */
export const sendApplicationAcceptanceEmail = async (email, name, applicationNumber, program) => {
  const decisionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .app-box { background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .app-number { font-size: 18px; font-weight: bold; color: #10b981; font-family: 'Courier New', monospace; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { color: #6b7280; font-weight: bold; }
        .info-value { color: #1f2937; }
        .status-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; text-align: center; }
        .acceptance-message { font-size: 20px; font-weight: bold; color: #10b981; }
        .next-steps { background: #eff6ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header"><h1 style="margin: 0;">🎓 CampusOne</h1><p style="margin: 10px 0 0 0; opacity: 0.9;">Admission Portal</p></div>
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        <div class="status-box">
          <div class="acceptance-message">🎉 Congratulations! 🎉</div>
          <p style="margin: 10px 0 0 0;">Your application has been <strong>ACCEPTED</strong></p>
        </div>
        <p>We are delighted to inform you that your admission application to CampusOne has been approved. Welcome to our community!</p>
        <div class="app-box">
          <div class="info-row"><span class="info-label">Application Number:</span><span class="app-number">${applicationNumber}</span></div>
          <div class="info-row"><span class="info-label">Program Accepted:</span><span class="info-value">${program}</span></div>
          <div class="info-row"><span class="info-label">Current Status:</span><span class="info-value" style="color: #10b981; font-weight: bold;">Accepted</span></div>
          <div class="info-row"><span class="info-label">Decision Date:</span><span class="info-value">${decisionDate}</span></div>
        </div>
        <div class="next-steps">
          <strong>📌 Next Steps:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Complete your enrollment registration</li>
            <li>Provide any outstanding documents</li>
            <li>Finalize your course selection</li>
            <li>Complete the admission formalities</li>
            <li>Attend the orientation program (if applicable)</li>
          </ul>
        </div>
        <p>Our admissions team will contact you shortly with further instructions regarding enrollment and registration.</p>
        <p style="margin-top: 30px;">Best regards,<br><strong>CampusOne Admissions Team</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email. Contact admissions@campusone.edu for support.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nCongratulations! 🎉\n\nWe are delighted to inform you that your admission application to CampusOne has been approved. Welcome to our community!\n\nApplication Number: ${applicationNumber}\nProgram Accepted: ${program}\nCurrent Status: Accepted\nDecision Date: ${decisionDate}\n\nNext Steps:\n- Complete your enrollment registration\n- Provide any outstanding documents\n- Finalize your course selection\n- Complete the admission formalities\n- Attend the orientation program (if applicable)\n\nBest regards,\nCampusOne Admissions Team`;

  return sendEmail({
    to: email,
    subject: 'Congratulations! Your Application is Accepted - CampusOne',
    html,
    text,
  });
};

/**
 * Send admission application rejection email
 */
export const sendApplicationRejectionEmail = async (email, name, applicationNumber, rejectionReason) => {
  const decisionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .app-box { background: white; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .app-number { font-size: 18px; font-weight: bold; color: #dc2626; font-family: 'Courier New', monospace; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { color: #6b7280; font-weight: bold; }
        .info-value { color: #1f2937; }
        .status-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .rejection-reason { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; font-style: italic; }
        .next-steps { background: #eff6ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header"><h1 style="margin: 0;">🎓 CampusOne</h1><p style="margin: 10px 0 0 0; opacity: 0.9;">Admission Portal</p></div>
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for your interest in CampusOne. We have reviewed your application carefully.</p>
        <div class="app-box">
          <div class="info-row"><span class="info-label">Application Number:</span><span class="app-number">${applicationNumber}</span></div>
          <div class="info-row"><span class="info-label">Current Status:</span><span class="info-value" style="color: #dc2626; font-weight: bold;">Not Accepted</span></div>
          <div class="info-row"><span class="info-label">Decision Date:</span><span class="info-value">${decisionDate}</span></div>
        </div>
        <div class="status-box">
          <strong>📋 Application Decision:</strong><br>
          Unfortunately, we are unable to offer you admission at this time. However, we encourage you to apply again in future admission cycles.
        </div>
        ${rejectionReason ? `<div class="rejection-reason"><strong>📝 Reason:</strong><br>${rejectionReason}</div>` : ''}
        <div class="next-steps">
          <strong>📌 Feedback & Future Opportunities:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Consider addressing the areas mentioned in the rejection reason</li>
            <li>You are welcome to apply in the next admission cycle</li>
            <li>Feel free to contact our admissions office for feedback</li>
            <li>We wish you the best in your academic pursuits</li>
          </ul>
        </div>
        <p>We appreciate the time you took to apply and wish you success in your future endeavors.</p>
        <p style="margin-top: 30px;">Best regards,<br><strong>CampusOne Admissions Team</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email. Contact admissions@campusone.edu for support.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nThank you for your interest in CampusOne. We have reviewed your application carefully.\n\nApplication Number: ${applicationNumber}\nCurrent Status: Not Accepted\nDecision Date: ${decisionDate}\n\nUnfortunately, we are unable to offer you admission at this time. However, we encourage you to apply again in future admission cycles.\n\n${rejectionReason ? `Reason:\n${rejectionReason}\n\n` : ''}Best regards,\nCampusOne Admissions Team`;

  return sendEmail({
    to: email,
    subject: 'Application Decision - CampusOne',
    html,
    text,
  });
};

/**
 * Send announcement email
 */
export const sendAnnouncementEmail = async ({ email, name, title, content, priority }) => {
  const priorityColor = priority === 'high' ? '#dc2626' : priority === 'medium' ? '#2563eb' : '#10b981';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .priority-badge { background: ${priorityColor}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; font-size: 12px; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .announcement-title { font-size: 24px; color: #1f2937; margin-bottom: 20px; border-bottom: 3px solid ${priorityColor}; padding-bottom: 15px; }
        .announcement-body { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; word-wrap: break-word; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header"><h1 style="margin: 0;">📢 CampusOne Announcement</h1></div>
      <div class="content">
        <p style="margin-top: 0;">Hi ${name},</p>
        <div class="priority-badge">${priority?.toUpperCase() || 'INFO'}</div>
        <div class="announcement-title">${title}</div>
        <div class="announcement-body">${content}</div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This is an official announcement from CampusOne. Please check the portal for more details.</p>
        <div class="footer"><p>© ${new Date().getFullYear()} CampusOne. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    from: ANNOUNCEMENT_FROM,
    to: email,
    subject: `[${priority?.toUpperCase() || 'INFO'}] ${title}`,
    html,
  });
};

export default {
  generateOTP,
  sendOTPEmail,
  send2FAEnabledEmail,
  sendAdmissionApplicationConfirmationEmail,
  sendApplicationUnderReviewEmail,
  sendApplicationAcceptanceEmail,
  sendApplicationRejectionEmail,
  sendAnnouncementEmail,
};
