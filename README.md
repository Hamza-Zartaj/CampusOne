# CampusOne - Campus Management System

A comprehensive MERN-based campus management system for academic operations including departments, programs, courses, student/teacher portals, and more.

---

## 🏗️ Tech Stack

### **Backend**
| Library | Version | Purpose |
|---------|---------|---------|
| **Express** | 5.2.1 | REST API framework |
| **Mongoose** | 9.0.2 | MongoDB object modeling & schema |
| **bcryptjs** | 3.0.3 | Password hashing & security |
| **jsonwebtoken** | 9.0.3 | JWT authentication tokens |
| **nodemailer** | 7.0.12 | Email notifications |
| **multer** | 2.0.2 | File upload handling |
| **xlsx** | 0.18.5 | Excel import/export (bulk data) |
| **speakeasy** | 2.0.0 | 2FA TOTP generation |
| **qrcode** | 1.5.4 | QR code generation for 2FA |
| **nodemon** | 3.1.11 | Development auto-reload |

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

## ✅ COMPLETED (90% of Core Features)

### Phase 1-3: Foundation ✅ Complete
- Project setup (Node.js, React, Vite, Tailwind)
- MongoDB schema design (20+ models)
- Authentication with JWT + 2FA support

### Phase 4-5: Academic Structure ✅ Complete
- Departments, Programs, Courses
- Course Offerings with scheduling
- Student Enrollment system
- Semester Incharge management

### Phase 6: Portals ✅ 90% Complete
- **Student Portal**: View courses, grades, enrollment
- **Teacher Portal**: Manage students, mark attendance, upload grades
- Dashboard layouts & navigation

### Bonus: Admission Management ✅ Complete
- Application forms, status tracking
- Admin review & decision workflow

---

## ⏳ PENDING (Future Development)

| Phase | Features | Status |
|-------|----------|--------|
| **Phase 7** | Assignment Management | 0% |
| | • Create/submit/grade assignments | |
| | • File upload & download | |
| **Phase 8** | AI Features | 0% |
| | • Plagiarism detection | |
| | • Content summarization | |
| **Phase 9** | Attendance & Analytics | 0% |
| | • Mark attendance system | |
| | • Low attendance warnings | |
| **Phase 10** | Announcements & Notifications | 0% |
| | • System announcements | |
| | • Push notifications | |
| **Phase 11** | Quiz Management | 0% |
| | • Create quizzes (manual/Excel/AI) | |
| | • Tab switch detection | |
| **Phase 12** | TA Eligibility System | 0% |
| | • TA applications & tracking | |

---

## 📁 Project Structure

```
campusone-backend/
├── controllers/      → Business logic for each entity
├── models/          → Mongoose schemas (20+ models)
├── routes/          → API endpoints
├── middleware/      → Auth, validation, file upload
├── services/        → Email, audit logging
├── server.js        → Express app entry point

campusone-frontend/
├── src/
│   ├── components/  → Reusable UI components
│   ├── pages/       → Full page components
│   │   ├── admin/   → Admin management pages
│   │   ├── student/ → Student portal
│   │   ├── teacher/ → Teacher tools
│   │   ├── auth/    → Login/signup
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
npm run dev
# Server runs on http://localhost:5000
```

### Frontend
```bash
cd campusone-frontend
npm install
npm run dev
# Dev server runs on http://localhost:5173
```

---

## 📊 Database Models (20+)

**User Models**: User, Student, Teacher, TA, Admin  
**Academic**: Department, Program, Course, CourseOffering, Enrollment  
**Academic Activities**: Assignment, Submission, Attendance, Announcement  
**Advanced**: Quiz, QuizAttempt, QNA, Summary, TAEligibility  
**System**: Notification, AuditLog, AdmissionApplication, SemesterIncharge

---

## 🔐 Key Features

- ✅ Multi-role access control (Super Admin, Admin, Teacher, Student, TA)
- ✅ JWT + 2FA authentication
- ✅ Course enrollment with prerequisite checking
- ✅ Bulk data import/export (Excel)
- ✅ File uploads for assignments & documents
- ✅ Email notifications
- ✅ Audit logging

---

**Last Updated**: February 16, 2026  
**Overall Completion**: ~60% (Core features 90%, Advanced features 0%)
