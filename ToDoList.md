# CampusOne - University Learning Management System

## 📋 Project Overview

**Project Name:** CampusOne  
**Domain:** Web Development  
**Framework:** MERN Stack (MongoDB, Express.js, React.js, Node.js)  
**Authorization:** UCP FYP Committee

### Purpose
CampusOne is a modern university portal that integrates intelligent workflows, centralized course content, streamlined communication, and AI-powered tools to enhance academic workflow efficiency for students, teachers, TAs, and administrators.

### Key Objectives
- ✅ Enhance academic workflow efficiency
- ✅ Provide centralized digital environment for course management
- ✅ Introduce AI-powered features (similarity checking, content summarization)
- ✅ Reduce system fragmentation through unified platform

---

## 🛠️ Tech Stack

### Frontend
- React.js (UI framework)
- Tailwind CSS (Utility-first CSS framework)
- HTML5
- JavaScript (ES6+)

### Backend
- Node.js (Runtime environment)
- Express.js (Backend framework)
- npm (Package manager)

### Database
- MongoDB (Primary database)

### Development Tools
- Git / GitHub (Version control)
- Postman (API testing)

### AI/ML Services
- TensorFlow.js / HuggingFace API (for AI features)

---

## 📝 Detailed To-Do List (Parallel Development)

> **⚡ IMPORTANT:** Backend and Frontend development happen **SIDE-BY-SIDE** for each feature!  
> Complete both backend API and frontend UI for one feature before moving to the next.  
> This approach allows you to test features immediately and maintain momentum.

---

## **PHASE 1: PROJECT SETUP & INITIALIZATION** ⚙️

### 1.1 Environment Setup
- [ ] **Install Node.js and npm**
  - Download and install Node.js (v18+ recommended)
  - Verify installation: `node --version` and `npm --version`
  
- [ ] **Install MongoDB**
  - Download MongoDB Community Edition
  - Set up MongoDB Compass (GUI tool)
  - OR set up MongoDB Atlas (cloud database)
  - Verify connection and create database named `campusone_db`

- [ ] **Install Git**
  - Download and install Git
  - Configure Git: `git config --global user.name` and `user.email`
  - Create GitHub repository for project

- [ ] **Install VS Code / IDE**
  - Install Visual Studio Code
  - Install extensions: ES7+ React snippets, Prettier, ESLint, MongoDB for VS Code, Tailwind CSS IntelliSense

- [ ] **Install Postman**
  - Download Postman for API testing
  - Create workspace for CampusOne APIs

---

### 1.2 Backend Project Structure

- [ ] **Initialize Backend Project**
  ```bash
  mkdir campusone-backend
  cd campusone-backend
  npm init -y
  ```
  - Create folder structure:
    ```
    backend/
    ├── config/          # Database, environment configs
    ├── models/          # MongoDB schemas
    ├── routes/          # API routes
    ├── controllers/     # Business logic
    ├── middleware/      # Authentication, validation
    ├── utils/           # Helper functions
    ├── services/        # AI services, email services
    └── server.js        # Entry point
    ```

- [ ] **Install Backend Dependencies**
  ```bash
  npm install express mongoose dotenv cors bcryptjs jsonwebtoken
  npm install nodemon --save-dev
  ```
  - **express**: Backend framework
  - **mongoose**: MongoDB ODM
  - **dotenv**: Environment variables management
  - **cors**: Cross-origin resource sharing
  - **bcryptjs**: Password hashing
  - **jsonwebtoken**: JWT authentication
  - **nodemon**: Auto-restart server during development

- [ ] **Setup Environment Variables (Backend)**
  - Create `.env` file in backend:
    ```
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/campusone_db
    JWT_SECRET=your_secret_key_here
    JWT_EXPIRE=7d
    ```

- [ ] **Create Basic Server**
  - File: `backend/server.js`
  - Setup Express app
  - Connect to MongoDB
  - Configure CORS
  - Add basic error handling
  - Test server runs: `npm run dev`

---

### 1.3 Frontend Project Structure
  ```bash
  npx create-react-app campusone-frontend
  cd campusone-frontend
  ```
  - Create folder structure:
    ```
    frontend/
    ├── public/
    ├── src/
    │   ├── components/      # Reusable components
    │   ├── pages/           # Page components
    │   ├── services/        # API calls
    │   ├── context/         # React context (state management)
    │   ├── utils/           # Helper functions
    │   ├── styles/          # CSS files
    │   └── App.js           # Main app component
    ```

- [ ] **Install Frontend Dependencies**
  ```bash
  npm install axios react-router-dom
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
  - **axios**: HTTP client for API calls
  - **react-router-dom**: Routing
  - **tailwindcss**: Utility-first CSS framework for styling
  
- [ ] **Configure Tailwind CSS**
  - Update `tailwind.config.js`:
    ```js
    module.exports = {
      content: ["./src/**/*.{js,jsx,ts,tsx}"],
      theme: { extend: {} },
      plugins: [],
    }
    ```
  - Add to `src/index.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

- [ ] **Setup Environment Variables**
  - Create `.env` file in backend:
    ```
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/campusone_db
    JWT_SECRET=your_secret_key_here
    JWT_EXPIRE=7d
    ```
  - Create `.env` file in frontend:
    ```
    REACT_APP_API_URL=http://localhost:5000/api
    ```

- [ ] **Setup Git Repository**
  ```bash
  git init
  git add .
  git commit -m "Initial project setup"
  git remote add origin <your-github-repo-url>
  git push -u origin main
  ```
  - Create `.gitignore` file:
    ```
    node_modules/
    .env
    build/
    dist/
    ```

---

## **PHASE 2: DATABASE DESIGN** 🗄️

### 2.1 Design Database Schema

- [ ] **Create User Schema**
  - File: `backend/models/User.js`
  - Fields:
    - `_id`: ObjectId (auto-generated)
    - `name`: String (required)
    - `email`: String (required, unique)
    - `password`: String (required, hashed)
    - `role`: String (enum: ['student', 'teacher', 'ta', 'admin'])
    - `profilePicture`: String (URL)
    - `enrollmentNumber`: String (for students)
    - `employeeId`: String (for teachers/TAs)
    - `department`: String
    - `isActive`: Boolean (default: true)
    - `failedLoginAttempts`: Number (default: 0)
    - `accountLocked`: Boolean (default: false)
    - `twoFactorSecret`: String (for 2FA)
    - `twoFactorEnabled`: Boolean (default: false)
    - `trustedDevices`: [{
        - `deviceId`: String
        - `deviceName`: String
        - `lastUsed`: Date
      }]
    - `createdAt`: Date
    - `updatedAt`: Date

- [ ] **Create Course Schema**
  - File: `backend/models/Course.js`
  - Fields:
    - `_id`: ObjectId
    - `courseCode`: String (required, unique)
    - `courseName`: String (required)
    - `description`: String
    - `teacher`: ObjectId (ref: 'User')
    - `tas`: [ObjectId] (ref: 'User')
    - `students`: [ObjectId] (ref: 'User')
    - `semester`: String
    - `creditHours`: Number
    - `materials`: [{
        - `title`: String
        - `type`: String (notes/slides/reading)
        - `fileUrl`: String
        - `uploadedBy`: ObjectId
        - `uploadedAt`: Date
      }]
    - `isActive`: Boolean
    - `createdAt`: Date

- [ ] **Create Assignment Schema**
  - File: `backend/models/Assignment.js`
  - Fields:
    - `_id`: ObjectId
    - `courseId`: ObjectId (ref: 'Course')
    - `title`: String (required)
    - `description`: String
    - `dueDate`: Date (required)
    - `totalMarks`: Number
    - `lateSubmissionAllowed`: Boolean (default: false)
    - `fileUrl`: String (assignment document)
    - `createdBy`: ObjectId (ref: 'User')
    - `createdAt`: Date

- [ ] **Create Submission Schema**
  - File: `backend/models/Submission.js`
  - Fields:
    - `_id`: ObjectId
    - `assignmentId`: ObjectId (ref: 'Assignment')
    - `studentId`: ObjectId (ref: 'User')
    - `fileUrl`: String (required)
    - `submittedAt`: Date
    - `isLate`: Boolean
    - `marksObtained`: Number
    - `feedback`: String
    - `similarityScore`: Number
    - `similarityStatus`: String (enum: ['pending', 'acceptable', 'suspicious'])
    - `gradedBy`: ObjectId (ref: 'User')
    - `gradedAt`: Date

- [ ] **Create Attendance Schema**
  - File: `backend/models/Attendance.js`
  - Fields:
    - `_id`: ObjectId
    - `courseId`: ObjectId (ref: 'Course')
    - `date`: Date (required)
    - `records`: [{
        - `studentId`: ObjectId
        - `status`: String (enum: ['present', 'absent', 'late'])
      }]
    - `markedBy`: ObjectId (ref: 'User')
    - `createdAt`: Date

- [ ] **Create Announcement Schema**
  - File: `backend/models/Announcement.js`
  - Fields:
    - `_id`: ObjectId
    - `courseId`: ObjectId (ref: 'Course') - null for general announcements
    - `title`: String (required)
    - `content`: String (required)
    - `priority`: String (enum: ['low', 'medium', 'high'])
    - `createdBy`: ObjectId (ref: 'User')
    - `targetAudience`: String (enum: ['all', 'students', 'teachers', 'specific_course'])
    - `createdAt`: Date

- [ ] **Create Notification Schema**
  - File: `backend/models/Notification.js`
  - Fields:
    - `_id`: ObjectId
    - `userId`: ObjectId (ref: 'User')
    - `type`: String (enum: ['announcement', 'deadline', 'grade', 'general'])
    - `title`: String
    - `message`: String
    - `isRead`: Boolean (default: false)
    - `relatedId`: ObjectId (assignment/announcement ID)
    - `createdAt`: Date

- [ ] **Create Summary Schema** (for AI-generated summaries)
  - File: `backend/models/Summary.js`
  - Fields:
    - `_id`: ObjectId
    - `courseId`: ObjectId (ref: 'Course')
    - `originalFileUrl`: String
    - `summaryText`: String
    - `generatedBy`: ObjectId (ref: 'User')
    - `createdAt`: Date

- [ ] **Create Quiz Schema**
  - File: `backend/models/Quiz.js`
  - Fields:
    - `_id`: ObjectId
    - `courseId`: ObjectId (ref: 'Course')
    - `title`: String (required)
    - `description`: String
    - `difficulty`: String (enum: ['easy', 'medium', 'hard'])
    - `duration`: Number (in minutes)
    - `startTime`: Date
    - `endTime`: Date
    - `totalMarks`: Number
    - `passingMarks`: Number
    - `questions`: [{
        - `questionText`: String
        - `questionType`: String (enum: ['mcq', 'true-false', 'short-answer'])
        - `options`: [String] (for MCQs)
        - `correctAnswer`: String/[String]
        - `marks`: Number
        - `difficulty`: String
      }]
    - `allowTabSwitch`: Boolean (default: false)
    - `requireCamera`: Boolean (default: false)
    - `requireScreenShare`: Boolean (default: false)
    - `generatedByAI`: Boolean (default: false)
    - `createdBy`: ObjectId (ref: 'User')
    - `createdAt`: Date

- [ ] **Create Quiz Attempt Schema**
  - File: `backend/models/QuizAttempt.js`
  - Fields:
    - `_id`: ObjectId
    - `quizId`: ObjectId (ref: 'Quiz')
    - `studentId`: ObjectId (ref: 'User')
    - `answers`: [{
        - `questionId`: ObjectId
        - `answer`: String/[String]
        - `isCorrect`: Boolean
        - `marksObtained`: Number
      }]
    - `startedAt`: Date
    - `submittedAt`: Date
    - `totalMarksObtained`: Number
    - `status`: String (enum: ['in-progress', 'completed', 'terminated'])
    - `terminationReason`: String (e.g., 'tab-switch', 'time-up', 'manual')
    - `tabSwitchCount`: Number (default: 0)
    - `proctoring`: {
        - `cameraEnabled`: Boolean
        - `screenShareEnabled`: Boolean
        - `violations`: [{
            - `type`: String
            - `timestamp`: Date
            - `description`: String
          }]
      }

- [ ] **Create TA Eligibility Schema**
  - File: `backend/models/TAEligibility.js`
  - Fields:
    - `_id`: ObjectId
    - `studentId`: ObjectId (ref: 'User')
    - `teacherId`: ObjectId (ref: 'User')
    - `completedCourses`: [{
        - `courseId`: ObjectId (ref: 'Course')
        - `semester`: Number
        - `grade`: String
        - `completedAt`: Date
      }]
    - `currentSemester`: Number
    - `eligibleForSemesters`: [Number]
    - `isApproved`: Boolean (default: false)
    - `approvedBy`: ObjectId (ref: 'User')
    - `createdAt`: Date

---

## **PHASE 3: AUTHENTICATION & USER MANAGEMENT (Backend + Frontend)** 🔐

> **Complete the entire authentication system (API + UI) in this phase**

---

### 3.1 BACKEND - Authentication API (REQ-UM-1 to REQ-UM-6)

- [ ] **Setup Two-Factor Authentication**
  - Install dependencies: `npm install speakeasy qrcode uuid`
  - **speakeasy**: Generate and verify TOTP tokens
  - **qrcode**: Generate QR codes for 2FA setup
  - **uuid**: Generate unique device identifiers

- [ ] **Create Authentication Middleware**
  - File: `backend/middleware/auth.js`
  - Implement JWT token verification
  - Create `protect` middleware to verify user is logged in
  - Create `authorize` middleware to check user roles
  - Create `verify2FA` middleware to check 2FA token
  - Create `checkDeviceTrust` middleware to verify trusted devices
  
