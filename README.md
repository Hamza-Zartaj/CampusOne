# CampusOne - Campus Management System

A university Learning Management System (LMS) built with Node.js, React, and PostgreSQL. Supports multi-role access (Super Admin, Admin, Teacher, Student), JWT + 2FA authentication, admission management, announcements, and scaffolded portals for assignments, attendance, quizzes, and Q&A.

---

## Tech Stack

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| **Express** | 5.x | REST API framework |
| **Prisma** | 7.x | ORM for PostgreSQL |
| **@prisma/adapter-pg** | 7.x | pg driver adapter |
| **bcryptjs** | 3.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT authentication |
| **nodemailer** | 8.x | Email notifications |
| **multer** | 2.x | File upload handling |
| **xlsx** | 0.18.x | Excel import/export |
| **speakeasy** | 2.x | 2FA TOTP generation |
| **qrcode** | 1.x | QR code for 2FA setup |
| **uuid** | 14.x | Unique ID generation |
| **nodemon** | 3.x | Dev auto-reload |

### Database
| Service | Details |
|---------|---------|
| **PostgreSQL** | Hosted on Supabase |
| **Connection Pooling** | PgBouncer via port 6543 (`DATABASE_URL`) |
| **Direct Connection** | Port 5432 (`DIRECT_URL`) for migrations |

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| **React** | 19.x | UI framework |
| **Vite** | 7.x | Build tool & dev server |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Axios** | 1.x | HTTP API calls |
| **React Router DOM** | 7.x | Client-side routing |
| **react-hot-toast** | 2.x | Toast notifications |
| **lucide-react** | 0.x | Icon library |

---

## What is Built

### Fully Working (API-Connected)
- **Authentication** — Login, JWT, 2FA (TOTP + Email OTP), trusted devices, password reset, first-time setup
- **User Management** — Admin CRUD for all user roles, bulk Excel upload, account locking/unlocking
- **Admission Management** — Multi-step application form, admin review, status updates, email notifications
- **Announcement System** — Admin broadcasts (with email), role-targeted announcements
- **Profile** — View and edit user profile

### UI Scaffolded (Mock Data — Backend Pending)
- Teacher portal: Attendance, Assignments, Quizzes, Q&A, Notifications
- Student portal: Attendance, Assignments, Quizzes, Q&A, Notifications
- Admin Reports page

---

## Project Structure

```
campusone-backend/
├── controllers/       # Business logic
│   ├── authController.js
│   ├── userController.js
│   ├── teacherController.js
│   ├── announcementController.js
│   └── admissionController.js
├── routes/            # API endpoints
├── middleware/        # auth, upload, validation, inchargeAuth
├── services/          # emailService, auditLogger
├── prisma/
│   ├── schema.prisma  # 9 PostgreSQL models
│   └── client.js      # Prisma singleton
├── scripts/
│   └── createSuperAdmin.js
└── server.js

campusone-frontend/
└── src/
    ├── App.jsx           # All routes
    ├── utils/api.js      # API service layer
    ├── components/       # DashboardLayout, Sidebar, Header
    └── pages/
        ├── auth/         # Login, 2FA, password reset
        ├── admin/        # UserManagement, Admissions, Announcements, Reports
        ├── teacher/      # Dashboard, Attendance, Assignments, Quizzes, Q&A, Notifications
        ├── student/      # Dashboard, Attendance, Assignments, Quizzes, Q&A, Notifications
        ├── AdmissionApplication/  # 7-step public form
        ├── Dashboard.jsx
        ├── Profile.jsx
        └── Landing.jsx
```

---

## Quick Start

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
cd campusone-backend
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

## Environment Variables (campusone-backend/.env)

```
DATABASE_URL=postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@...pooler.supabase.com:5432/postgres
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

## Key Features

- Multi-role access control (Super Admin, Admin, Teacher, Student)
- JWT + 2FA authentication (Authenticator App & Email OTP)
- Trusted device management
- Admission management with email workflows
- Announcement broadcasting with email delivery
- Bulk data import/export (Excel)
- File uploads (multer)
- Audit logging (Prisma-based)
- Responsive UI with Tailwind CSS v4

---

## Pending Features

| Feature | Status |
|---------|--------|
| Assignment Management | Not started |
| Attendance System | Not started |
| Quiz Management | Not started |
| Q&A Forum | Not started |
| Push Notifications | Not started |
| AI (plagiarism, summarization) | Not started |
| TA Eligibility | Not started |
| Real Reports & Analytics | Not started |

See [PROGRESS.md](./PROGRESS.md) for full details and [ToDoList.md](./ToDoList.md) for task tracking.

---

**Last Updated:** April 28, 2026  
**Database:** PostgreSQL (Supabase) via Prisma 7  
**Overall Progress:** ~40%
