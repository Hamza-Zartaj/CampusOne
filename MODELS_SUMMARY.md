# CampusOne - Database Models Summary

Complete documentation of all 24 MongoDB schemas with their purposes, key fields, and relationships.

---

## 📋 Models by Category

## 👥 User Management Models (5 models)

### 1. **User**
Base authentication model for all system users.
- **Purpose**: Core authentication & account management
- **Key Fields**: 
  - `name`, `username`, `email` (unique)
  - `password` (hashed with bcrypt)
  - `role` (student, teacher, ta, admin)
  - `profilePicture`
  - **Security**: `accountLocked`, `failedLoginAttempts`, `accountLockedUntil`
  - **2FA**: `twoFactorSecret`, `twoFactorEnabled`, `twoFactorMethod` (authenticator/email)
  - `emailOTP` with expiration
  - `isActive`

### 2. **Student**
Student-specific profile extending User.
- **Purpose**: Track student academic information
- **Key Fields**:
  - `userId` (ref: User), `studentId` (unique), `enrollmentYear`
  - `department`, `batch`, `currentSemester` (1-8)
  - `enrolledCourses` (array with status: active/completed/dropped)
  - `completedCourses` (with grades: A+, A-, B+, etc. and GPA)
  - `cgpa` (cumulative), `totalCredits`
  - `phone`, `address`, `emergencyContact`

### 3. **Teacher**
Teacher/Faculty profile extending User.
- **Purpose**: Manage faculty information & course assignments
- **Key Fields**:
  - `userId` (ref: User), `employeeId` (unique)
  - `department`, `designation` (Professor/Assistant Professor/Lecturer)
  - `qualification`, `specialization` (array)
  - `officeRoom`, `officeHours`, `phone`, `extensionNumber`
  - `researchInterests` (array)
  - `teachingCourses` (array with courseId, semester, year)

### 4. **Admin**
Administrator profile with role-based permissions.
- **Purpose**: Manage system administration & permissions
- **Key Fields**:
  - `userId` (ref: User), `employeeId` (unique)
  - `department`, `designation` (System Admin/Academic Officer/HOD/Dean/Super Admin)
  - `isSuperAdmin` (boolean for super admin flag)
  - `permissions` (array of specific permissions):
    - manage_users, manage_courses, manage_assignments
    - manage_attendance, manage_announcements, view_reports
    - system_config, manage_ta_eligibility, manage_quiz
  - `phone`, `officeRoom`

### 5. **TA**
Teaching Assistant assignment model.
- **Purpose**: Track TA assignments & responsibilities
- **Key Fields**:
  - `userId` (ref: User), `studentId` (ref: Student)
  - `assignedCourses` (array with courseId, teacherId, responsibilities, hoursPerWeek)
  - `responsibilities`: Grading, Lab Sessions, Office Hours, Tutorial, Assignment Help
  - `totalHoursCompleted` (number)
  - `performanceRating` (1-5)
  - `status` (active/inactive)

---

## 🏫 Academic Structure Models (4 models)

### 6. **Department**
Top-level organizational unit.
- **Purpose**: Organize institution by departments
- **Key Fields**:
  - `departmentCode` (unique, uppercase)
  - `name`, `description`
  - `headOfDepartment` (ref: Teacher)
  - `isActive`, `isDeleted` (soft delete)
  - **Soft Delete**: `deletedAt`, `deletedBy` (ref: User)

### 7. **Program**
Degree programs within departments.
- **Purpose**: Define degree structure and curriculum
- **Key Fields**:
  - `programCode` (unique, uppercase e.g., "BSCS"), `name`, `description`
  - `department` (ref: Department)
  - `type` (Certificate/Diploma/Associate/Bachelor/Master/Doctorate/PostDoc)
  - `durationYears`, `totalSemesters`, `totalCredits`
  - `eligibilityCriteria`
  - **Curriculum** (embedded array with semester structure):
    - `semesterNumber`, `semesterName` (e.g., "Fall Year 1")
    - `requiredCourses` (array with courseId, isCompulsory)
    - `electiveSlots` (array with slotName, domain, category, minCredits, maxCredits, allowedCourses)
    - `minCredits`, `maxCredits` for the semester
    - `notes`