- [ ] **Create Auth Controller**
  - File: `backend/controllers/authController.js`
  - **Register Function** (POST /api/auth/register)
    - Validate input data (name, email, password, role)
    - Check if user already exists
    - Hash password using bcryptjs
    - Create user in database
    - Return success message
  
  - **Login Function** (POST /api/auth/login)
    - Validate email and password
    - Check if user exists
    - Verify password
    - Check failed login attempts (REQ-UM-6)
    - If attempts >= 5, lock account and return error
    - If valid, reset failed attempts to 0
    - **Check device fingerprint (browser + IP + user agent)**
    - If device not in trusted devices list:
      - Generate 2FA token
      - Send token to user (email/SMS)
      - Return status: "2FA_REQUIRED"
    - If device trusted or 2FA disabled:
      - Generate JWT token
      - Return token and user data
  
  - **Verify 2FA Token** (POST /api/auth/verify-2fa)
    - Validate 2FA token using speakeasy
    - If valid:
      - Add device to trusted devices list
      - Generate JWT token
      - Return token and user data
    - If invalid:
      - Return error message
  
  - **Setup 2FA** (POST /api/auth/setup-2fa)
    - Generate secret using speakeasy
    - Generate QR code
    - Return QR code and secret (for user to scan with authenticator app)
  
  - **Enable 2FA** (POST /api/auth/enable-2fa)
    - Verify token from authenticator app
    - If valid, set `twoFactorEnabled` to true
    - Return success message
  
  - **Disable 2FA** (POST /api/auth/disable-2fa)
    - Verify password and 2FA token
    - Set `twoFactorEnabled` to false
    - Clear trusted devices
    - Return success message
  
  - **Get Trusted Devices** (GET /api/auth/trusted-devices)
    - Return list of trusted devices for user
  
  - **Remove Trusted Device** (DELETE /api/auth/trusted-devices/:deviceId)
    - Remove device from trusted devices list
    - Return success message
  
  - **Logout Function** (POST /api/auth/logout)
    - Clear authentication token
    - Return success message

  - **Get Current User** (GET /api/auth/me)
    - Verify JWT token
    - Return current user data

- [ ] **Create Auth Routes**
  - File: `backend/routes/authRoutes.js`
  - Define routes for register, login, logout, get current user
  - Add routes for 2FA: setup, enable, disable, verify
  - Add routes for device management

- [ ] **Implement Password Reset** (Optional)
  - Generate reset token
  - Send reset email
  - Verify token and reset password

---

### 3.2 User Management (Admin) (REQ-UM-2 to REQ-UM-5)

- [ ] **Create User Controller**
  - File: `backend/controllers/userController.js`
  
  - **Get All Users** (GET /api/users)
    - Admin only
    - Filter by role (student/teacher/ta)
    - Pagination support
  
  - **Get Single User** (GET /api/users/:id)
    - Return user details by ID
  
  - **Create User** (POST /api/users) - Admin only (REQ-UM-4)
    - Validate input
    - Create new user account
    - Return created user
  
  - **Update User** (PUT /api/users/:id) - Admin only (REQ-UM-4)
    - Update user information
    - Cannot update password directly (use separate route)
    - Return updated user
  
  - **Deactivate User** (PUT /api/users/:id/deactivate) - Admin only (REQ-UM-4)
    - Set `isActive` to false
    - User cannot login when deactivated
  
  - **Unlock Account** (PUT /api/users/:id/unlock) - Admin only
    - Reset failed login attempts to 0
    - Set `accountLocked` to false

- [ ] **Create User Routes**
  - File: `backend/routes/userRoutes.js`
  - Define all user management routes
  - Apply `protect` and `authorize` middleware

- [ ] **Input Validation Middleware** (REQ-UM-5)
  - File: `backend/middleware/validation.js`
  - Validate email format
  - Validate password strength (min 8 characters, etc.)
  - Validate required fields
  - Return appropriate error messages

---

### 3.3 FRONTEND - Authentication UI & Dashboards

#### 3.3.1 Setup Authentication Service

- [ ] **Create Auth Context**
  - File: `frontend/src/context/AuthContext.js`
  - Create context for auth state
  - Store user data, token, loading state
  - Create login, logout, register functions
  - Store JWT token in localStorage
  - Auto-fetch user on app load if token exists

- [ ] **Create API Service**
  - File: `frontend/src/services/api.js`
  - Setup axios instance with base URL
  - Add request interceptor to attach JWT token
  - Add response interceptor to handle errors (401, 403)

#### 3.3.2 Auth Pages with 2FA Support

- [ ] **Login Page** (REQ-UM-1)
  - File: `frontend/src/pages/Login.jsx`
  - Create login form (email, password) with Tailwind CSS
  - Handle submit → call API
  - If response is "2FA_REQUIRED":
    - Show 2FA input field
    - User enters 6-digit code
    - Call verify-2fa API
  - If device trusted or 2FA disabled:
    - Store token and redirect to dashboard
  - Display error messages
  - Add "Remember this device" checkbox
  - **Styling**: Use Tailwind utility classes for forms, buttons, alerts

- [ ] **Register Page** (REQ-UM-1)
  - File: `frontend/src/pages/Register.jsx`
  - Create registration form (name, email, password, confirmPassword)
  - Validate passwords match
  - Call register API
  - Show success message
  - Redirect to login
  - **Styling**: Tailwind forms with validation states

- [ ] **2FA Setup Page** (REQ-UM-1)
  - File: `frontend/src/pages/Setup2FA.jsx`
  - Call setup-2fa API to get QR code
  - Display QR code for user to scan
  - User enters code from authenticator app
  - Call enable-2fa API to enable 2FA
  - Show success message
  - **Styling**: Center QR code, add instructions with Tailwind

- [ ] **Trusted Devices Page** (REQ-UM-1)
  - File: `frontend/src/pages/TrustedDevices.jsx`
  - Fetch and display list of trusted devices
  - Show device name, browser, IP, last used date
  - Add "Remove" button for each device
  - Call remove-trusted-device API
  - **Styling**: Tailwind cards, hover effects, responsive grid

#### 3.3.3 Role-Based Dashboards (REQ-UM-2)

- [ ] **Student Dashboard** (REQ-UM-2)
  - File: `frontend/src/pages/StudentDashboard.jsx`
  - Display enrolled courses
  - Show upcoming assignments
  - Show recent announcements
  - Display attendance summary
  - **Styling**: Tailwind grid layout, cards with shadows, icons

- [ ] **Teacher Dashboard** (REQ-UM-2)
  - File: `frontend/src/pages/TeacherDashboard.jsx`
  - Display teaching courses
  - Show pending submissions
  - Show TA approval requests
  - Quick stats (students, assignments, attendance)
  - **Styling**: Stats cards with Tailwind, responsive layout

- [ ] **TA Dashboard** (REQ-UM-2)
  - File: `frontend/src/pages/TADashboard.jsx`
  - Display assigned courses
  - Show grading queue
  - Show material upload permissions
  - **Styling**: Similar to Teacher dashboard with Tailwind

- [ ] **Admin Dashboard** (REQ-UM-2)
  - File: `frontend/src/pages/AdminDashboard.jsx`
  - System statistics (users, courses, activity)
  - Recent user activity
  - Quick links to user management, course management
  - **Styling**: Professional admin layout with Tailwind

#### 3.3.4 Protected Routes

- [ ] **Setup Protected Routes**
  - File: `frontend/src/components/ProtectedRoute.jsx`
  - Check if user is authenticated
  - Redirect to login if not authenticated
  - Check user role for role-based routes

- [ ] **Setup Route-Based Role Access**
  - Create `RoleRoute` component
  - Check user role matches allowed roles
  - Redirect if not authorized

#### 3.3.5 User Management UI (Admin Only) (REQ-UM-4)

- [ ] **User Management Page**
  - File: `frontend/src/pages/admin/UserManagement.jsx`
  - Display table of all users with filters (role, active status)
  - Search by name/email
  - Add "Create User" button
  - Add "Edit", "Deactivate", "Unlock" buttons for each user
  - **Styling**: Tailwind table, filter dropdowns, search input

- [ ] **Create/Edit User Modal**
  - File: `frontend/src/components/UserModal.jsx`
  - Form for creating/editing users
  - Fields: name, email, password (only for create), role
  - Call create/update API
  - Close modal on success
  - **Styling**: Tailwind modal with backdrop, form validation

#### 3.3.6 Profile & Settings (REQ-UM-3)

- [ ] **Profile Page** (REQ-UM-3)
  - File: `frontend/src/pages/Profile.jsx`
  - Display user information
  - Allow user to update name, email (password change separate)
  - Show enrolled courses (students)
  - Show teaching courses (teachers)
  - **Styling**: Tailwind profile layout

- [ ] **Settings Page** (REQ-UM-3)
  - File: `frontend/src/pages/Settings.jsx`
  - Link to 2FA setup page
  - Link to trusted devices page
  - Password change form
  - **Styling**: Settings sections with Tailwind

---

## **PHASE 4: COURSE & CONTENT MANAGEMENT (Backend + Frontend)** 📚

> **Complete course and material management (API + UI) in this phase**

---

### 4.1 BACKEND - Course & Material API

### 4.1 Course Management (REQ-CCM-1)

- [ ] **Create Course Controller**
  - File: `backend/controllers/courseController.js`
  
  - **Create Course** (POST /api/courses) - Teacher/Admin only
    - Validate course code, name, description
    - Create course in database
    - Assign teacher to course
    - Return created course
  
  - **Get All Courses** (GET /api/courses)
    - For students: return enrolled courses
    - For teachers: return teaching courses
    - For TAs: return assigned courses
    - For admin: return all courses
  
  - **Get Single Course** (GET /api/courses/:id)
    - Return course details with materials
    - Include teacher and TA information
  
  - **Update Course** (PUT /api/courses/:id) - Teacher/Admin only
    - Update course information
    - Return updated course
  
  - **Delete Course** (DELETE /api/courses/:id) - Admin only
    - Soft delete (set isActive to false)
  
  - **Enroll Students** (POST /api/courses/:id/enroll) - Admin only
    - Add students to course
    - Return updated course

- [ ] **Create Course Routes**
  - File: `backend/routes/courseRoutes.js`
  - Define all course routes with proper middleware

---

### 4.2 Content/Material Management (REQ-CCM-2 to REQ-CCM-5)

- [ ] **Setup File Upload**
  - Install multer: `npm install multer`
  - File: `backend/middleware/upload.js`
  - Configure multer for file uploads
  - Set file size limit (e.g., 50MB) (REQ-CCM-5)
  - Validate file types (PDF, PPT, DOC, DOCX) (REQ-CCM-4)
  - Store files in `/uploads` folder or cloud storage (AWS S3)

- [ ] **Create Material Controller**
  - File: `backend/controllers/materialController.js`
  
  - **Upload Material** (POST /api/courses/:courseId/materials) - Teacher/TA only (REQ-CCM-2)
    - Validate file type and size
    - Upload file using multer
    - Save file information to course materials array
    - Return success message
  
  - **Get Course Materials** (GET /api/courses/:courseId/materials) - All roles (REQ-CCM-3)
    - Return all materials for a course
    - Filter by type (notes/slides/reading)
  
  - **Download Material** (GET /api/materials/:id/download) - All roles (REQ-CCM-3)
    - Return file for download
  
  - **Delete Material** (DELETE /api/materials/:id) - Teacher/Admin only
    - Remove material from course
    - Delete file from storage

- [ ] **Create Material Routes**
  - File: `backend/routes/materialRoutes.js`
  - Define material upload/download routes

- [ ] **Error Handling for File Upload** (REQ-CCM-5)
  - Catch file size exceeded error
  - Return appropriate error message
  - Catch invalid file format error

---

### 4.2 FRONTEND - Course & Material UI

#### 4.2.1 Course Management Pages

- [ ] **Courses List Page** (REQ-CCM-1)
  - File: `frontend/src/pages/Courses.jsx`
  - Display enrolled/teaching courses in grid
  - For teachers/admin: Add "Create Course" button
  - Show course cards with: code, name, teacher, semester
  - Click on course → navigate to course detail page
  - **Styling**: Tailwind grid, hover effects, responsive cards

- [ ] **Create/Edit Course Modal** (REQ-CCM-1)
  - File: `frontend/src/components/CourseModal.jsx`
  - Form: course code, name, description, semester, year
  - For edit: pre-fill existing data
  - Call create/update course API
  - **Styling**: Tailwind modal, form validation

- [ ] **Course Detail Page** (REQ-CCM-1)
  - File: `frontend/src/pages/CourseDetail.jsx`
  - Display course information (code, name, description, teacher)
  - Show tabs: Materials, Assignments, Attendance, Announcements
  - For teacher: Show edit/delete buttons
  - **Styling**: Tailwind tabs, clean layout

#### 4.2.2 Material Management UI (REQ-CCM-2, REQ-CCM-3)

- [ ] **Materials Tab Component** (REQ-CCM-3)
  - File: `frontend/src/components/MaterialsTab.jsx`
  - Display all course materials in list
  - Show: title, type (notes/slides/reading), uploaded by, date
  - For teacher/TA: Show "Upload Material" button
  - For all users: Download button for each material
  - **Styling**: Tailwind table or card list, icons

- [ ] **Upload Material Modal** (REQ-CCM-2)
  - File: `frontend/src/components/UploadMaterialModal.jsx`
  - Form: title, type dropdown (notes/slides/reading), file input
  - Validate file type (PDF, PPT, DOC, DOCX) (REQ-CCM-4)
  - Validate file size (max 50MB) (REQ-CCM-5)
  - Show upload progress bar
  - Call upload material API with FormData
  - Display success message
  - **Styling**: Tailwind file input, progress bar, error messages

- [ ] **Material Download Functionality** (REQ-CCM-3)
  - Click download button → call download API
  - Use blob to download file
  - Handle download errors

