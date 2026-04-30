# Resend Setup Guide

Quick guide to get email working in CampusOne via [Resend](https://resend.com).

---

## 1. Create a Resend account

1. Go to https://resend.com and sign up (free tier: 3,000 emails/month, 100/day)
2. Verify your account email

## 2. Get your API key

1. Dashboard → **API Keys** → **Create API Key**
2. Name: `CampusOne Dev` (or `CampusOne Prod`)
3. Permission: **Full access** (or `Sending access` only)
4. Copy the key (starts with `re_…`) — you'll only see it once

## 3. Add the key to `.env`

Open `campusone-backend/.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=CampusOne <onboarding@resend.dev>
RESEND_FROM_ANNOUNCEMENT=CampusOne Announcement <onboarding@resend.dev>
```

> **Note:** `onboarding@resend.dev` is Resend's default test sender. It works without domain verification but **only sends to the email address you signed up with**. To send to any address, you must verify a domain (step 4).

## 4. Verify your sending domain (required for production)

1. Dashboard → **Domains** → **Add Domain**
2. Enter your domain (e.g. `campusone.edu` or a subdomain like `mail.campusone.edu`)
3. Resend shows you DNS records to add:
   - **MX** record (for replies)
   - **TXT** record for SPF
   - 2× **TXT** records for DKIM
   - Optional: **TXT** for DMARC
4. Add these records in your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.)
5. Click **Verify** in Resend — propagation usually takes 5–15 min
6. Once verified, update `.env`:

```env
RESEND_FROM=CampusOne <noreply@campusone.edu>
RESEND_FROM_ANNOUNCEMENT=CampusOne Announcements <announcements@campusone.edu>
```

## 5. Test it

Start the backend:

```bash
cd campusone-backend
npm run dev
```

Trigger any flow that sends an email (login with 2FA email OTP, submit an admission application, send an announcement). Check the Resend dashboard → **Logs** to see delivery status.

---

## Rate limits

Resend's free tier enforces **2 requests per second**. Sending announcements to many users at once will hit this and return `429 rate_limit_exceeded` for the excess emails.

**How CampusOne handles it:** announcement emails are sent sequentially with a 550 ms delay between each — so bulk sends always stay under the limit. Individual emails (OTP, 2FA, admission) are sent one at a time and are unaffected.

**To increase the rate limit:**
1. Log in to [resend.com](https://resend.com) → **Settings** → **Rate Limits**
2. Click **Request Increase** and describe your use case
3. Resend typically approves increases within 1–2 business days at no extra cost on free tier
4. Alternatively, upgrade to a paid plan (Pro: 50,000 emails/month, higher rate limits)

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Email send skipped: RESEND_API_KEY is not set` | Add `RESEND_API_KEY` to `.env` and restart `npm run dev` |
| `403 You can only send testing emails to your own email address` | You're using `onboarding@resend.dev` — verify a domain first |
| `429 rate_limit_exceeded` on bulk sends | Already handled by 550 ms throttle; for faster sends request a rate limit increase (see above) |
| `Domain not verified` | DNS records not propagated yet; wait 15 min and re-check |
| Email lands in spam | Add DMARC record + warm up the domain (start with low volume) |

---

## How it's wired in code

`services/emailService.js` exports 7 functions:

- `sendOTPEmail`
- `send2FAEnabledEmail`
- `sendAdmissionApplicationConfirmationEmail`
- `sendApplicationUnderReviewEmail`
- `sendApplicationAcceptanceEmail`
- `sendApplicationRejectionEmail`
- `sendAnnouncementEmail`

All call an internal `sendEmail()` helper that wraps `resend.emails.send()`. Function signatures are unchanged from the Nodemailer version — controllers don't need to change.

---

## Useful links

- Resend dashboard: https://resend.com/overview
- API logs: https://resend.com/logs
- Pricing: https://resend.com/pricing
- Node SDK docs: https://resend.com/docs/send-with-nodejs
