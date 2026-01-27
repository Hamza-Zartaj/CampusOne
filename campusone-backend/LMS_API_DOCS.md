# University LMS Backend API Documentation

## Overview

This is the backend architecture for a University Learning Management System (LMS) built with Node.js, Express, and MongoDB (Mongoose).

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## User Roles & Permissions

| Role | Level | Permissions |
|------|-------|-------------|
| SuperAdmin | 5 | Full system access, delete operations |
| Admin | 4 | CRUD on most resources |
| Teacher | 3 | Manage assigned courses, grades |
| TA | 2 | Assist with assigned courses |
| Student | 1 | View and enroll in courses |

---

## API Endpoints

### Programs (`/api/programs`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All authenticated | Get all programs |
| GET | `/:id` | All authenticated | Get single program |
| GET | `/:id/curriculum` | All authenticated | Get program curriculum structure |
| POST | `/` | Admin, SuperAdmin | Create new program |
| PUT | `/:id` | Admin, SuperAdmin | Update program |
| DELETE | `/:id` | SuperAdmin | Delete program |

**Create Program Request:**
```json
{
  "name": "Bachelor of Science in Computer Science",
  "code": "BSCS",
  "description": "4-year undergraduate program",
  "programType": "bachelor",
  "totalSemesters": 8,
  "coreSemestersCount": 4,
  "department": "Computer Science",
  "totalCreditHours": 130,
  "minimumCGPA": 2.0
}
```

---

### Course Catalog (`/api/courses`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All authenticated | Get all courses |
| GET | `/:id` | All authenticated | Get single course |
| POST | `/` | Admin, SuperAdmin | Create new course |
| PUT | `/:id` | Admin, SuperAdmin | Update course |
| DELETE | `/:id` | SuperAdmin | Delete course |

**Create Course Request:**
```json
{
  "courseCode": "CS101",
  "courseName": "Introduction to Programming",
  "description": "Fundamentals of programming",
  "creditHours": 3,
  "theoryHours": 2,
  "labHours": 2,
  "prerequisites": ["<course_id>"],
  "department": "Computer Science"
}
```

---

### Curriculum (`/api/curriculum`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All authenticated | Get curriculum entries |
| POST | `/` | Admin, SuperAdmin | Add course to program curriculum |
| POST | `/bulk` | Admin, SuperAdmin | Bulk add courses to curriculum |
| PUT | `/:id` | Admin, SuperAdmin | Update curriculum entry |
| DELETE | `/:id` | Admin, SuperAdmin | Remove from curriculum |

**Add to Curriculum Request:**
```json
{
  "programId": "<program_id>",
  "courseId": "<course_id>",
  "semesterNumber": 1,
  "isElective": false,
  "electiveGroup": null,
  "isMandatory": true
}
```

---

### Academic Terms (`/api/academic-terms`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All authenticated | Get all academic terms |
| GET | `/current` | All authenticated | Get current active term |
| GET | `/:id` | All authenticated | Get single term |
| POST | `/` | Admin, SuperAdmin | Create new term |
| PUT | `/:id` | Admin, SuperAdmin | Update term |
| PUT | `/:id/set-current` | Admin, SuperAdmin | Set as current term |
| DELETE | `/:id` | SuperAdmin | Delete term |

**Create Academic Term Request:**
```json
{
  "termType": "fall",
  "year": 2025,
  "startDate": "2025-09-01",
  "endDate": "2025-12-20",
  "registrationStartDate": "2025-08-15",
  "registrationEndDate": "2025-08-31",
  "addDropDeadline": "2025-09-15",
  "withdrawalDeadline": "2025-11-15",
  "isCurrent": false
}
```

---

### Course Offerings (`/api/course-offerings`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All authenticated | Get all offerings |
| GET | `/:id` | All authenticated | Get single offering |
| GET | `/teacher/:teacherId` | Teacher, Admin | Get teacher's assigned courses |
| POST | `/` | Admin, SuperAdmin | Create new offering |
| PUT | `/:id` | Admin, SuperAdmin, Teacher (schedule only) | Update offering |
| PUT | `/:id/assign-tas` | Admin, SuperAdmin | Assign TAs to offering |
| DELETE | `/:id` | Admin, SuperAdmin | Delete offering |

