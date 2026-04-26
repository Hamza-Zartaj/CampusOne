# CampusOne - Project To-Do List

**Stack:** Node.js + Express + PostgreSQL (Supabase) + Prisma 7 + React + Vite  
**Updated:** April 27, 2026

---

## HIGH PRIORITY - IMMEDIATE TASKS

### ✅ Database Migration (DONE)
- [x] Migrate all 14 controllers from Mongoose to Prisma
- [x] Migrate `auditLogger.js` service to Prisma
- [x] Migrate `inchargeAuth.js` middleware to Prisma
- [x] Remove all Mongoose model files
- [x] Uninstall Mongoose, install Prisma 7 + pg adapter
- [x] Update `server.js` to use Prisma connection
- [x] Update `createSuperAdmin.js` script to use Prisma
- [x] Regenerate Prisma client
- [x] Verify server starts and DB connects

### Student Portal UI (Backend APIs Ready)
- [ ] My Courses page
- [ ] Course Registration interface (with prerequisite checking)
- [ ] Weekly Timetable viewer
- [ ] My Grades dashboard
- [ ] Transcript viewer
- [ ] CGPA calculator display

### Teacher Tools UI (Backend APIs Ready)
- [ ] My Offerings dashboard
- [ ] Enrolled Students list with search/filter
- [ ] Single Student Marks Upload form
- [ ] Bulk Marks Upload (Excel import/export)
- [ ] Grade Submission interface
- [ ] Grade Distribution Statistics page

---

## ASSIGNMENT MANAGEMENT SYSTEM

### Backend
- [ ] Assignment Controller (create, update, delete, list)
- [ ] Submission Controller (submit, grade, download)
- [ ] File upload middleware with multer
- [ ] Assignment routes
- [ ] Deadline notification system

### Frontend
- [ ] Assignments list page (for course)
- [ ] Create Assignment modal (Teacher)
- [ ] Submit Assignment form (Student)
- [ ] My Submissions page (Student)
- [ ] Submissions list page (Teacher)
- [ ] Grade Submission modal (Teacher)

---

## AI FEATURES

### Plagiarism Checker
- [ ] Setup AI/similarity service
- [ ] Text extraction from PDF/DOC
- [ ] Similarity calculation
- [ ] Similarity Controller & Routes
- [ ] Frontend: Similarity checker page
- [ ] Frontend: Results display

### Content Summarization
- [ ] Setup summarization service
- [ ] Summary generation
- [ ] Summary Controller & Routes
- [ ] Frontend: Generate/View Summary

---

## ATTENDANCE SYSTEM

### Backend
- [ ] Attendance Controller (mark, get, analytics)
- [ ] Low attendance warning system

### Frontend
- [ ] Mark Attendance page (Teacher/TA)
- [ ] My Attendance page (Student)
- [ ] Attendance Analytics

---

## ANNOUNCEMENTS & NOTIFICATIONS

### Backend
- [ ] Announcement Controller
- [ ] Notification Service & Controller
- [ ] Automated triggers

### Frontend
- [ ] Announcements page
- [ ] Notification bell component
- [ ] Notifications page

---

## QUIZ MANAGEMENT

### Backend
- [ ] Quiz Controller (manual, Excel, AI)
- [ ] Quiz Attempt Controller
- [ ] Tab switch detection

### Frontend
- [ ] Create Quiz pages
- [ ] Quiz Taking interface
- [ ] Results & Attempts pages

---

## Q&A FORUM

### Backend
- [ ] QNA Controller (ask, answer, vote)
- [ ] QNA Routes

### Frontend
- [ ] QNA Tab in Course Detail
- [ ] Question Detail page
- [ ] Ask/Answer forms

---

## COURSE MATERIALS

### Backend
- [ ] Material Controller (upload, download)
- [ ] File upload with multer

### Frontend
- [ ] Materials Tab
- [ ] Upload Material modal
- [ ] Download functionality

---

## TA ELIGIBILITY

### Backend
- [ ] TA Eligibility Controller

### Frontend
- [ ] TA Application form
- [ ] Approval interface

---

## TESTING & DEPLOYMENT

- [ ] Unit tests (Jest)
- [ ] E2E tests (Cypress)
- [ ] Deployment setup
- [ ] CI/CD pipeline

---

## COMPLETED

### Setup
- Project structure, dependencies, database

### Models
- 24 MongoDB models with relationships

### Authentication
- JWT with 2FA, user management, role-based access

### Academic Structure
- Departments, Programs, Courses (Backend + UI)

### Enrollment
- Course Offerings, Enrollments, Grading (Backend + UI)

### Portals (Backend)
- Student Portal APIs (12 functions)
- Teacher Tools APIs (11 functions)

### Admission
- Settings, applications, management

---

## Purpose
CampusOne is a modern university LMS that integrates intelligent workflows, centralized course content, and AI-powered tools.
---

**For detailed technical documentation and progress tracking, see:** [PROGRESS.md](./PROGRESS.md)

---

**Good luck with development!**
