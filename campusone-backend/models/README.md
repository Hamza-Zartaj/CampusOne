# CampusOne Database Models

This directory contains all MongoDB schema definitions for the CampusOne LMS.

## Database Architecture

The database follows a **role-based architecture** with separation of concerns:

### Core Models
- **User** - Base authentication model (login, 2FA, role)
- **Student** - Student-specific data (enrollment, GPA, courses)
- **Teacher** - Teacher-specific data (employee ID, teaching courses)
- **TA** - Teaching Assistant data (assigned courses, responsibilities)
- **Admin** - Administrator data (permissions, access control)

### Academic Models
- **Course** - Course information (code, name, materials)
- **Assignment** - Assignment details (due date, marks)
- **Submission** - Student assignment submissions (files, grades)
- **Attendance** - Class attendance records
- **Quiz** - Quiz/exam details (questions, proctoring)
- **QuizAttempt** - Student quiz attempts and scores

### Communication Models
- **Announcement** - Course and general announcements
- **Notification** - User notifications (deadlines, grades)
- **QNA** - Question & Answer forum for courses

### Additional Models
- **Summary** - AI-generated content summaries
- **TAEligibility** - TA eligibility tracking and approval

## Model Relationships

### User → Role Models (One-to-One)
```
User (1) ──── (1) Student
User (1) ──── (1) Teacher
User (1) ──── (1) TA
User (1) ──── (1) Admin
```

### Course Relationships
```
Course (1) ──── (Many) Students
Course (1) ──── (Many) TAs
Course (1) ──── (1) Teacher
Course (1) ──── (Many) Assignments
Course (1) ──── (Many) Quizzes
Course (1) ──── (Many) QNA
```

### Assignment & Submission
```
Assignment (1) ──── (Many) Submissions
Submission (1) ──── (1) Student
```

## Usage Examples

### Import Models (ES6 Syntax)
```javascript
// Import individual models
import User from './models/User.js';
import Student from './models/Student.js';
import Course from './models/Course.js';

// Or import all from index
import { User, Student, Course } from './models/index.js';
```

### Query with Population
```javascript
// Get student with user info
const student = await Student.findById(studentId).populate('userId');
console.log(student.userId.email); // Access user email

// Get course with teacher and TAs
const course = await Course.findById(courseId)
  .populate({
    path: 'teacher',
    populate: { path: 'userId' }
  })
  .populate({
    path: 'tas',
    populate: { path: 'userId' }
  });

console.log(course.teacher.userId.name); // Teacher name
```

### Create User with Role
```javascript
// Step 1: Create User
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashedpassword',
  role: 'student'
});

// Step 2: Create Student profile
const student = await Student.create({
  userId: user._id,
  enrollmentNumber: 'CS-2021-001',
  department: 'Computer Science',
  currentSemester: 3
});
```

## Key Features

### User Model
- ✅ Bcrypt password hashing (automatic)
- ✅ Password comparison method
- ✅ Account locking mechanism
- ✅ 2FA support with trusted devices
- ✅ Failed login attempt tracking

### Submission Model
- ✅ Similarity score tracking
- ✅ Late submission detection
- ✅ Unique submission per student per assignment

### Quiz & QuizAttempt
- ✅ Proctoring support (camera, screen share)
- ✅ Tab switch tracking
- ✅ Violation logging
- ✅ Multiple question types (MCQ, true/false, short-answer)

### QNA Model
- ✅ Voting system (upvotes/downvotes)
- ✅ Accepted answer marking
- ✅ File attachments support
- ✅ Tags for categorization
- ✅ Pinning important questions

## Indexes

All models have appropriate indexes for query optimization:
- Email indexes on User
- Enrollment number index on Student
- Employee ID indexes on Teacher/Admin
- Course and date indexes for quick lookups
- Compound indexes for unique constraints

## Timestamps

All models include automatic timestamps:
- `createdAt` - When record was created
- `updatedAt` - When record was last modified

## Environment

Make sure MongoDB connection is configured in `.env`:
```
MONGODB_URI=mongodb://localhost:27017/campusone_db
```

## Testing Models

Run the test file to verify all models load:
```bash
node models/index.js
```

## Phase 2 Status: ✅ Complete

All 16 database schemas have been implemented and tested.