#### 4.2.3 Course Enrollment (Admin)

- [ ] **Enroll Students Page**
  - File: `frontend/src/pages/admin/EnrollStudents.jsx`
  - Select course dropdown
  - Multi-select students list
  - Bulk enroll button
  - Call enroll API
  - **Styling**: Tailwind select, checkboxes, responsive

---

## **PHASE 5: ASSIGNMENT MANAGEMENT (Backend + Frontend)** 📝

> **Complete assignment system (API + UI) in this phase**

---

### 5.1 BACKEND - Assignment API

### 5.1 Assignment Creation & Management (REQ-AM-1)

- [ ] **Create Assignment Controller**
  - File: `backend/controllers/assignmentController.js`
  
  - **Create Assignment** (POST /api/assignments) - Teacher only
    - Validate title, description, due date, total marks
    - Upload assignment file (optional)
    - Create assignment in database
    - Send notification to enrolled students
    - Return created assignment
  
  - **Get All Assignments** (GET /api/assignments)
    - For students: return course assignments with submission status
    - For teachers: return created assignments
    - Filter by course
  
  - **Get Single Assignment** (GET /api/assignments/:id)
    - Return assignment details
    - Include submission status for students
  
  - **Update Assignment** (PUT /api/assignments/:id) - Teacher only
    - Update assignment details
    - Return updated assignment
  
  - **Delete Assignment** (DELETE /api/assignments/:id) - Teacher/Admin only
    - Delete assignment and all submissions

- [ ] **Create Assignment Routes**
  - File: `backend/routes/assignmentRoutes.js`
  - Define assignment routes

---

### 5.2 Submission Workflow (REQ-AM-2 to REQ-AM-6)

- [ ] **Create Submission Controller**
  - File: `backend/controllers/submissionController.js`
  
  - **Submit Assignment** (POST /api/assignments/:id/submit) - Student only (REQ-AM-2)
    - Check if deadline has passed
    - If late submission not allowed, reject (REQ-AM-3)
    - Upload submission file
    - Mark as late if after deadline
    - Create submission record
    - Return success message
  
  - **Get Student Submissions** (GET /api/submissions/my-submissions) - Student
    - Return all submissions for logged-in student
  
  - **Get Assignment Submissions** (GET /api/assignments/:id/submissions) - Teacher/TA (REQ-AM-5)
    - Return all student submissions for an assignment
    - Include student details
    - Allow download of submissions
  
  - **Download Submission** (GET /api/submissions/:id/download) - Teacher/TA (REQ-AM-5)
    - Return submission file
  
  - **Grade Submission** (PUT /api/submissions/:id/grade) - Teacher only (REQ-AM-6)
    - Update marks obtained
    - Add feedback
    - Mark as graded
    - Send notification to student
    - Return updated submission

- [ ] **Create Submission Routes**
  - File: `backend/routes/submissionRoutes.js`
  - Define submission routes

- [ ] **Deadline Notification System** (REQ-AM-4)
  - File: `backend/services/notificationService.js`
  - Create function to check upcoming deadlines
  - Send notifications 3 days before, 1 day before deadline
  - Use node-cron for scheduled tasks: `npm install node-cron`
  - Schedule daily check for deadlines

---

### 5.2 FRONTEND - Assignment UI

#### 5.2.1 Assignment Pages (REQ-AM-1)

- [ ] **Assignments Tab in Course Detail**
  - File: `frontend/src/components/AssignmentsTab.jsx`
  - Display list of assignments for course
  - Show: title, due date, total marks, status (submitted/pending)
  - For teacher: "Create Assignment" button
  - For students: "Submit" button if not submitted
  - **Styling**: Tailwind table/cards, status badges

- [ ] **Create Assignment Modal** (REQ-AM-1)
  - File: `frontend/src/components/CreateAssignmentModal.jsx`
  - Form: title, description, due date, total marks, file (optional)
  - Call create assignment API
  - Display success message
  - **Styling**: Tailwind modal, date picker, file input

- [ ] **Assignment Detail Page** (REQ-AM-1)
  - File: `frontend/src/pages/AssignmentDetail.jsx`
  - Display assignment details
  - Show submission form for students
  - Show submissions list for teacher
  - **Styling**: Clean layout with Tailwind

#### 5.2.2 Student Submission (REQ-AM-2, REQ-AM-3)

- [ ] **Submit Assignment Form** (REQ-AM-2)
  - File: `frontend/src/components/SubmitAssignmentForm.jsx`
  - File upload input (validate PDF, DOC, DOCX)
  - Optional text submission field
  - Check file size limit (REQ-AM-3)
  - Submit button (disabled after submission)
  - Display remaining time until deadline (REQ-AM-4)
  - Call submit API with FormData
  - **Styling**: Tailwind form, countdown timer, progress bar

- [ ] **My Submissions Page** (REQ-AM-2)
  - File: `frontend/src/pages/MySubmissions.jsx`
  - Display all student's submissions across courses
  - Show: assignment name, course, submitted date, marks, feedback
  - Download submitted file
  - **Styling**: Tailwind table, responsive

#### 5.2.3 Grading Interface (Teacher) (REQ-AM-5, REQ-AM-6)

- [ ] **Submissions List Page** (REQ-AM-5)
  - File: `frontend/src/pages/teacher/Submissions.jsx`
  - Display all submissions for assignment
  - Show: student name, submitted date, file, status (graded/ungraded)
  - Download submission button
  - "Grade" button for each submission
  - **Styling**: Tailwind table, filters (graded/ungraded)

- [ ] **Grade Submission Modal** (REQ-AM-6)
  - File: `frontend/src/components/GradeSubmissionModal.jsx`
  - Show student name, submission date
  - Display/download submitted file
  - Input: marks obtained (validate <= total marks)
  - Textarea: feedback
  - Submit grading button
  - Call grade API
  - **Styling**: Tailwind modal, form validation

#### 5.2.4 Deadline Notifications (REQ-AM-4)

- [ ] **Notification Bell Component**
  - File: `frontend/src/components/NotificationBell.jsx`
  - Display bell icon in navbar
  - Show red badge if unread notifications
  - Click to show dropdown with recent notifications
  - Include deadline reminders
  - **Styling**: Tailwind dropdown, badge, hover effects

---

## **PHASE 6: AI FEATURES (Backend + Frontend)** 🤖

> **Complete AI-powered features (Similarity Checker + Summarization) in this phase**

---

### 6.1 BACKEND - AI Services API

### 6.1 AI Assignment Similarity Checker (REQ-AI-SC-1 to REQ-AI-SC-4)

- [ ] **Setup AI Service**
  - Research and choose AI library:
    - Option 1: Natural (Node.js NLP library)
    - Option 2: TensorFlow.js
    - Option 3: External API (CopyLeaks, Turnitin API)
    - Option 4: Build custom model using Python Flask API
  - Install dependencies
  
- [ ] **Create Similarity Service**
  - File: `backend/services/similarityService.js`
  
  - **Extract Text from Document**
    - Install pdf-parse: `npm install pdf-parse`
    - Install mammoth (for Word docs): `npm install mammoth`
    - Extract text from PDF/DOC files
    - Handle errors for unreadable formats (REQ-AI-SC-4)
  
  - **Calculate Similarity Score** (REQ-AI-SC-1)
    - Compare submission with other students' submissions (REQ-AI-SC-2)
    - Calculate similarity percentage
    - Return similarity score and matching submissions
  
- [ ] **Create Similarity Controller**
  - File: `backend/controllers/similarityController.js`
  
  - **Check Similarity** (POST /api/assignments/:id/check-similarity) - Teacher only
    - Get all submissions for assignment
    - Run similarity analysis
    - Update submission records with similarity scores
    - Return results
  
  - **Mark Similarity Status** (PUT /api/submissions/:id/similarity-status) - Teacher only (REQ-AI-SC-3)
    - Update similarity status (acceptable/suspicious)
    - Return updated submission

- [ ] **Create Similarity Routes**
  - File: `backend/routes/similarityRoutes.js`
  - Define similarity checking routes

---

### 6.2 AI Notes & Slides Summarization (REQ-AI-SUM-1 to REQ-AI-SUM-4)

- [ ] **Setup Summarization Service**
  - Research and choose AI library:
    - Option 1: HuggingFace API (transformers)
    - Option 2: OpenAI API (GPT-3.5/4)
    - Option 3: Custom summarization model
  - Install dependencies
  
- [ ] **Create Summarization Service**
  - File: `backend/services/summarizationService.js`
  
  - **Extract Text from Files**
    - Use pdf-parse for PDFs
    - Use mammoth for Word docs
    - Handle PowerPoint files (pptx)
  
  - **Generate Summary** (REQ-AI-SUM-1, REQ-AI-SUM-2)
    - Send extracted text to AI model
    - Generate structured summary (bullet points, key highlights)
    - Handle errors for illegible content (REQ-AI-SUM-3)
    - Return generated summary

- [ ] **Create Summary Controller**
  - File: `backend/controllers/summaryController.js`
  
  - **Generate Summary** (POST /api/materials/:id/summarize) - Teacher only
    - Get material file
    - Extract text
    - Generate summary using AI
    - Save summary to database (REQ-AI-SUM-4)
    - Return summary
  
  - **Get Material Summary** (GET /api/materials/:id/summary) - All roles
    - Return saved summary for a material

- [ ] **Create Summary Routes**
  - File: `backend/routes/summaryRoutes.js`
  - Define summarization routes

---

### 6.2 FRONTEND - AI Features UI

#### 6.2.1 Similarity Checker UI (REQ-AI-SC-1, REQ-AI-SC-2)

- [ ] **Similarity Checker Page** (REQ-AI-SC-1)
  - File: `frontend/src/pages/teacher/SimilarityChecker.jsx`
  - For teachers only
  - Display assignment selector dropdown
  - Show list of submissions for selected assignment
  - "Run Similarity Check" button
  - Call similarity check API
  - Display loading spinner during analysis
  - **Styling**: Tailwind dropdowns, buttons, loader

- [ ] **Similarity Results Component** (REQ-AI-SC-2)
  - File: `frontend/src/components/SimilarityResults.jsx`
  - Display results in table/cards
  - Show: student names, similarity percentage, detailed report link
  - Highlight high similarity (>70%) in red, medium (40-70%) in yellow
  - Click on result → show detailed comparison
  - **Styling**: Tailwind table, color-coded badges, modal for details

#### 6.2.2 Summarization UI (REQ-AI-SUM-1, REQ-AI-SUM-2)

- [ ] **Summarize Button in Materials** (REQ-AI-SUM-1)
  - Add "Generate Summary" button next to each material (teacher only)
  - On click → call summarize API
  - Show loading state
  - Display success message when done

- [ ] **View Summary Component** (REQ-AI-SUM-2, REQ-AI-SUM-4)
  - File: `frontend/src/components/SummaryViewer.jsx`
  - Add "View Summary" button for all users
  - Fetch summary from API (REQ-AI-SUM-4)
  - Display summary in modal or side panel
  - Show bullet points, key highlights
  - Option to download summary as PDF
  - Handle error message if illegible (REQ-AI-SUM-3)
  - **Styling**: Tailwind modal, formatted text, download button

---

## **PHASE 7: ATTENDANCE & ANALYTICS (Backend + Frontend)** 📊

> **Complete attendance system (API + UI) in this phase**

---

### 7.1 BACKEND - Attendance API

### 7.1 Attendance Tracking (REQ-AT-1 to REQ-AT-5)

- [ ] **Create Attendance Controller**
  - File: `backend/controllers/attendanceController.js`
  
  - **Mark Attendance** (POST /api/attendance) - Teacher/TA only (REQ-AT-1)
    - Validate course and date
    - Accept array of student attendance records
    - Save attendance in database (REQ-AT-2)
    - Return success message
  
  - **Get Course Attendance** (GET /api/courses/:courseId/attendance) - Teacher/TA
    - Return all attendance records for a course
    - Filter by date range
  
  - **Get Student Attendance** (GET /api/attendance/my-attendance) - Student (REQ-AT-4)
    - Return attendance records for logged-in student
    - Calculate attendance percentage (REQ-AT-3)
    - Show analytics (present/absent/late counts)
  
  - **Get Attendance Analytics** (GET /api/courses/:courseId/attendance-analytics) - Teacher
    - Calculate overall attendance percentage for course
    - Identify students with low attendance
    - Generate warnings (REQ-AT-5)

- [ ] **Create Attendance Routes**
  - File: `backend/routes/attendanceRoutes.js`
  - Define attendance routes

- [ ] **Low Attendance Warning System** (REQ-AT-5)
  - Create function to check attendance < 75%
  - Generate warning notification
  - Send to student and teacher

---

### 7.2 FRONTEND - Attendance UI

#### 7.2.1 Attendance Marking (Teacher/TA) (REQ-AT-1)

- [ ] **Mark Attendance Page**
  - File: `frontend/src/pages/teacher/MarkAttendance.jsx`
  - Select course and date
  - Display enrolled students list
  - Checkboxes for each student: Present / Absent / Late
  - "Mark All Present" button
  - Submit attendance button
  - Call mark attendance API with array
  - **Styling**: Tailwind table, checkboxes, date picker

#### 7.2.2 View Attendance (Students) (REQ-AT-4)

- [ ] **My Attendance Page** (REQ-AT-4)
  - File: `frontend/src/pages/student/MyAttendance.jsx`
  - Display attendance records by course
  - Show: date, status (Present/Absent/Late)
  - Calculate and display attendance percentage (REQ-AT-3)
  - Show visual progress bar for percentage
  - Display warning if < 75% (REQ-AT-5)
  - **Styling**: Tailwind cards, progress bars, badges

#### 7.2.3 Attendance Analytics (Teacher)