### 8. **Course**
Individual course units.
- **Purpose**: Store course definitions & metadata
- **Key Fields**:
  - `courseCode` (unique, uppercase), `courseName`, `description`
  - `department` (ref: Department), `program` (ref: Program)
  - `creditHours` (1-6), `courseType` (core/elective/lab/project/internship/thesis)
  - `prerequisites` (array of ref: Course)
  - `isActive`, `isDeleted` (soft delete)
  - **Indexes**: department, program, courseType, isDeleted

### 9. **CourseOffering**
Actual instance of a Course being taught.
- **Purpose**: Link course to specific teacher, section, schedule, semester
- **Key Fields**:
  - `course` (ref: Course), `program` (ref: Program)
  - `academicYear` (format: "2025-2026"), `semesterNumber` (1-3), `semesterName`
  - `section` (uppercase, e.g., "A" or "B")
  - `teacher` (ref: Teacher), `tas` (array ref: TA)
  - `maxCapacity`, `currentEnrollment`
  - **Schedule** (array):
    - `day` (Monday-Sunday), `startTime`, `endTime`, `room`
    - `type` (lecture/lab/tutorial)
  - **Materials** (array with title, type, fileUrl, uploadedBy, uploadedAt, description)

---

## 📚 Academic Activity Models (5 models)

### 10. **Enrollment**
Student enrollment in course offerings.
- **Purpose**: Track student enrollments and grades
- **Key Fields**:
  - `student` (ref: Student), `courseOffering` (ref: CourseOffering)
  - `program` (ref: Program), `academicYear`, `semesterNumber`
  - `enrolledAt` (default: Date.now)
  - `status` (enrolled/active/completed/dropped/withdrawn/failed/incomplete/waitlisted)
  - `enrollmentType` (regular/audit/credit/remedial/repeat)
  - **Waitlist**: `waitlistPosition`, `waitlistAddedAt`, `promotedFromWaitlistAt`
  - **Grades**:
    - `midtermMarks`, `finalMarks`, `assignmentMarks`, `quizMarks`, `labMarks` (0-100)
    - `totalMarks`, `obtainedMarks`, `percentage`
    - `grade` (A+, A, A-, B+, etc.), `gpa` (0-4)
    - `gradingStatus` (pending/pending_approval/graded)

### 11. **Assignment**
Course assignments created by teachers.
- **Purpose**: Manage assignment definitions
- **Key Fields**:
  - `courseId` (ref: Course), `title`, `description`
  - `dueDate` (required), `totalMarks`
  - `lateSubmissionAllowed` (boolean)
  - `fileUrl` (assignment file if any)
  - `createdBy` (ref: User)
  - **Indexes**: courseId, dueDate for fast queries

### 12. **Submission**
Student submissions for assignments.
- **Purpose**: Track assignment submissions and grading
- **Key Fields**:
  - `assignmentId` (ref: Assignment), `studentId` (ref: Student)
  - `fileUrl` (submission file), `submittedAt` (default: Date.now)
  - `isLate` (boolean), `marksObtained`, `feedback`
  - **Plagiarism**:
    - `similarityScore` (0-100), `similarityStatus` (pending/acceptable/suspicious)
  - **Grading**: `gradedBy` (ref: User), `gradedAt`
  - **Unique Index**: assignmentId + studentId (one submission per student per assignment)

### 13. **Attendance**
Class attendance records.
- **Purpose**: Track student attendance per class
- **Key Fields**:
  - `courseId` (ref: Course), `date` (required)
  - **Records** (array):
    - `studentId` (ref: Student), `status` (present/absent/late)
  - `markedBy` (ref: User)
  - **Unique Index**: courseId + date (one record per course per date)

### 14. **Announcement**
System-wide announcements.
- **Purpose**: Communicate important information
- **Key Fields**:
  - `courseId` (ref: Course, optional for general announcements)
  - `title`, `content` (required)
  - `priority` (low/medium/high)
  - `createdBy` (ref: User)
  - `targetAudience` (all/students/teachers/specific_course)
  - **Indexes**: courseId, createdAt (descending)

---

## 🎓 Advanced Learning Models (3 models)

