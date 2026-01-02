# Email Service Setup Guide

This guide will help you configure the email service for sending OTP codes and notifications in CampusOne.

## Prerequisites

- A Gmail account (or any SMTP email service)
- Access to your email account settings

## Option 1: Gmail Setup (Recommended for Development)

### Step 1: Enable 2-Step Verification

1. Go to your [Google Account](https://myaccount.google.com/)
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", enable **2-Step Verification**
4. Follow the prompts to set it up

### Step 2: Generate App Password

1. After enabling 2-Step Verification, go back to **Security**
2. Under "Signing in to Google", click on **App passwords**
3. Select **Mail** as the app and **Other** as the device
4. Enter "CampusOne" as the device name
5. Click **Generate**
6. **Copy the 16-character password** (you won't be able to see it again)

### Step 3: Configure Environment Variables

Open your `.env` file in the `campusone-backend` folder and add:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
```

**Replace:**
- `your-email@gmail.com` with your actual Gmail address
- `your-16-char-app-password` with the app password you generated

## Option 2: Other Email Services

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Yahoo Mail

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

**Note:** Yahoo also requires app passwords. Generate one at [Yahoo Account Security](https://login.yahoo.com/account/security).

### Custom SMTP Server

```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password
```

## Option 3: Development/Testing (Ethereal Email)

For testing without a real email account, use [Ethereal Email](https://ethereal.email/):

1. Go to https://ethereal.email/
2. Click **Create Ethereal Account**
3. Copy the credentials and add to `.env`:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=generated-username@ethereal.email
SMTP_PASSWORD=generated-password
```

**Note:** Ethereal emails are fake - they won't be delivered but you can view them at https://ethereal.email/messages

## Verification

After configuring your `.env` file:

1. **Restart your backend server:**
   ```bash
   cd campusone-backend
   npm run dev
   ```

2. **Test the email service:**
   - Register a new user or try the first-time login flow
   - Select "Email OTP" as the 2FA method
   - Check if you receive the OTP email

## Troubleshooting

### Email Not Sending

**Error: "Invalid login credentials"**
- Double-check your email and password in `.env`
- For Gmail: Make sure you're using an **app password**, not your regular password
- Ensure 2-Step Verification is enabled

**Error: "Connection timeout"**
- Check your internet connection
- Try port `465` instead of `587` (use `secure: true` in emailService.js)
- Check if your firewall is blocking SMTP ports

**Error: "self signed certificate"**
- Add `tls: { rejectUnauthorized: false }` to transporter config (development only)

### Emails Going to Spam

- Add a proper "From" name in the email configuration
- Use a verified domain if possible
- Avoid spam-trigger words in email content
- Consider using a dedicated email service like SendGrid or AWS SES for production

## Production Recommendations

For production environments, consider using:

1. **SendGrid** - https://sendgrid.com/
   - Free tier: 100 emails/day
   - Better deliverability

2. **AWS SES** - https://aws.amazon.com/ses/
   - Very affordable
   - High deliverability

3. **Mailgun** - https://www.mailgun.com/
   - Free tier: 5,000 emails/month

4. **Postmark** - https://postmarkapp.com/
   - Excellent for transactional emails

## Security Best Practices

✅ **Never commit `.env` file to Git**
✅ Use app passwords instead of account passwords
✅ Rotate passwords regularly
✅ Use environment-specific credentials
✅ Consider rate limiting for email sending
✅ Monitor email sending for abuse

## Sample `.env` File

```env
# Database
MONGO_URI=mongodb://localhost:27017/campusone

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=campusone@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop

# Server
PORT=5000
NODE_ENV=development
```

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with Ethereal Email first to isolate configuration issues
4. Ensure your email service allows SMTP access

---

**Last Updated:** January 3, 2026