- [ ] **Course Attendance Analytics Page**
  - File: `frontend/src/pages/teacher/AttendanceAnalytics.jsx`
  - Display overall attendance stats for course
  - List students with attendance < 75%
  - Show charts/graphs (bar chart, pie chart)
  - Export attendance report button
  - **Styling**: Tailwind charts (use chart.js or recharts)

---

## **PHASE 8: ANNOUNCEMENTS & NOTIFICATIONS (Backend + Frontend)** 📢

> **Complete announcements and notification system (API + UI) in this phase**

---

### 8.1 BACKEND - Announcements & Notifications API

### 8.1 Announcement System (REQ-AN-1 to REQ-AN-3)

- [ ] **Create Announcement Controller**
  - File: `backend/controllers/announcementController.js`
  
  - **Create Announcement** (POST /api/announcements) - Teacher/TA/Admin (REQ-AN-1)
    - Validate title, content, priority
    - Specify target audience (all/students/specific course)
    - Create announcement in database
    - Trigger notifications to target users
    - Return created announcement
  
  - **Get All Announcements** (GET /api/announcements)
    - For students: return announcements for enrolled courses + general
    - For teachers: return own announcements
    - For admin: return all announcements
  
  - **Get Single Announcement** (GET /api/announcements/:id)
    - Return announcement details
  
  - **Update Announcement** (PUT /api/announcements/:id) - Creator only
    - Update announcement content
    - Return updated announcement
  
  - **Delete Announcement** (DELETE /api/announcements/:id) - Creator/Admin
    - Delete announcement

- [ ] **Create Announcement Routes**
  - File: `backend/routes/announcementRoutes.js`
  - Define announcement routes

---

### 8.2 Notification System (REQ-AN-2, REQ-AN-3)

- [ ] **Create Notification Service**
  - File: `backend/services/notificationService.js`
  
  - **Create Notification Function**
    - Accept userId, type, title, message, relatedId
    - Create notification in database
    - Return notification
  
  - **Send Bulk Notifications**
    - Accept array of userIds
    - Create notifications for all users
  
  - **Send Email Notification** (Optional) (REQ-AN-2)
    - Install nodemailer: `npm install nodemailer`
    - Configure SMTP settings
    - Send email for high-priority notifications

- [ ] **Create Notification Controller**
  - File: `backend/controllers/notificationController.js`
  
  - **Get User Notifications** (GET /api/notifications)
    - Return all notifications for logged-in user
    - Sort by date (newest first)
  
  - **Mark as Read** (PUT /api/notifications/:id/read)
    - Update isRead to true
    - Return updated notification
  
  - **Mark All as Read** (PUT /api/notifications/read-all)
    - Update all user notifications
  
  - **Delete Notification** (DELETE /api/notifications/:id)
    - Delete notification

- [ ] **Create Notification Routes**
  - File: `backend/routes/notificationRoutes.js`
  - Define notification routes

- [ ] **Automated Notification Triggers** (REQ-AN-3)
  - New assignment posted → Notify enrolled students
  - Deadline approaching → Notify students with pending assignments
  - Grade published → Notify student
  - New announcement → Notify target audience
  - Low attendance → Notify student

---

### 8.2 FRONTEND - Announcements & Notifications UI

#### 8.2.1 Announcements Pages (REQ-AN-1)

- [ ] **Announcements List Page** (REQ-AN-1)
  - File: `frontend/src/pages/Announcements.jsx`
  - Display all announcements in reverse chronological order
  - Filter by priority (high/medium/low)
  - Show: title, content preview, author, date, priority badge
  - Click on announcement → view full details
  - For teachers/admin: "Create Announcement" button
  - **Styling**: Tailwind cards, priority badges (red/yellow/blue)

- [ ] **Create/Edit Announcement Modal** (REQ-AN-1)
  - File: `frontend/src/components/AnnouncementModal.jsx`
  - Form: title, content (textarea), priority dropdown, target audience
  - For course-specific: select course
  - Call create/update API
  - Display success message
  - **Styling**: Tailwind modal, form fields

- [ ] **Announcement Detail Page**
  - File: `frontend/src/pages/AnnouncementDetail.jsx`
  - Display full announcement content
  - Show author, date, priority
  - For creator: Edit/Delete buttons
  - **Styling**: Clean readable layout with Tailwind

#### 8.2.2 Notification System UI (REQ-AN-2, REQ-AN-3)

- [ ] **Notification Bell Component** (REQ-AN-2)
  - File: `frontend/src/components/NotificationBell.jsx`
  - Display bell icon in navbar
  - Show red badge with unread count
  - Click to open dropdown
  - Display recent notifications (last 10)
  - Show: title, time ago, type icon
  - Click notification → navigate to related page and mark as read
  - "View All" link to notifications page
  - **Styling**: Tailwind dropdown, badges, hover effects

- [ ] **Notifications Page** (REQ-AN-2)
  - File: `frontend/src/pages/Notifications.jsx`
  - Display all notifications
  - Tab filters: All / Unread / Read
  - Click notification → mark as read and navigate
  - "Mark All as Read" button
  - Delete individual notifications
  - **Styling**: Tailwind list, tabs, icons

---

## **PHASE 9: QUIZ MANAGEMENT (Backend + Frontend)** 📝

> **Complete quiz system with manual, Excel, and AI generation (API + UI) in this phase**

---

### 9.1 BACKEND - Quiz Creation API

### 9.1 Quiz Creation & Management

- [ ] **Setup Excel Parsing**
  - Install dependencies: `npm install xlsx`
  - **xlsx**: Parse Excel files for quiz import

- [ ] **Create Quiz Controller**
  - File: `backend/controllers/quizController.js`
  
  - **Create Quiz (Manual)** (POST /api/quizzes) - Teacher only
    - Validate quiz details (title, duration, dates, marks)
    - Accept array of questions with answers
    - Create quiz in database
    - Send notification to enrolled students
    - Return created quiz
  
  - **Create Quiz from Excel** (POST /api/quizzes/upload-excel) - Teacher only
    - Accept Excel file upload
    - Parse Excel file using xlsx library
    - Expected format:
      ```
      | Question | Type | Option A | Option B | Option C | Option D | Correct Answer | Marks | Difficulty |
      ```
    - Validate parsed data
    - Create quiz with questions
    - Return created quiz
  
  - **Generate Quiz with AI** (POST /api/quizzes/generate-ai) - Teacher only
    - Accept parameters: subject/topic, difficulty (easy/medium/hard), number of questions
    - Call AI service to generate questions
    - Create quiz with AI-generated questions
    - Mark quiz as `generatedByAI: true`
    - Return created quiz
  
  - **Get All Quizzes** (GET /api/quizzes)
    - For students: return course quizzes with attempt status
    - For teachers: return created quizzes
    - Filter by course, difficulty
  
  - **Get Single Quiz** (GET /api/quizzes/:id)
    - For students: return quiz details (without answers if not completed)
    - For teachers: return full quiz with answers
  
  - **Update Quiz** (PUT /api/quizzes/:id) - Teacher only
    - Update quiz details and questions
    - Return updated quiz
  
  - **Delete Quiz** (DELETE /api/quizzes/:id) - Teacher/Admin only
    - Delete quiz and all attempts

- [ ] **Create Quiz Routes**
  - File: `backend/routes/quizRoutes.js`
  - Define all quiz management routes

---

### 9.2 AI Quiz Generation Service

- [ ] **Setup AI Quiz Generation**
  - Choose AI service:
    - Option 1: OpenAI API (GPT-3.5/4)
    - Option 2: HuggingFace API
    - Option 3: Google Gemini API
  - Install dependencies (e.g., `npm install openai`)

- [ ] **Create Quiz Generation Service**
  - File: `backend/services/quizGenerationService.js`
  
  - **Generate Questions Function**
    - Accept: subject/topic, difficulty level, number of questions
    - Create prompt for AI:
      ```
      "Generate [number] multiple choice questions about [subject/topic] 
       at [difficulty] difficulty level. Format: JSON with question, 
       4 options, correct answer, and marks."
      ```
    - Call AI API
    - Parse response into quiz format
    - Validate generated questions
    - Return questions array

---

### 9.3 Quiz Attempt & Proctoring

- [ ] **Create Quiz Attempt Controller**
  - File: `backend/controllers/quizAttemptController.js`
  
  - **Start Quiz** (POST /api/quizzes/:id/start) - Student only
    - Check if quiz is active (within time range)
    - Check if student already attempted
    - Create quiz attempt record with status: 'in-progress'
    - Return quiz questions (without answers)
    - Start timer
  
  - **Submit Answer** (POST /api/quiz-attempts/:attemptId/answer) - Student only
    - Save student's answer for a question
    - Don't reveal if correct/incorrect yet
    - Return success
  
  - **Submit Quiz** (POST /api/quiz-attempts/:attemptId/submit) - Student only
    - Mark attempt as 'completed'
    - Calculate marks
    - Check answers against correct answers
    - Update totalMarksObtained
    - Send notification to student with results
    - Return results
  
  - **Auto-Submit on Tab Switch** (POST /api/quiz-attempts/:attemptId/terminate)
    - Called when tab switch detected
    - Mark attempt as 'terminated'
    - Set terminationReason: 'tab-switch'
    - Auto-calculate marks for answered questions
    - Return termination message
  
  - **Record Tab Switch** (POST /api/quiz-attempts/:attemptId/tab-switch) - Student
    - Increment tabSwitchCount
    - If count >= allowed limit (e.g., 1), auto-terminate quiz
    - Return warning or termination status
  
  - **Update Proctoring Status** (POST /api/quiz-attempts/:attemptId/proctoring) - Teacher/TA
    - Record camera/screen share status
    - Log violations (if any)
    - Return updated proctoring data
  
  - **Get Quiz Attempts** (GET /api/quizzes/:id/attempts) - Teacher/TA
    - Return all student attempts for a quiz
    - Include scores, status, proctoring data
  
  - **Get Student Attempt** (GET /api/quiz-attempts/my-attempts) - Student
    - Return student's quiz attempts with results

- [ ] **Create Quiz Attempt Routes**
  - File: `backend/routes/quizAttemptRoutes.js`
  - Define quiz attempt routes

---

### 9.4 Real-Time Proctoring (WebRTC)

- [ ] **Setup WebRTC for Camera/Screen Share**
  - Install dependencies: `npm install socket.io simple-peer`
  - **socket.io**: Real-time communication
  - **simple-peer**: WebRTC peer connection

- [ ] **Create Proctoring Service**
  - File: `backend/services/proctoringService.js`
  
  - **Initialize Socket.IO**
    - Setup Socket.IO server
    - Handle connections from students and teachers/TAs
  
  - **Request Camera Access** (Teacher/TA → Student)
    - Teacher/TA sends request via Socket.IO
    - Student receives request
    - Student enables camera and streams video
    - Teacher/TA receives video stream
  
  - **Request Screen Share** (Teacher/TA → Student)
    - Teacher/TA sends request via Socket.IO
    - Student receives request
    - Student shares screen
    - Teacher/TA receives screen stream
  
  - **Monitor Active Streams**
    - Track active camera/screen share sessions
    - Log any disconnections or issues

- [ ] **Create Proctoring Routes**
  - File: `backend/routes/proctoringRoutes.js`
  - Define proctoring routes for monitoring

---

### 9.5 FRONTEND - Quiz Management UI

#### 9.5.1 Quiz Creation Pages (Teacher)

- [ ] **Quiz List Page**
  - File: `frontend/src/pages/teacher/QuizList.jsx`
  - Display all quizzes for teacher's courses
  - Show: title, course, questions count, duration, date range, status
  - "Create Quiz" button with dropdown: Manual / Upload Excel / Generate with AI
  - Edit/Delete buttons for each quiz
  - **Styling**: Tailwind cards, dropdown menu, badges

- [ ] **Create Quiz Manually**
  - File: `frontend/src/pages/teacher/CreateQuizManual.jsx`
  - Form: quiz title, course selector, duration (minutes), start/end date-time, total marks
  - Add questions section:
    - Question text (textarea)
    - Type: Multiple Choice / True-False
    - 4 options (for MCQ)
    - Correct answer selector
    - Marks for question
    - Difficulty dropdown (Easy/Medium/Hard)
  - "Add Another Question" button
  - Submit quiz button
  - **Styling**: Tailwind form, dynamic question fields, validation

- [ ] **Upload Excel Quiz**
  - File: `frontend/src/pages/teacher/UploadExcelQuiz.jsx`
  - Download template button (Excel format)
  - File upload input (accept .xlsx, .xls)
  - Preview parsed questions before creating
  - Show validation errors if format incorrect
  - Submit button
  - **Styling**: Tailwind file upload, preview table

- [ ] **Generate Quiz with AI**
  - File: `frontend/src/pages/teacher/GenerateQuizAI.jsx`
  - Form inputs:
    - Subject/Topic (text)
    - Number of questions (number input)
    - Difficulty level (Easy/Medium/Hard dropdown)
    - Course selector
    - Duration (minutes)
    - Start/end date-time
  - "Generate Questions" button
  - Show loading spinner during AI generation
  - Preview generated questions
  - Option to edit questions before saving
  - Submit quiz button
  - **Styling**: Tailwind form, loading animation, preview cards

#### 9.5.2 Quiz Taking Interface (Student)

- [ ] **Available Quizzes Page**
  - File: `frontend/src/pages/student/AvailableQuizzes.jsx`
  - Display quizzes by course
  - Show: title, duration, start/end time, total marks, attempt status
  - "Start Quiz" button (only if within time range and not attempted)
  - "View Results" button (if already attempted)
  - **Styling**: Tailwind cards, status badges (Available/Completed/Missed)