### 15. **Quiz**
Quiz/exam definitions with questions.
- **Purpose**: Create and manage quizzes
- **Key Fields**:
  - `courseId` (ref: Course), `title`, `description`
  - `difficulty` (easy/medium/hard)
  - `duration` (minutes, required), `startTime`, `endTime`
  - `totalMarks`, `passingMarks`
  - **Questions** (array):
    - `questionText`, `questionType` (mcq/true-false/short-answer)
    - `options` (array of strings), `correctAnswer` (string or array)
    - `marks`, `difficulty`
  - **Proctoring**:
    - `allowTabSwitch`, `requireCamera`, `requireScreenShare`
    - `showCorrectAnswers` (after submission)

### 16. **QuizAttempt**
Student quiz attempts with proctoring.
- **Purpose**: Track quiz attempts and answers
- **Key Fields**:
  - `quizId` (ref: Quiz), `studentId` (ref: Student)
  - **Answers** (array):
    - `questionId`, `answer`, `isCorrect`, `marksObtained`
  - `startedAt`, `submittedAt`, `totalMarksObtained`
  - `status` (in-progress/completed/terminated)
  - `terminationReason` (tab-switch/time-up/manual/violation)
  - `tabSwitchCount`
  - **Proctoring**:
    - `cameraEnabled`, `screenShareEnabled`
    - `violations` (array with type, timestamp, description):
      - Types: tab-switch, camera-off, screen-share-off, multiple-faces, no-face

### 17. **QNA**
Q&A forum for course discussions.
- **Purpose**: Enable student-teacher interaction
- **Key Fields**:
  - `courseId` (ref: Course), `askedBy` (ref: User)
  - `question` (required, min 10 chars), `description`
  - `tags` (array of strings, lowercase)
  - **Attachments** (array): fileName, fileUrl, fileType
  - **Answers** (array):
    - `answeredBy` (ref: User), `answer` (required)
    - `attachments` (array), `isAccepted` (boolean)
    - `upvotes`, `downvotes` (array of user refs)
    - `answeredAt`

---

## 🎯 Administrative & System Models (4 models)

### 18. **SemesterIncharge**
Semester coordinators/managers.
- **Purpose**: Manage semester-level operations
- **Key Fields**:
  - `teacher` (ref: Teacher), `program` (ref: Program), `department` (ref: Department)
  - `academicYear`, `semesterNumber`, `batch`
  - `responsibilities` (array of strings)
  - `startDate`, `endDate`, `status` (active/completed/relieved)
  - `remarks`, `appointedBy` (ref: User), `appointedAt`
  - **Soft Delete**: `isDeleted`, `deletedAt`, `deletedBy`

### 19. **TAEligibility**
TA eligibility tracking.
- **Purpose**: Determine who can become TA
- **Key Fields**:
  - `studentId` (ref: Student), `teacherId` (ref: Teacher)
  - **completedCourses** (array):
    - `courseId`, `semester`, `grade`, `completedAt`
  - `currentSemester`, `eligibleForSemesters` (array)
  - `isApproved` (boolean), `approvedBy` (ref: User)

### 20. **AuditLog**
Comprehensive system activity logging.
- **Purpose**: Track all critical actions for compliance
- **Key Fields**:
  - `action` (enum): Incharge, Grade, Enrollment, Import, System actions
  - `category` (INCHARGE/GRADE/ENROLLMENT/IMPORT/SYSTEM)
  - `performedBy` (ref: User), `performedByRole`
  - `targetModel` (SemesterIncharge/Enrollment/CourseOffering/Course/Program/Student/Teacher)
  - `targetId`
  - **relatedEntities** (array with model, id, identifier)
  - `previousValue`, `newValue` (mixed types)
  - `academicYear`, `semester`, `description`, `remarks`

### 21. **Notification**
User notifications for various events.
- **Purpose**: Notify users of important events
- **Key Fields**:
  - `userId` (ref: User)
  - `type` (announcement/deadline/grade/general)
  - `title`, `message` (required)
  - `isRead` (boolean, default: false)
  - `relatedId` (optional, links to related entity)
  - **Indexes**: userId + isRead, createdAt (descending)