**Create Course Offering Request:**
```json
{
  "courseId": "<course_catalog_id>",
  "academicTermId": "<academic_term_id>",
  "programId": "<program_id>",
  "section": "A",
  "assignedTeacher": "<teacher_user_id>",
  "assignedTAs": ["<ta_user_id>"],
  "maxCapacity": 50,
  "schedule": {
    "days": ["monday", "wednesday"],
    "startTime": "09:00",
    "endTime": "10:30",
    "room": "Room 101"
  },
  "isSummerRepeat": false
}
```

---

### Enrollments (`/api/enrollments`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Admin, SuperAdmin | Get all enrollments |
| GET | `/student/:studentId` | Student (own), Admin | Get student's all enrollments |
| GET | `/student/:studentId/current` | Student (own), Admin | Get student's current semester courses |
| GET | `/offering/:offeringId` | Teacher, Admin | Get course offering enrollments |
| POST | `/` | Admin, SuperAdmin | Enroll student |
| PUT | `/:id` | Admin, SuperAdmin | Update enrollment status |
| PUT | `/:id/withdraw` | Student (own), Admin | Withdraw from course |
| DELETE | `/:id` | Admin, SuperAdmin | Delete enrollment |

**Enroll Student Request:**
```json
{
  "studentId": "<student_user_id>",
  "courseOfferingId": "<course_offering_id>",
  "isRepeat": false,
  "previousEnrollmentId": null
}
```

**Business Rules:**
- Summer term: Only for failed/repeat courses
- Core semesters (1-4): Only core courses allowed
- Elective semesters (5-8): Core + elective courses allowed
- Duplicate enrollments prevented

---

### Grades (`/api/grades`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Admin, SuperAdmin | Get all grades |
| GET | `/student/:studentId` | Student (own), Admin | Get student's grades with CGPA |
| GET | `/enrollment/:enrollmentId` | Student, Teacher, Admin | Get grade by enrollment |
| GET | `/offering/:offeringId` | Teacher, Admin | Get offering grades |
| POST | `/` | Teacher, Admin | Create/update grade |
| PUT | `/:id` | Teacher, Admin | Update grade |
| PUT | `/:id/finalize` | Teacher, Admin | Finalize grade |
| DELETE | `/:id` | Admin, SuperAdmin | Delete grade |

**Create Grade Request:**
```json
{
  "enrollmentId": "<enrollment_id>",
  "letterGrade": "A",
  "percentage": 92,
  "components": {
    "assignments": { "obtained": 18, "total": 20, "weight": 20 },
    "quizzes": { "obtained": 13, "total": 15, "weight": 15 },
    "midterm": { "obtained": 22, "total": 25, "weight": 25 },
    "final": { "obtained": 36, "total": 40, "weight": 40 }
  },
  "remarks": "Excellent performance"
}
```

---

## Database Models

### User
Extended with:
- `programId` (for students)
- `currentSemester` (for students)
- `studentId` (unique ID for students)
- `employeeId` (unique ID for teachers)
- `role`: student | teacher | ta | admin | superadmin

### Program
- Academic programs (Bachelor's, ADP, etc.)
- Tracks total semesters and core semester count

### CourseCatalog
- Master course definitions (reusable)
- Prerequisites, credit hours, theory/lab hours

### Curriculum (ProgramCourse)
- Maps courses to programs and semesters
- Defines core vs elective courses

### AcademicTerm
- Fall, Spring, Summer terms
- Registration and deadline dates

### CourseOffering
- Specific course instances per term
- Assigned teacher and TAs
- Schedule and capacity

### Enrollment
- Student enrollments in offerings
- Status: enrolled | completed | failed | withdrawn | dropped

### Grade
- Final grades for enrollments
- Component breakdown
- CGPA calculation support

---

## Seed Data

Run the seed script to populate sample data:
```bash
node scripts/seedLMS.js
```

**Test Credentials:**
| Role | Email | Password |
|------|-------|----------|
| SuperAdmin | superadmin@campus.edu | password123 |
| Admin | admin@campus.edu | password123 |
| Teacher | john.smith@campus.edu | password123 |
| Teacher | sarah.jones@campus.edu | password123 |
| TA | mike.wilson@campus.edu | password123 |
| Student | alice.johnson@campus.edu | password123 |

---

## Running the Server

```bash
cd campusone-backend
npm install
npm run dev
```

Server runs on: `http://localhost:5000`