- [ ] **Quiz Taking Page**
  - File: `frontend/src/pages/student/TakeQuiz.jsx`
  - Display quiz title, duration, remaining time (countdown timer)
  - Show questions one by one or all at once (configurable)
  - For MCQ: Radio buttons for options
  - For True/False: Radio buttons for True/False
  - "Previous" and "Next" buttons (if one question at a time)
  - Question navigator (show all questions, mark answered/unanswered)
  - "Submit Quiz" button with confirmation dialog
  - Auto-submit when time expires
  - **Tab Switch Detection**:
    - Detect when user switches tabs/windows
    - Show warning modal: "Tab switch detected! Quiz will be terminated."
    - Call API to record tab switch
    - Auto-terminate after limit exceeded
  - **Styling**: Tailwind quiz interface, timer, progress bar

- [ ] **Quiz Results Page**
  - File: `frontend/src/pages/student/QuizResults.jsx`
  - Show: quiz title, obtained marks, total marks, percentage
  - Display all questions with:
    - Student's answer
    - Correct answer
    - Color coding (green for correct, red for wrong)
  - Show feedback (if provided by teacher)
  - **Styling**: Tailwind results layout, color-coded answers

#### 9.5.3 Quiz Proctoring Interface (Teacher/TA)

- [ ] **Quiz Monitoring Dashboard**
  - File: `frontend/src/pages/teacher/QuizMonitoring.jsx`
  - Select quiz to monitor
  - Display list of students currently taking quiz
  - Show for each student:
    - Name, progress (questions answered)
    - Tab switches count
    - Camera status (on/off)
    - Screen share status (on/off)
    - Live video feed (small preview)
  - Click on student → open detailed monitoring view
  - **WebRTC Setup**:
    - Install dependencies: `npm install socket.io-client simple-peer`
    - Connect to Socket.IO server
    - Request camera/screen access from students
    - Receive video streams
  - **Styling**: Tailwind dashboard, video grid, status indicators

- [ ] **Student Detail Monitoring**
  - File: `frontend/src/components/StudentMonitoringModal.jsx`
  - Full screen modal showing:
    - Student name and photo
    - Large camera feed
    - Large screen share feed
    - Tab switch log (timestamps)
    - Violation history
    - "Terminate Quiz" button (if violations detected)
  - **Styling**: Tailwind modal, video players, logs table

- [ ] **Student Quiz Interface (with Proctoring)**
  - Update `TakeQuiz.jsx` to include:
    - Camera access request on quiz start
    - Screen share request (optional or required)
    - Camera preview (small window)
    - Warning indicators if camera/screen share disconnects
    - Automatic termination if proctoring requirements not met
  - **Styling**: Picture-in-picture camera, permission modals

#### 9.5.4 Quiz Results & Analytics (Teacher)

- [ ] **Quiz Results Dashboard**
  - File: `frontend/src/pages/teacher/QuizResults.jsx`
  - Select quiz
  - Display statistics:
    - Average marks
    - Highest/lowest score
    - Pass/fail count
    - Question-wise analysis (which questions were most difficult)
  - Show student results table:
    - Name, marks obtained, percentage, status (passed/failed/terminated)
    - Tab switches count
    - Proctoring violations
  - Export results as CSV/Excel
  - **Styling**: Tailwind stats cards, charts (recharts/chart.js), table

---

## **PHASE 10: TA ELIGIBILITY SYSTEM (Backend + Frontend)** 👨‍🎓

> **Complete TA eligibility and application system (API + UI) in this phase**

---

### 10.1 BACKEND - TA Eligibility API

### 10.1 TA Eligibility Management

- [ ] **Create TA Eligibility Controller**
  - File: `backend/controllers/taEligibilityController.js`
  
  - **Check TA Eligibility** (POST /api/ta-eligibility/check) - Student
    - Get student's completed courses
    - Get current semester
    - Calculate eligible semesters (current semester - 2 or less)
    - For example: Semester 3 student can TA for Semester 1 & 2
    - Return eligible courses and teachers
  
  - **Apply for TA Position** (POST /api/ta-eligibility/apply) - Student
    - Select course and teacher
    - Verify eligibility:
      - Must have completed the course
      - Must have studied under that teacher
      - Course must be from lower semester
    - Create TA eligibility record with `isApproved: false`
    - Send notification to teacher
    - Return success message
  
  - **Get TA Applications** (GET /api/ta-eligibility/applications) - Teacher
    - Return pending TA applications for teacher's courses
    - Include student details and grades
  
  - **Approve TA Application** (PUT /api/ta-eligibility/:id/approve) - Teacher
    - Verify student eligibility
    - Update `isApproved: true`
    - Add student to course TAs list
    - Update user role to include 'ta' (if not already)
    - Send notification to student
    - Return success
  
  - **Reject TA Application** (PUT /api/ta-eligibility/:id/reject) - Teacher
    - Update application status
    - Send notification to student with reason
    - Return success
  
  - **Get My TA Courses** (GET /api/ta-eligibility/my-courses) - TA
    - Return courses where user is approved as TA
    - Include teacher and course details

- [ ] **Create TA Eligibility Routes**
  - File: `backend/routes/taEligibilityRoutes.js`
  - Define TA eligibility routes

- [ ] **Update User Management**
  - Modify user creation/update to handle dual roles (student + TA)
  - Student can be both enrolled in courses AND be TA for other courses

---

### 10.2 FRONTEND - TA Eligibility & Application UI

#### 10.2.1 Student: Check Eligibility & Apply

- [ ] **TA Opportunities Page**
  - File: `frontend/src/pages/student/TAOpportunities.jsx`
  - Button: "Check My Eligibility"
  - On click → call eligibility check API
  - Display eligible courses in cards:
    - Course code, course name
    - Semester (e.g., Semester 1)
    - Teacher name
    - Your grade in this course
    - "Apply as TA" button
  - Show message if no eligible courses
  - **Styling**: Tailwind cards, grid layout, apply button

- [ ] **Apply for TA Position**
  - File: `frontend/src/components/ApplyTAModal.jsx`
  - Modal opens when "Apply as TA" clicked
  - Show course and teacher details
  - Optional: Add statement of interest (textarea)
  - Confirm application button
  - Call apply API
  - Show success message
  - **Styling**: Tailwind modal, form fields

- [ ] **My TA Applications Page**
  - File: `frontend/src/pages/student/MyTAApplications.jsx`
  - Display all submitted applications
  - Show: course, teacher, application date, status (Pending/Approved/Rejected)
  - If rejected, show reason
  - **Styling**: Tailwind table, status badges

#### 10.2.2 Teacher: Approve TA Applications

- [ ] **TA Applications Page**
  - File: `frontend/src/pages/teacher/TAApplications.jsx`
  - Display pending TA applications for teacher's courses
  - Show in cards:
    - Student name and ID
    - Course applied for
    - Student's grade in the course
    - Application date
    - Student's current semester
    - "View Details" button
  - **Styling**: Tailwind cards, grid layout

- [ ] **Application Detail Modal**
  - File: `frontend/src/components/TAApplicationDetail.jsx`
  - Show full student information:
    - Name, email, student ID
    - Current semester
    - All completed courses with grades
    - Statement of interest (if provided)
  - Action buttons:
    - "Approve" (green button)
    - "Reject" (red button with reason textarea)
  - Call approve/reject API
  - Update application list
  - **Styling**: Tailwind modal, action buttons, tables

#### 10.2.3 TA: View Assigned Courses

- [ ] **My TA Courses Page**
  - File: `frontend/src/pages/ta/MyTACourses.jsx`
  - Display courses where user is approved as TA
  - Show: course code, name, teacher, semester
  - Click on course → navigate to course detail page (with TA permissions)
  - Show TA responsibilities:
    - Can upload materials
    - Can grade assignments (if teacher allows)
    - Can mark attendance
  - **Styling**: Tailwind cards, list layout

---

## **PHASE 11: ADMIN PANEL & WORKFLOWS (Backend + Frontend)** 👨‍💼

> **Complete admin panel with all management features (API + UI) in this phase**

---

### 11.1 BACKEND - Admin Workflows API

### 9.1 Admin System Configuration (REQ-ADM-1 to REQ-ADM-3)

- [ ] **Create Admin Controller**
  - File: `backend/controllers/adminController.js`
  
  - **Create and Assign Course** (POST /api/admin/courses) (REQ-ADM-1)
    - Create course
    - Assign teacher
    - Assign TAs
    - Enroll students (bulk upload via CSV)
    - Return created course
  
  - **Manage User Roles** (PUT /api/admin/users/:id/role) (REQ-ADM-2)
    - Update user role
    - Validate role change
    - Return updated user
  
  - **Configure Semester** (POST /api/admin/semester) (REQ-ADM-3)
    - Set semester name
    - Set start and end dates
    - Set registration period
    - Save to configuration collection
  
  - **Get System Configuration** (GET /api/admin/config)
    - Return current semester settings
  
  - **Bulk User Import** (POST /api/admin/users/import)
    - Accept CSV file
    - Parse and validate user data
    - Create multiple users at once
    - Return import summary

- [ ] **Create Admin Routes**
  - File: `backend/routes/adminRoutes.js`
  - Define admin routes
  - Apply admin-only authorization

- [ ] **Create Configuration Schema**
  - File: `backend/models/Configuration.js`
  - Store system-wide settings
  - Semester information
  - Academic calendar

---

### 11.2 FRONTEND - Admin Panel UI

#### 11.2.1 Admin Dashboard

- [ ] **Admin Dashboard Page** (REQ-ADM-1, REQ-ADM-2, REQ-ADM-3)
  - File: `frontend/src/pages/admin/AdminDashboard.jsx`
  - Display system statistics:
    - Total users (students, teachers, TAs, admins)
    - Total courses
    - Active assignments
    - Active quizzes
    - System activity (logins, submissions today)
  - Quick action buttons:
    - Create User
    - Create Course
    - Configure Semester
    - View Logs
  - Recent activity feed
  - **Styling**: Tailwind stats cards, action buttons, activity timeline

#### 11.2.2 User Management (Admin)

- [ ] **Enhanced User Management Page** (REQ-ADM-2, REQ-ADM-4)
  - File: `frontend/src/pages/admin/UserManagement.jsx`
  - Display all users in table
  - Filters: Role (All/Student/Teacher/TA/Admin), Status (Active/Inactive)
  - Search by name, email, ID
  - Columns: Name, Email, Role, Status, Actions
  - Actions:
    - Edit (change name, email, role)
    - Deactivate/Activate
    - Reset Password
    - Delete (soft delete)
  - Bulk actions:
    - Import users from CSV
    - Export users to CSV
    - Bulk role change
  - **Styling**: Tailwind table, filters, bulk action toolbar

- [ ] **Bulk User Import**
  - File: `frontend/src/components/BulkUserImport.jsx`
  - Download CSV template button
  - File upload (CSV)
  - Preview imported users before creating
  - Show validation errors
  - Confirm import button
  - **Styling**: Tailwind modal, file upload, preview table

#### 11.2.3 Course Management (Admin)

- [ ] **Course Management Page** (REQ-ADM-1)
  - File: `frontend/src/pages/admin/CourseManagement.jsx`
  - Display all courses in table
  - Columns: Code, Name, Teacher, TAs, Enrolled Students, Semester, Status
  - Actions:
    - Edit course
    - Assign/Remove teacher
    - Manage TAs
    - Enroll students (bulk)
    - Deactivate course
  - "Create Course" button
  - **Styling**: Tailwind table, action buttons

- [ ] **Assign Teacher to Course**
  - File: `frontend/src/components/AssignTeacherModal.jsx`
  - Search and select teacher from dropdown
  - Show current teacher (if any)
  - Confirm assignment
  - **Styling**: Tailwind modal, searchable select

- [ ] **Enroll Students Bulk**
  - File: `frontend/src/components/EnrollStudentsBulk.jsx`
  - Select course
  - Upload CSV with student IDs/emails
  - Or multi-select from student list
  - Preview selected students
  - Confirm enrollment
  - **Styling**: Tailwind modal, multi-select, file upload

#### 11.2.4 System Configuration (Admin)

- [ ] **System Configuration Page** (REQ-ADM-3)
  - File: `frontend/src/pages/admin/SystemConfig.jsx`
  - Tabs:
    - Semester Settings
    - Academic Calendar
    - System Settings
  
  **Semester Settings Tab:**
  - Current semester name (e.g., "Fall 2024")
  - Start date, end date
  - Registration period (start/end)
  - Save button
  
  **Academic Calendar Tab:**
  - Add important dates:
    - Midterm exam period
    - Final exam period
    - Holidays
  - Calendar view
  
  **System Settings Tab:**
  - Max file upload size
  - Allowed file types
  - Email notifications (enable/disable)
  - 2FA enforcement (optional/required)
  - Low attendance threshold
  - Tab switch limit for quizzes
  
  - **Styling**: Tailwind tabs, forms, date pickers

#### 11.2.5 Reports & Analytics (Admin)

- [ ] **System Reports Page**
  - File: `frontend/src/pages/admin/Reports.jsx`
  - Generate reports:
    - User activity report (date range)
    - Course enrollment report
    - Assignment submission statistics
    - Quiz performance analytics
    - Attendance summary
  - Export buttons (PDF, Excel, CSV)
  - **Styling**: Tailwind report cards, charts, export buttons

- [ ] **Audit Logs Page**
  - File: `frontend/src/pages/admin/AuditLogs.jsx`
  - Display system audit logs:
    - User actions (login, logout, create, update, delete)
    - Timestamp, user, action, details
  - Filters: Date range, user, action type
  - Export logs
  - **Styling**: Tailwind table, filters, pagination

---

## **PHASE 12: TESTING & QUALITY ASSURANCE** 🧪

> **Test all features thoroughly before deployment**

---

### 12.1 Backend API Testing