### 22. **Summary**
AI-generated content summaries.
- **Purpose**: Store summarized course materials
- **Key Fields**:
  - `courseId` (ref: Course), `originalFileUrl`
  - `summaryText` (generated summary)
  - `generatedBy` (ref: User)
  - **Indexes**: courseId, generatedBy

---

## 🎫 Admission Management Models (2 models)

### 23. **AdmissionApplication**
Student admission application forms.
- **Purpose**: Track admission applications
- **Key Fields**:
  - **Personal Info**:
    - `fullName`, `email`, `phone`, `cnic`, `dateOfBirth`, `gender`
    - `cnicFront`, `cnicBack` (image URLs)
  - **Guardian Info** (optional):
    - `relation`, `name`, `phone`, `cnic`, `cnicUpload`
  - **Address**:
    - `street`, `city`, `state`, `country`, `zipCode`, `nationality`
  - **Education**:
    - `previousEducation` (school/college name & grades)
    - `results` (array with subject, obtainedMarks, totalMarks, grade)
  - **Program Selection**: `preferredPrograms` (array of program refs)
  - **Status**: `applicationStatus` (submitted/under_review/shortlisted/rejected/waitlisted)
  - **Details**: `applicationNumber` (unique), `applicationDate`, `documents`, `remarks`

### 24. **AdmissionSettings**
Admission system configuration.
- **Purpose**: Control admission process settings
- **Key Fields**:
  - `isOpen` (boolean), `startDate`, `endDate`
  - `applicationFormFields` (array of field names to display)
  - `instructions` (textarea for applicants)
  - `maxApplications` (null = unlimited)
  - `requiresDocuments`, `requiredDocuments` (array)
  - `notificationEmails` (array)
  - **Methods**:
    - `getSettings()` - Retrieve (or create if missing)
    - `isCurrentlyOpen()` - Check if admissions are active

---

## 🔗 Model Relationships

```
User (base)
├── Student (userId)
│   ├── Enrollment (student)
│   │   └── CourseOffering (courseOffering)
│   │       ├── Course (course)
│   │       │   ├── Assignment (courseId)
│   │       │   │   └── Submission (assignmentId/studentId)
│   │       │   ├── Quiz (courseId)
│   │       │   │   └── QuizAttempt (quizId/studentId)
│   │       │   ├── Attendance (courseId)
│   │       │   ├── Announcement (courseId)
│   │       │   └── QNA (courseId)
│   │       ├── Course → Department
│   │       └── Program
│   │           ├── Department
│   │           └── Curriculum (embedded)
│   └── TA (studentId)
│       └── TAEligibility (studentId)
├── Teacher (userId)
│   ├── CourseOffering (teacher)
│   └── SemesterIncharge (teacher)
└── Admin (userId)
    └── permissions (array)

Department
├── Program
└── Course

SemesterIncharge
├── Teacher
├── Program
└── Department

AuditLog
├── performedBy (User)
└── relatedEntities (various models)

Notification → User
AdmissionApplication → Program (preferredPrograms)
AdmissionSettings (singleton)
```

---

## 📊 Quick Stats

| Category | Count | Purpose |
|----------|-------|---------|
| User Management | 5 | User roles and profiles |
| Academic Structure | 4 | Departments, programs, courses |
| Academic Activity | 5 | Enrollments, assignments, attendance |
| Advanced Learning | 3 | Quizzes and Q&A |
| Administrative | 4 | Logging, notifications, configs |
| Admission | 2 | Application tracking |
| **Total** | **24** | Complete campus system |

---

## 🔐 Security Features

✅ **Soft Deletes**: Department, Course, SemesterIncharge  
✅ **Password Hashing**: User model with bcrypt  
✅ **2FA Support**: Email OTP & TOTP authenticator  
✅ **Account Lockout**: After failed login attempts  
✅ **Audit Logging**: AuditLog model for compliance  
✅ **Role-Based Access**: Admin permissions system  
✅ **Unique Indexes**: Prevent duplicate records (studentId, userId, courseCode, etc.)

---

**Last Updated**: February 16, 2026  
**Total Models**: 24  
**Database**: MongoDB with Mongoose ODM
