# CampusOne

A modern university Learning & Campus Management System built with Node.js, React, and PostgreSQL. Provides role-based dashboards for **Admins, Teachers, TAs, and Students** with course management, assignments, attendance, quizzes, announcements, Q&A, and admission workflows.

---

## Tech Stack

**Backend:** Node.js · Express 5 · Prisma 7 · PostgreSQL (Supabase)
**Frontend:** React 19 · Vite 7 · Tailwind CSS 4 · React Router DOM 7
**Auth:** JWT + MFA (TOTP authenticator + Email OTP)
**File Storage:** Supabase Storage
**Email:** Resend

---

## Quick Start

### Prerequisites
- Node.js 20+
- A Supabase project (PostgreSQL connection strings)

### Backend
```bash
cd campusone-backend
npm install
npx prisma generate
npm run dev
# Runs on http://localhost:5000
```

### Create Super Admin (first time only)
```bash
node scripts/createSuperAdmin.js
```

### Frontend
```bash
cd campusone-frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

Create `campusone-backend/.env`:

```
PORT=5000
DATABASE_URL=postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@...pooler.supabase.com:5432/postgres
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=1h
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Resend (email provider) — see RESEND_SETUP.md
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=CampusOne <onboarding@resend.dev>
RESEND_FROM_ANNOUNCEMENT=CampusOne Announcement <onboarding@resend.dev>

SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Create `campusone-frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

---

## Project Structure

```
CampusOne/
├── campusone-backend/      Express + Prisma API
│   ├── controllers/        Business logic
│   ├── routes/             API endpoints
│   ├── middleware/         Auth, validation, uploads
│   ├── services/           Email service
│   ├── utils/              Audit logger, Supabase storage helpers
│   ├── prisma/             Schema + Prisma client
│   └── scripts/            Super admin creator
└── campusone-frontend/     React + Vite client
    └── src/
        ├── pages/          Role-based pages (admin, teacher, student)
        ├── components/     Layout, sidebar, header
        └── utils/api.js    Axios API service layer
```

---

## Documentation

See [Project_context.md](./Project_context.md) for the verified feature inventory, architecture, audit status, and future work. It is the project's canonical tracker and source of truth.