- [ ] **Setup Testing Framework**
  - Install dependencies: `npm install --save-dev jest supertest`
  - Configure Jest for Node.js
  - Setup test database (separate from development)

- [ ] **Write API Tests**
  - File: `backend/tests/` directory
  
  **Authentication Tests**
  - Test user registration
  - Test login (valid/invalid credentials)
  - Test 2FA flow
  - Test JWT token generation
  - Test protected routes
  
  **Course Tests**
  - Test course creation
  - Test material upload
  - Test enrollment
  
  **Assignment Tests**
  - Test assignment creation
  - Test submission
  - Test grading
  
  **Quiz Tests**
  - Test quiz creation (manual, Excel, AI)
  - Test quiz attempt
  - Test tab switch detection
  
  **TA Eligibility Tests**
  - Test eligibility calculation
  - Test application
  - Test approval/rejection

- [ ] **Postman Collection**
  - Create comprehensive Postman collection
  - Add all API endpoints
  - Add test cases
  - Export collection for documentation

---

### 12.2 Frontend Component Testing

- [ ] **Setup Testing Framework**
  - Install dependencies: `npm install --save-dev @testing-library/react @testing-library/jest-dom`
  - Configure React Testing Library

- [ ] **Write Component Tests**
  - File: `frontend/src/tests/` directory
  
  **Component Tests**
  - Test login form submission
  - Test course card rendering
  - Test assignment submission form
  - Test notification bell
  - Test quiz timer
  
  **Integration Tests**
  - Test authentication flow
  - Test course creation to material upload
  - Test assignment creation to grading

---

### 12.3 End-to-End Testing

- [ ] **Setup E2E Testing**
  - Install Cypress: `npm install --save-dev cypress`
  - Configure Cypress
  - Create test fixtures

- [ ] **Write E2E Tests**
  - File: `cypress/e2e/` directory
  
  **User Flows**
  - Student: Login → View Courses → Submit Assignment → Take Quiz
  - Teacher: Login → Create Course → Upload Material → Create Assignment → Grade
  - Admin: Login → Create User → Assign Course → Configure System
  - TA: Login → Check Eligibility → Apply → View Assigned Courses

---

### 12.4 Performance Testing

- [ ] **Load Testing**
  - Use tools: Artillery, Apache JMeter
  - Test API endpoints under load
  - Test concurrent quiz taking
  - Test file uploads

- [ ] **Frontend Performance**
  - Test page load times
  - Optimize bundle size
  - Lazy loading for routes
  - Image optimization

---

### 12.5 Security Testing

- [ ] **Security Checks**
  - SQL injection prevention (MongoDB uses BSON, but check input validation)
  - XSS prevention
  - CSRF protection
  - JWT token security
  - File upload security (malicious files)
  - Rate limiting on APIs
  - Password strength enforcement
  - 2FA implementation review

---

## **PHASE 13: DEPLOYMENT** 🚀

> **Deploy application to production**

---

### 13.1 Backend Deployment

- [ ] **Prepare for Deployment**
  - Setup environment variables (.env)
  - Configure production MongoDB Atlas
  - Setup CORS for production frontend URL
  - Add compression middleware
  - Add security headers (helmet)
  - Setup logging (winston, morgan)

- [ ] **Choose Hosting Platform**
  - **Option 1: Heroku**
    - Create Heroku app
    - Add MongoDB Atlas connection
    - Deploy: `git push heroku main`
  
  - **Option 2: AWS EC2**
    - Setup EC2 instance
    - Install Node.js, MongoDB
    - Configure nginx reverse proxy
    - Setup PM2 for process management
  
  - **Option 3: DigitalOcean**
    - Create Droplet
    - Similar to AWS setup
  
  - **Option 4: Render**
    - Connect GitHub repo
    - Auto-deploy on push

- [ ] **Database Setup**
  - Create MongoDB Atlas cluster (free tier M0)
  - Configure network access (allow all or specific IPs)
  - Get connection string
  - Import initial data if needed

