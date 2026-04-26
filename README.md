# CampusOne - Campus Management System

A comprehensive campus management system for academic operations including departments, programs, courses, student/teacher portals, and more.

---

## 🏗️ Tech Stack

### **Backend**
| Library | Version | Purpose |
|---------|---------|---------|
| **Express** | 5.2.1 | REST API framework |
| **Prisma** | 7.8.0 | ORM for PostgreSQL |
| **@prisma/client** | 7.8.0 | Auto-generated type-safe DB client |
| **@prisma/adapter-pg** | 7.8.0 | pg driver adapter for Prisma |
| **pg** | latest | PostgreSQL driver |
| **bcryptjs** | 3.0.3 | Password hashing & security |
| **jsonwebtoken** | 9.0.3 | JWT authentication tokens |
| **nodemailer** | 8.0.6 | Email notifications |
| **multer** | 2.0.2 | File upload handling |
| **xlsx** | 0.18.5 | Excel import/export (bulk data) |
| **speakeasy** | 2.0.0 | 2FA TOTP generation |
| **qrcode** | 1.5.4 | QR code generation for 2FA |
| **uuid** | 14.0.0 | Unique ID generation |
| **nodemon** | 3.1.14 | Development auto-reload |

### **Database**
| Service | Details |
|---------|---------|
| **PostgreSQL** | Hosted on Supabase (ap-northeast-1) |
| **Connection Pooling** | PgBouncer via port 6543 (`DATABASE_URL`) |
| **Direct Connection** | Port 5432 (`DIRECT_URL`) for migrations |

### **Frontend**
| Library | Version | Purpose |
|---------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **Vite** | 7.2.4 | Fast build tool & dev server |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS styling |
| **Axios** | 1.13.2 | HTTP API calls |
| **React Router DOM** | 7.11.0 | Client-side routing |
| **react-hot-toast** | 2.6.0 | Toast notifications |
| **lucide-react** | 0.562.0 | Icon library |

---

## 🎯 Project Flow

```
Department → Program → Curriculum (by Semester) → Course → CourseOffering
    ↓
   Semester Incharge (manages semester)
    ↓
   Student Enrollment → Grades, Attendance, Assignments
```

**Key Entities:**
- **Department**: Top-level org unit (CS, Math, etc.)
- **Program**: Degree structure (BSc, MSc, Diploma)
- **Course**: Individual units with prerequisites
- **CourseOffering**: Actual class instance with teacher, TAs, schedule
- **Student & Teacher Portals**: Interface for academics

---

## ✅ COMPLETED

### Foundation ✅
- Project setup (Node.js, React, Vite, Tailwind)
- PostgreSQL schema design via Prisma (24 models)
- Authentication with JWT + 2FA support
- Full MongoDB → PostgreSQL/Prisma migration

### Academic Structure ✅
- Departments, Programs, Courses
- Course Offerings with scheduling
- Student Enrollment with prerequisite checking
- Semester Incharge management

### Portals ✅
- **Student Portal**: View courses, grades, enrollment, CGPA, transcript
- **Teacher Portal**: Manage students, mark attendance, upload grades
- Dashboard layouts & navigation

### Admission Management ✅
- Application forms, status tracking
- Admin review & decision workflow

### System ✅
- Bulk data import/export (Excel)
- Audit logging (Prisma-based)
- Email notifications
- Multi-role authorization middleware

---

## ⏳ PENDING (Future Development)

| Feature | Status |
|---------|--------|
| Assignment Management (create/submit/grade) | Not started |
| Attendance system & low attendance warnings | Not started |
| Quiz Management (manual/Excel/AI) | Not started |
| TA Eligibility system | Not started |
| AI features (plagiarism detection, summarization) | Not started |
| Push notifications | Not started |

---

## 📁 Project Structure

```
campusone-backend/
├── controllers/      → Business logic (14 controllers, all Prisma-based)
├── routes/          → API endpoints
├── middleware/      → Auth, incharge auth, validation, file upload
├── services/        → Email, audit logging (Prisma-based)
├── prisma/
│   ├── schema.prisma → 24 PostgreSQL models
│   └── client.js    → Prisma singleton with pg adapter
├── scripts/
│   └── createSuperAdmin.js → CLI script to seed super admin
├── prisma.config.ts → Prisma 7 config
└── server.js        → Express app entry point

campusone-frontend/
├── src/
│   ├── components/  → Reusable UI components
│   ├── pages/       → Full page components
│   │   ├── admin/   → Admin management pages
│   │   ├── student/ → Student portal
│   │   ├── teacher/ → Teacher tools
│   │   └── auth/    → Login/signup
│   ├── utils/       → API client (axios)
│   ├── styles/      → CSS variables & global styles
│   └── App.jsx      → Main app with routing
```

---

## 🚀 Quick Start

### Backend
```bash
cd campusone-backend
npm install
npx prisma generate
npm run dev
# Server runs on http://localhost:5000
```

### Create Super Admin (first time)
```bash
cd campusone-backend
node scripts/createSuperAdmin.js
```

### Frontend
```bash
cd campusone-frontend
npm install
npm run dev
# Dev server runs on http://localhost:5173
```

---

## 🔐 Environment Variables (campusone-backend/.env)

```
DATABASE_URL=postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...@...pooler.supabase.com:5432/postgres
JWT_SECRET=...
EMAIL_USER=...
EMAIL_PASS=...
```

---

## 🔐 Key Features

- Multi-role access control (Super Admin, Admin, Teacher, Student, TA)
- JWT + 2FA authentication (TOTP + email OTP)
- Course enrollment with prerequisite checking
- Bulk data import/export (Excel)
- File uploads for assignments & documents
- Email notifications
- Audit logging

---

**Last Updated**: April 27, 2026  
**Database**: PostgreSQL (Supabase) via Prisma 7
