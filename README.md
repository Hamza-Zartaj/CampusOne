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

Copy `campusone-backend/.env.example` to `campusone-backend/.env` and fill in local credentials:

```
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=1h
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Resend (email provider) — see RESEND_SETUP.md
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM=CampusOne <noreply@example.com>
RESEND_FROM_ANNOUNCEMENT=CampusOne Announcement <announcements@example.com>

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=sk-your_openai_api_key
```

Copy `campusone-frontend/.env.example` to `campusone-frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
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