- [ ] **Domain & SSL**
  - Purchase domain (optional)
  - Configure DNS
  - Setup SSL certificate (Let's Encrypt, Cloudflare)

---

### 13.2 Frontend Deployment

- [ ] **Build Frontend**
  - Run: `npm run build`
  - Test build locally
  - Update API base URL to production backend

- [ ] **Choose Hosting Platform**
  - **Option 1: Vercel**
    - Connect GitHub repo
    - Auto-deploy on push
    - Free SSL and CDN
  
  - **Option 2: Netlify**
    - Drag-and-drop build folder or connect GitHub
    - Auto-deploy
    - Free SSL
  
  - **Option 3: AWS S3 + CloudFront**
    - Upload build to S3 bucket
    - Configure static website hosting
    - Setup CloudFront for CDN
  
  - **Option 4: GitHub Pages**
    - Only for static sites without backend routing

---

### 13.3 Post-Deployment

- [ ] **Testing in Production**
  - Test all user flows
  - Test on different devices (mobile, tablet, desktop)
  - Test on different browsers (Chrome, Firefox, Safari, Edge)
  - Check API response times
  - Monitor error logs

- [ ] **Monitoring & Analytics**
  - Setup error tracking (Sentry)
  - Setup analytics (Google Analytics)
  - Setup uptime monitoring (UptimeRobot, Pingdom)
  - Monitor server resources

- [ ] **Backup Strategy**
  - Setup automated MongoDB backups
  - Backup uploaded files (assignments, materials)
  - Document restore procedures

---

## **PHASE 14: DOCUMENTATION** 📚

> **Create comprehensive documentation for users and developers**

---

### 14.1 API Documentation

- [ ] **Create API Documentation**
  - Use Swagger/OpenAPI specification
  - Install: `npm install swagger-ui-express swagger-jsdoc`
  - Document all endpoints:
    - Method, URL, description
    - Request parameters
    - Request body (with examples)
    - Response format (with examples)
    - Authentication requirements
    - Error codes
  
- [ ] **Postman Documentation**
  - Export Postman collection
  - Add descriptions for each request
  - Share collection link

---

### 14.2 User Guides

- [ ] **Student User Guide**
  - How to login (with 2FA)
  - How to view courses and materials
  - How to submit assignments
  - How to take quizzes
  - How to view grades
  - How to check attendance
  - How to apply for TA position

- [ ] **Teacher User Guide**
  - How to create courses
  - How to upload materials
  - How to create assignments
  - How to grade submissions
  - How to create quizzes (manual, Excel, AI)
  - How to monitor quiz proctoring
  - How to mark attendance
  - How to approve TA applications
  - How to create announcements

- [ ] **TA User Guide**
  - How to apply for TA position
  - TA responsibilities
  - How to upload materials
  - How to grade assignments (if allowed)
  - How to mark attendance

- [ ] **Admin User Guide**
  - How to create users
  - How to manage courses
  - How to configure system settings
  - How to generate reports
  - How to view audit logs

---

### 14.3 Developer Documentation

- [ ] **Project Setup Guide**
  - Prerequisites (Node.js, MongoDB)
  - Clone repository
  - Install dependencies
  - Configure environment variables
  - Run development servers

- [ ] **Architecture Documentation**
  - System architecture diagram
  - Database schema
  - API structure
  - Frontend component hierarchy
  - Authentication flow
  - WebRTC proctoring architecture

- [ ] **Code Documentation**
  - Add JSDoc comments to functions
  - Explain complex algorithms (similarity checker, AI quiz generation)
  - Document environment variables

- [ ] **Contributing Guide**
  - Code style guidelines
  - Git workflow
  - Pull request process
  - Testing requirements

---

### 14.4 Final Project Report

- [ ] **Write FYP Report**
  - **Title Page**: Project name, team members, supervisor
  - **Abstract**: Summary of project
  - **Introduction**: Problem statement, objectives
  - **Literature Review**: Existing systems, technologies
  - **System Design**: Architecture, database design, UI/UX design
  - **Implementation**: Technologies used, key features
  - **Testing**: Test cases, results, screenshots
  - **Results & Discussion**: Achievements, challenges, solutions
  - **Conclusion**: Summary, future work
  - **References**: Citations
  - **Appendices**: Code snippets, user manual

- [ ] **Presentation Slides**
  - Create PowerPoint/Google Slides
  - Demo video (5-10 minutes)
  - Screenshots of key features
  - Architecture diagrams

---

## **PHASE 15: UI/UX POLISH & FINAL TOUCHES** 🎨

> **Enhance user experience and polish the application**

---

### 15.1 Responsive Design

- [ ] **Mobile Responsiveness**
  - Test all pages on mobile devices (320px to 768px)
  - Ensure Tailwind responsive classes are used correctly
  - Test hamburger menu for navigation
  - Ensure forms are mobile-friendly
  - Test file uploads on mobile
  - Fix any layout issues

- [ ] **Tablet Responsiveness**
  - Test on tablet sizes (768px to 1024px)
  - Adjust grid layouts for tablet
  - Ensure navigation works well

- [ ] **Desktop Optimization**
  - Test on large screens (1920px+)
  - Ensure proper max-width on content
  - Optimize spacing and layout

---

### 15.2 UI Improvements

- [ ] **Loading States**
  - Add loading spinners for API calls
  - Add skeleton loaders for content
  - Add progress bars for file uploads
  - Disable buttons during submission

- [ ] **Error Handling**
  - Display user-friendly error messages
  - Add toast notifications for success/error
  - Add form validation error messages
  - Handle network errors gracefully

- [ ] **Empty States**
  - Add "No courses yet" messages with helpful text
  - Add "No assignments" empty state
  - Add illustrations for empty states

- [ ] **Animations & Transitions**
  - Add smooth page transitions
  - Add hover effects on buttons and cards
  - Add fade-in animations for modals
  - Add slide-in for notifications
  - Keep animations subtle and fast (< 300ms)

---

### 15.3 Accessibility (A11y)

- [ ] **Keyboard Navigation**
  - Ensure all interactive elements are keyboard accessible
  - Add proper focus indicators
  - Test tab order

- [ ] **ARIA Labels**
  - Add aria-labels to icon buttons
  - Add alt text to images
  - Add proper heading hierarchy (h1, h2, h3)

- [ ] **Color Contrast**
  - Ensure text has sufficient contrast (WCAG AA)
  - Test with color blindness simulators
  - Don't rely solely on color for information

---

### 15.4 Performance Optimization

- [ ] **Frontend Performance**
  - Lazy load routes with React.lazy()
  - Optimize images (compress, use WebP)
  - Code splitting for large components
  - Memoize expensive calculations with useMemo
  - Use React.memo for components that don't change often
  - Debounce search inputs

- [ ] **Backend Performance**
  - Add database indexes on frequently queried fields
  - Paginate large data sets
  - Cache frequently accessed data (Redis optional)
  - Optimize MongoDB queries
  - Add response compression (gzip)

---

### 15.5 User Experience Enhancements

- [ ] **Feedback & Confirmation**
  - Add confirmation dialogs for destructive actions (delete, terminate quiz)
  - Show success messages after actions
  - Add undo option where applicable

- [ ] **Navigation Improvements**
  - Add breadcrumbs for nested pages
  - Add "Back" buttons
  - Highlight active nav item
  - Add search functionality for large lists

- [ ] **Help & Guidance**
  - Add tooltips for complex features
  - Add "?" help icons with explanations
  - Add guided tours for new users (optional)
  - Add placeholder text in forms

---

### 15.6 Final Testing & Bug Fixes

- [ ] **Cross-Browser Testing**
  - Test on Chrome, Firefox, Safari, Edge
  - Fix browser-specific issues
  - Test on different OS (Windows, Mac, Linux)

- [ ] **Bug Fixes**
  - Review and fix all known bugs
  - Test all user flows end-to-end
  - Fix any console errors/warnings
  - Test edge cases

- [ ] **Code Cleanup**
  - Remove console.log statements
  - Remove unused imports
  - Remove commented code
  - Format code consistently (Prettier)
  - Fix ESLint warnings

---

- [ ] **Create API Client**
  - File: `src/services/api.js`
  - Configure axios with base URL
  - Add interceptors for authentication token
  - Handle errors globally

- [ ] **Create Auth Service**
  - File: `src/services/authService.js`
  - `login(email, password)` - Call login API
  - `register(userData)` - Call register API
  - `logout()` - Clear token and logout
  - `getCurrentUser()` - Get current user data
  - `isAuthenticated()` - Check if user is logged in

- [ ] **Create Course Service**
  - File: `src/services/courseService.js`
  - `getAllCourses()` - Get courses
  - `getCourseById(id)` - Get single course
  - `createCourse(courseData)` - Create course
  - `updateCourse(id, courseData)` - Update course
  - `uploadMaterial(courseId, file)` - Upload material

- [ ] **Create Assignment Service**
  - File: `src/services/assignmentService.js`
  - `getAllAssignments()` - Get assignments
  - `getAssignmentById(id)` - Get single assignment
  - `createAssignment(data)` - Create assignment
  - `submitAssignment(id, file)` - Submit assignment
  - `gradeSubmission(id, marks, feedback)` - Grade submission

- [ ] **Create Attendance Service**
  - File: `src/services/attendanceService.js`
  - `markAttendance(data)` - Mark attendance
  - `getMyAttendance()` - Get student attendance
  - `getCourseAttendance(courseId)` - Get course attendance

- [ ] **Create Announcement Service**
  - File: `src/services/announcementService.js`
  - `getAnnouncements()` - Get all announcements
  - `createAnnouncement(data)` - Create announcement

- [ ] **Create Notification Service**
  - File: `src/services/notificationService.js`
  - `getNotifications()` - Get user notifications
  - `markAsRead(id)` - Mark notification as read

---

## **ADDITIONAL ENHANCEMENTS** ✨

### 11.1 Login Page

- [ ] **Create Login Component**
  - File: `src/pages/Login.js`
  - **Step 1: Email & Password**
    - Form fields: email, password
    - Validate input (REQ-UM-5)
    - Show error messages for invalid credentials
    - Show account locked message after 5 failed attempts (REQ-UM-6)
  - **Step 2: Two-Factor Authentication (if required)**
    - If response is "2FA_REQUIRED":
      - Show 2FA input field (6-digit code)
      - User enters code from authenticator app or email
      - Submit 2FA code for verification
    - If device is trusted, skip 2FA
  - **Optional: Remember this device checkbox**
    - Add device to trusted devices list
  - On success: Store JWT token in localStorage
  - Redirect to dashboard based on role

- [ ] **Create 2FA Setup Component**
  - File: `src/components/TwoFactorSetup.js`
  - Show QR code for scanning with authenticator app
  - Input field to verify setup code
  - Enable/disable 2FA toggle
  - List of trusted devices with remove option

- [ ] **Create Login Styling with Tailwind CSS**
  - File: `src/pages/Login.js` (inline Tailwind classes)
  - Modern, responsive design using Tailwind utilities
  - University branding colors
  - Smooth transitions between login steps

---

### 11.2 Role-Based Dashboards

- [ ] **Create Student Dashboard**
  - File: `src/pages/StudentDashboard.js`
  - Show enrolled courses
  - Show upcoming assignments and deadlines
  - Show recent announcements
  - Show attendance percentage
  - Quick links to courses, assignments, announcements

- [ ] **Create Teacher Dashboard**
  - File: `src/pages/TeacherDashboard.js`
  - Show teaching courses
  - Show pending submissions to grade
  - Quick access to create assignment
  - Quick access to mark attendance
  - Show announcement creation

- [ ] **Create TA Dashboard**
  - File: `src/pages/TADashboard.js`
  - Show assigned courses
  - Show pending tasks (grade submissions, upload materials)
  - Quick access to mark attendance

- [ ] **Create Admin Dashboard**
  - File: `src/pages/AdminDashboard.js`
  - System statistics (total users, courses, active students)
  - User management access
  - Course management access
  - System configuration access

---

## **PHASE 14: FRONTEND DEVELOPMENT - COURSE PAGES** 📚

### 12.1 Course List Page

- [ ] **Create Course List Component**
  - File: `src/pages/Courses.js`
  - Display courses as cards or table
  - Show course code, name, teacher, credit hours
  - Filter by semester
  - Search by course name/code
  - Click on course to view details

- [ ] **Create Course Card Component**
  - File: `src/components/CourseCard.js`
  - Reusable course card
  - Show course information
  - Show enrollment count (for teachers)

---

### 12.2 Course Detail Page

- [ ] **Create Course Detail Component**
  - File: `src/pages/CourseDetail.js`
  - Show course information
  - Tabs for: Materials, Assignments, Attendance, Announcements
  
  - **Materials Tab:**
    - List all course materials
    - Filter by type (notes/slides/reading)
    - Download button
    - Upload button (Teacher/TA only)
    - Generate summary button (Teacher only)
  
  - **Assignments Tab:**
    - List all assignments
    - Show due date and status
    - Click to view/submit
  
  - **Attendance Tab:**
    - For students: Show attendance percentage and records
    - For teachers: Mark attendance button, view analytics
  
  - **Announcements Tab:**
    - Show course-specific announcements
    - Create announcement button (Teacher/TA)

---

### 12.3 Material Upload & Management

- [ ] **Create Material Upload Component**
  - File: `src/components/MaterialUpload.js`
  - File upload form
  - Material type selection (notes/slides/reading)
  - Title input
  - Validate file type and size (REQ-CCM-4, REQ-CCM-5)
  - Show upload progress
  - Show error messages
  - On success: Refresh material list

- [ ] **Create Material List Component**
  - File: `src/components/MaterialList.js`
  - Display materials in table/list
  - Show title, type, uploaded by, date
  - Download button
  - Delete button (Teacher only)
  - View summary button (if available)

---

## **PHASE 15: FRONTEND DEVELOPMENT - ASSIGNMENT PAGES** 📝

### 13.1 Assignment List Page

- [ ] **Create Assignment List Component**
  - File: `src/pages/Assignments.js`
  - Display all assignments
  - For students: Show submission status, due date
  - For teachers: Show assignment title, course, submissions count
  - Filter by course
  - Sort by due date
  - Click to view details

---

### 13.2 Assignment Detail & Submission Page

- [ ] **Create Assignment Detail Component (Student View)**
  - File: `src/pages/AssignmentDetail.js`
  - Show assignment title, description, due date, total marks
  - Download assignment file if available
  - Show submission status
  - **If not submitted:**
    - File upload form
    - Submit button
    - Check deadline (REQ-AM-2, REQ-AM-3)
    - Show warning if late submission not allowed
  - **If submitted:**
    - Show submission date and time
    - Show late status
    - Show marks and feedback if graded
    - Show similarity score if available

---

### 13.3 Assignment Management (Teacher)

- [ ] **Create Assignment Creation Form**
  - File: `src/components/CreateAssignment.js`
  - Form fields: title, description, due date, total marks
  - Course selection
  - Late submission toggle
  - Upload assignment file (optional)
  - Submit to create assignment
  - Send notification to students (REQ-AM-4)

- [ ] **Create Submissions View (Teacher)**
  - File: `src/components/SubmissionsList.js`
  - Display all student submissions for assignment
  - Show student name, submission date, late status
  - Download submission button
  - Grade button
  - Check similarity button
  - Show similarity scores if checked

- [ ] **Create Grading Modal**
  - File: `src/components/GradeModal.js`
  - Input marks obtained
  - Textarea for feedback
  - Submit to grade
  - Show success message

---

## **PHASE 16: FRONTEND DEVELOPMENT - QUIZ MANAGEMENT & PROCTORING** 📝🎥

### 16.1 Quiz Creation (Teacher)

- [ ] **Create Quiz Creation Form**
  - File: `src/components/CreateQuiz.js`
  - Form fields: title, description, duration, start/end time, passing marks
  - Difficulty selector (easy/medium/hard)
  - **Option 1: Manual Question Entry**
    - Add questions manually with type (MCQ/True-False/Short Answer)
    - For MCQs: Add options and select correct answer
    - Set marks per question
  - **Option 2: Upload Excel File**
    - File upload input (accepts .xlsx, .xls)
    - Download sample Excel template
    - Parse and preview questions before creating quiz
  - **Option 3: AI Generation**
    - Input: Subject/Topic
    - Select difficulty (easy/medium/hard)
    - Select number of questions
    - Click "Generate with AI"
    - Show loading indicator
    - Preview generated questions
    - Option to edit before saving
  - Proctoring settings:
    - Toggle: Require camera
    - Toggle: Require screen share
    - Toggle: Allow tab switching (default: No)
  - Submit to create quiz

- [ ] **Create Quiz List Component (Teacher View)**
  - File: `src/components/QuizList.js`
  - Display all quizzes for course
  - Show title, date, duration, difficulty
  - Filter by difficulty, status (upcoming/active/past)
  - View attempts button
  - Edit/delete quiz options

---

### 16.2 Quiz Taking Interface (Student)

- [ ] **Create Quiz Start Page**
  - File: `src/pages/QuizStart.js`
  - Show quiz details (title, duration, marks, instructions)
  - Show proctoring requirements (camera/screen share)
  - "Start Quiz" button
  - Request camera/screen share permissions if required
  - Verify permissions granted before starting

- [ ] **Create Quiz Interface Component**
  - File: `src/pages/TakeQuiz.js`
  - **Quiz Header:**
    - Timer (countdown)
    - Question number (e.g., "Question 5 of 20")
    - Auto-submit warning when time is low
  - **Question Display:**
    - Show question text
    - For MCQs: Radio buttons for options
    - For True/False: Two radio buttons
    - For Short Answer: Text input
  - **Navigation:**
    - Previous/Next buttons
    - Question palette showing all questions
    - Mark for review option
  - **Proctoring Display:**
    - Small camera preview (if required)
    - Screen share indicator
  - **Submit Quiz button**
  - Confirmation dialog before submission

- [ ] **Implement Quiz Security Features**
  - File: `src/pages/TakeQuiz.js`
  
  - **Disable Right-Click & Inspect Element**
    ```js
    useEffect(() => {
      // Disable right-click
      const handleContextMenu = (e) => e.preventDefault();
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      const handleKeyDown = (e) => {
        if (e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
            (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
            (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
          e.preventDefault();
        }
      };
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, []);
    ```
  
  - **Detect Tab Switching**
    ```js
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Tab switched - send warning to backend
          recordTabSwitch();
          // If not allowed, terminate quiz
          if (!quiz.allowTabSwitch) {
            terminateQuiz('tab-switch');
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, []);
    ```
  
  - **Auto-Submit on Tab Switch**
    - Call API to terminate quiz
    - Show alert: "Quiz terminated due to tab switching"
    - Redirect to results page

- [ ] **Implement WebRTC Camera & Screen Share**
  - Install dependencies: `npm install simple-peer socket.io-client`
  - File: `src/services/proctoringService.js`
  
  - **Camera Access**
    ```js
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, audio: false 
        });
        // Display in small preview window
        // Stream to teacher/TA via WebRTC
        return stream;
      } catch (err) {
        alert('Camera access denied. You cannot take this quiz.');
      }
    };
    ```
  
  - **Screen Share**
    ```js
    const enableScreenShare = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true 
        });
        // Stream to teacher/TA via WebRTC
        return stream;
      } catch (err) {
        alert('Screen share denied. You cannot take this quiz.');
      }
    };
    ```
  
  - **Socket.IO Connection**
    - Connect to backend Socket.IO server
    - Listen for camera/screen share requests from teacher/TA
    - Send video streams via WebRTC peer connection

---

### 16.3 Quiz Monitoring (Teacher/TA)

- [ ] **Create Quiz Monitoring Dashboard**
  - File: `src/components/QuizMonitoring.js`
  - **Active Quiz List:**
    - Show students currently taking quiz
    - Status: In Progress / Completed / Terminated
    - Time remaining for each student
  - **Student Grid View:**
    - Display all students in grid
    - Show camera feed (if enabled)
    - Show screen share (if enabled)
    - Click on student to view full screen
  - **Request Camera/Screen Share:**
    - Button: "Request Camera" for specific student
    - Button: "Request Screen Share" for specific student
    - Send request via Socket.IO
  - **Violation Alerts:**
    - Show real-time alerts for tab switches
    - Show alert if student disconnects camera/screen share
  - **Manual Termination:**
    - Button to terminate quiz for specific student (with reason)

- [ ] **Create Quiz Results View (Teacher)**
  - File: `src/components/QuizResults.js`
  - Display all student attempts
  - Show scores, status, completion time
  - Show proctoring violations
  - Filter by status (completed/terminated)
  - Export results to Excel

---

## **PHASE 17: FRONTEND DEVELOPMENT - TA ELIGIBILITY & APPLICATION** 👨‍🎓

### 17.1 TA Application (Student)

- [ ] **Create TA Eligibility Checker**
  - File: `src/components/TAEligibilityChecker.js`
  - Button: "Check TA Eligibility"
  - Display eligible courses:
    - Courses from lower semesters (current semester - 1 or 2)
    - Courses completed with good grades
    - Teachers under whom student studied
  - For each eligible course:
    - Show course name, teacher, semester
    - "Apply as TA" button

- [ ] **Create TA Application Form**
  - File: `src/components/TAApplicationForm.js`
  - Display selected course and teacher
  - Confirm eligibility criteria shown
  - Optional: Message to teacher
  - Submit application
  - Show success message

- [ ] **Create TA Application Status Page**
  - File: `src/pages/TAApplicationStatus.js`
  - Show all submitted applications
  - Status: Pending / Approved / Rejected
  - For approved: Show assigned course details
  - For rejected: Show reason (if provided)

---

### 17.2 TA Management (Teacher)

- [ ] **Create TA Applications List (Teacher View)**
  - File: `src/components/TAApplicationsList.js`
  - Display pending TA applications
  - Show student name, current semester, grades
  - Show course for which student is applying
  - Actions: Approve / Reject
  - On approve: Add student as TA for course
  - On reject: Optional reason text

- [ ] **Update Course Detail Page**
  - Show current TAs for course
  - Option to remove TA
  - Show TA applications count

---

## **PHASE 18: FRONTEND DEVELOPMENT - AI FEATURES** 🤖

### 14.1 Similarity Checker Interface

- [ ] **Create Similarity Checker Component**
  - File: `src/components/SimilarityChecker.js`
  - Button: "Check Similarity" (Teacher only)
  - Show loading indicator during analysis
  - Display results:
    - Table showing each student submission
    - Similarity score (percentage)
    - Status (pending/acceptable/suspicious)
    - Highlight high similarity scores (>70%)
  - Action buttons: Mark as acceptable/suspicious
  - Show error if document unreadable (REQ-AI-SC-4)

---

### 14.2 Summarization Interface

- [ ] **Create Summarization Component**
  - File: `src/components/SummarizationTool.js`
  - Button: "Generate Summary" next to material (Teacher only)
  - Show loading indicator
  - Display generated summary:
    - Structured format (bullet points)
    - Key highlights
  - Save button to store summary
  - Show error if content illegible (REQ-AI-SUM-3)

- [ ] **Create Summary View Component**
  - File: `src/components/SummaryView.js`
  - Display saved summary for material
  - Available for all users (students can view)
  - Print/download summary option

---

## **PHASE 19: FRONTEND DEVELOPMENT - ATTENDANCE** 📊

### 15.1 Mark Attendance (Teacher/TA)

- [ ] **Create Attendance Marking Component**
  - File: `src/components/MarkAttendance.js`
  - Select course and date
  - Display list of enrolled students
  - Radio buttons/checkboxes: Present/Absent/Late
  - Select all present button
  - Submit attendance
  - Show success message

---

### 15.2 Attendance Analytics (Student)

- [ ] **Create Student Attendance View**
  - File: `src/components/StudentAttendance.js`
  - Display attendance records by course
  - Show percentage (REQ-AT-3)
  - Visual chart (pie chart/bar chart)
  - Show present/absent/late counts
  - Display warning if < 75% (REQ-AT-5)
  - Filter by course and date range

---

### 15.3 Attendance Analytics (Teacher)

- [ ] **Create Course Attendance Analytics**
  - File: `src/components/CourseAttendanceAnalytics.js`
  - Display overall course attendance
  - List students with low attendance
  - Export attendance report (CSV)
  - Filter by date range
  - Visual charts

---

## **PHASE 20: FRONTEND DEVELOPMENT - ANNOUNCEMENTS & NOTIFICATIONS** 📢

### 16.1 Announcements Page

- [ ] **Create Announcements List Component**
  - File: `src/pages/Announcements.js`
  - Display all announcements
  - Show title, content, date, priority
  - Filter by course
  - Sort by date
  - Create announcement button (Teacher/TA/Admin)

- [ ] **Create Announcement Creation Form**
  - File: `src/components/CreateAnnouncement.js`
  - Form fields: title, content, priority
  - Select target audience (all/students/specific course)
  - Submit to create
  - Show success message

---

### 16.2 Notification System

- [ ] **Create Notification Bell Component**
  - File: `src/components/NotificationBell.js`
  - Display in header/navbar
  - Show unread count badge
  - Click to open dropdown with notifications
  - List recent notifications
  - Mark as read on click
  - Link to related content

- [ ] **Create Notifications Page**
  - File: `src/pages/Notifications.js`
  - Display all notifications
  - Show type, title, message, date
  - Mark as read/unread
  - Delete notification
  - Filter by type

---

## **PHASE 21: FRONTEND DEVELOPMENT - ADMIN PANEL** 👨‍💼

### 17.1 User Management

- [ ] **Create User Management Component**
  - File: `src/components/admin/UserManagement.js`
  - Display all users in table
  - Filter by role (student/teacher/ta)
  - Search by name/email
  - Actions: Edit, Deactivate, Unlock account
  - Create user button

- [ ] **Create User Form Component**
  - File: `src/components/admin/UserForm.js`
  - Form for creating/editing users
  - Fields: name, email, password, role, department
  - Validation
  - Submit to create/update

---

### 17.2 Course Management (Admin)

- [ ] **Create Course Management Component**
  - File: `src/components/admin/CourseManagement.js`
  - Display all courses
  - Create course button
  - Assign teacher to course
  - Assign TAs to course
  - Bulk enroll students (CSV upload)
  - Edit/delete course

---

### 17.3 System Configuration

- [ ] **Create System Configuration Component**
  - File: `src/components/admin/SystemConfig.js`
  - Configure semester settings
  - Set semester name, start date, end date
  - Set registration periods
  - Save configuration

---

## **PHASE 22: FRONTEND DEVELOPMENT - UI/UX IMPROVEMENTS** 🎨

### 18.1 Responsive Design

- [ ] **Make All Pages Responsive**
  - Test on desktop, tablet, mobile
  - Use CSS media queries or Bootstrap/Material-UI grid
  - Ensure navigation works on mobile (hamburger menu)
  - Test forms on mobile devices

---

### 18.2 User Experience Enhancements

- [ ] **Add Loading Indicators**
  - Show spinners during API calls
  - Show skeleton screens for content loading
  - Disable buttons during submission

- [ ] **Add Success/Error Messages**
  - Use toast notifications or alerts
  - Show success message after actions
  - Show error messages clearly

- [ ] **Add Confirmation Dialogs**
  - Confirm before deleting (assignment, course, user)
  - Confirm before submitting assignment
  - Confirm before deactivating user

- [ ] **Add Search & Filter Functionality**
  - Search bars for courses, assignments, users
  - Filter dropdowns
  - Clear filters button

- [ ] **Add Pagination**
  - Paginate long lists (courses, assignments, users)
  - Show items per page selector

---

### 18.3 Accessibility

- [ ] **Ensure Accessibility Standards**
  - Add alt text to images
  - Ensure keyboard navigation works
  - Use semantic HTML
  - Test with screen reader
  - Ensure sufficient color contrast

---

## **PHASE 23: TESTING** 🧪

### 19.1 Backend Testing

- [ ] **Write Unit Tests**
  - Test controllers and services
  - Test authentication middleware
  - Test validation functions
  - Use Jest or Mocha: `npm install jest --save-dev`

- [ ] **Write Integration Tests**
  - Test API endpoints
  - Test database operations
  - Test file uploads

- [ ] **Test API with Postman**
  - Create Postman collection
  - Test all API endpoints
  - Test authentication flow
  - Test error handling
  - Test edge cases

---

### 19.2 Frontend Testing

- [ ] **Write Component Tests**
  - Test React components
  - Use React Testing Library
  - Test user interactions
  - Test form validation

- [ ] **Manual Testing**
  - Test all user workflows
  - Test role-based access
  - Test responsive design
  - Test on different browsers

---

### 19.3 End-to-End Testing

- [ ] **Write E2E Tests**
  - Use Cypress or Selenium
  - Test complete user journeys
  - Test login to assignment submission
  - Test course creation to grading

---

### 19.4 Performance Testing

- [ ] **Test Performance**
  - Test with large datasets
  - Test file upload with large files
  - Test page load times
  - Optimize slow queries
  - Optimize large components

---

## **PHASE 24: DEPLOYMENT** 🚀

### 20.1 Backend Deployment

- [ ] **Prepare for Production**
  - Set production environment variables
  - Remove console.logs
  - Enable CORS for frontend domain
  - Set secure HTTP headers

- [ ] **Choose Hosting Platform**
  - Option 1: Heroku
  - Option 2: AWS EC2
  - Option 3: DigitalOcean
  - Option 4: Render

- [ ] **Deploy Backend**
  - Create production build
  - Deploy to hosting platform
  - Configure environment variables
  - Test API endpoints

- [ ] **Setup Database**
  - Use MongoDB Atlas for cloud database
  - Configure database connection
  - Set up database backups
  - Add database security rules

---

### 20.2 Frontend Deployment

- [ ] **Prepare for Production**
  - Update API URL to production backend
  - Create production build: `npm run build`
  - Optimize images and assets
  - Test production build locally

- [ ] **Choose Hosting Platform**
  - Option 1: Vercel
  - Option 2: Netlify
  - Option 3: AWS S3 + CloudFront
  - Option 4: GitHub Pages

- [ ] **Deploy Frontend**
  - Deploy to hosting platform
  - Configure domain (if available)
  - Test deployed application
  - Set up SSL certificate (HTTPS)

---

### 20.3 Post-Deployment

- [ ] **Monitor Application**
  - Set up error logging (e.g., Sentry)
  - Monitor server performance
  - Monitor database usage
  - Set up alerts for errors

- [ ] **Create Admin Account**
  - Create first admin account manually
  - Secure admin credentials
  - Create initial users for testing

---

## **PHASE 25: DOCUMENTATION** 📖

### 21.1 Technical Documentation

- [ ] **Write API Documentation**
  - Document all API endpoints
  - Include request/response examples
  - Document authentication requirements
  - Document error responses
  - Use Swagger/Postman documentation

- [ ] **Write Database Documentation**
  - Document all schemas
  - Document relationships
  - Document indexes
  - Include ER diagram

- [ ] **Write Code Documentation**
  - Add comments to complex functions
  - Document helper functions
  - Document environment variables

---

### 21.2 User Documentation

- [ ] **Write User Manual**
  - Student guide (how to view courses, submit assignments, check attendance)
  - Teacher guide (how to create courses, upload materials, grade assignments)
  - TA guide (how to assist with courses, mark attendance)
  - Admin guide (how to manage users, configure system)

- [ ] **Create Video Tutorials** (Optional)
  - Screen recordings of key workflows
  - Upload to YouTube or embed in app

---

### 21.3 Project Documentation

- [ ] **Write Final Report**
  - Project overview
  - System architecture
  - Features implemented
  - Technologies used
  - Challenges faced
  - Future enhancements
  - Conclusion

- [ ] **Prepare Presentation**
  - PowerPoint/Slides for FYP presentation
  - Demo video
  - Screenshots of application

---

## **ADDITIONAL ENHANCEMENTS** ✨

### ✅ Two-Factor Authentication (2FA)
- 2FA required at login for all users
- 2FA required when logging in from new/untrusted devices
- Device fingerprinting and trusted device management
- QR code-based authenticator app support
- Email/SMS-based 2FA codes

### ✅ Quiz Management System
- **Three ways to create quizzes:**
  1. Manual question entry
  2. Excel file upload (auto-parse to quiz format)
  3. AI-generated quizzes with customizable difficulty
- Support for multiple question types (MCQ, True/False, Short Answer)
- Configurable difficulty levels (Easy, Medium, Hard)
- Timed quizzes with auto-submission

### ✅ Quiz Proctoring & Security
- **Camera Access:** Teacher/TA can request camera access during quiz
- **Screen Share:** Teacher/TA can request screen sharing during quiz
- **Tab Switch Detection:** Auto-terminate quiz if student switches tabs
- **Disabled Features during quiz:**
  - Right-click disabled
  - Inspect element disabled (F12, Ctrl+Shift+I, etc.)
  - Copy/paste blocked
- Real-time monitoring dashboard for teachers/TAs
- Violation logging and reporting
- WebRTC-based video streaming (no external apps needed)

### ✅ TA Eligibility System
- Students from higher semesters can apply to be TAs
- Eligibility: Must have completed the course under the same teacher
- Example: Semester 3 student can TA for Semester 1 & 2 courses
- Teacher approval required for TA applications
- Dual role support: Student + TA simultaneously

### ✅ UI/UX Framework
- Tailwind CSS for modern, utility-first styling
- Responsive design across all devices
- Smooth animations and transitions

---

## 📊 Project Timeline (Parallel Development)

> **Each phase includes BOTH backend API development AND frontend UI development**

| Phase | Duration | Backend Tasks | Frontend Tasks |
|-------|----------|---------------|----------------|
| Phase 1-2 | Week 1-2 | Project setup, database design | Project setup, Tailwind config |
| Phase 3 | Week 3 | Auth API + 2FA | Login page + 2FA UI |
| Phase 4 | Week 4 | User management API | Dashboards (all roles) + User management UI |
| Phase 5 | Week 5 | Course & material API | Course pages + Material upload UI |
| Phase 6 | Week 6 | Assignment & submission API | Assignment pages + Submission UI |
| Phase 7 | Week 7 | AI similarity API | Similarity checker UI |
| Phase 8 | Week 8 | AI summarization API | Summarization UI |
| Phase 9 | Week 9 | Attendance API | Attendance marking + Analytics UI |
| Phase 10 | Week 10 | Announcements + Notifications API | Announcements + Notification bell UI |
| Phase 11 | Week 11 | Quiz CRUD + Excel parse API | Quiz creation UI (Manual + Excel) |
| Phase 12 | Week 12 | AI quiz generation API | AI quiz generation UI |
| Phase 13 | Week 13 | Quiz attempt + security API | Quiz taking UI + Security features |
| Phase 14 | Week 14 | Proctoring WebRTC API | Quiz monitoring dashboard + WebRTC UI |
| Phase 15 | Week 15 | TA eligibility API | TA application + Approval UI |
| Phase 16 | Week 16 | Admin workflows API | Admin panel UI |
| Phase 17 | Week 17 | - | UI/UX polish + Responsive design |
| Phase 18 | Week 18-19 | Backend testing | Frontend + E2E testing |
| Phase 19 | Week 20 | Backend deployment | Frontend deployment |
| Phase 20 | Week 21-22 | API documentation | User guides + Final report |

**Total: ~22 weeks with parallel development**

---

## 🎯 Priority Checklist

### Must-Have Features (High Priority)
- ✅ User Authentication & Role-Based Access
- ✅ Course Management
- ✅ Assignment Management & Submission
- ✅ Basic File Upload/Download
- ✅ Announcements

### Should-Have Features (Medium Priority)
- ✅ Two-Factor Authentication (2FA)
- ✅ Quiz Management (Manual, Excel, AI-generated)
- ✅ Quiz Proctoring (Camera, Screen Share, Tab Detection)
- ✅ AI Similarity Checker
- ✅ AI Summarization
- ✅ Attendance Tracking
- ✅ Notification System
- ✅ Admin Panel
- ✅ TA Eligibility System

### Nice-to-Have Features (Low Priority)
- ⭐ Real-time notifications (WebSockets)
- ⭐ Email notifications
- ⭐ Dark mode
- ⭐ Advanced analytics and reports
- ⭐ Mobile app

---

## 🔧 Useful Resources

### Documentation
- [MongoDB Docs](https://docs.mongodb.com/)
- [Express.js Docs](https://expressjs.com/)
- [React.js Docs](https://react.dev/)
- [Node.js Docs](https://nodejs.org/docs/)

### Tutorials
- [MERN Stack Tutorial](https://www.youtube.com/results?search_query=mern+stack+tutorial)
- [JWT Authentication](https://www.youtube.com/results?search_query=jwt+authentication+node)
- [File Upload with Multer](https://www.youtube.com/results?search_query=multer+file+upload)

### Tools
- [Postman](https://www.postman.com/)
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [Git](https://git-scm.com/)

---

## 📞 Support & Contact

For issues or questions during development:
- Check documentation
- Search Stack Overflow
- Ask your FYP supervisor
- Refer to this to-do list regularly

---

**Good luck with your FYP project! 🎓**
