# CampusOne Backend API Testing Guide

**Project:** CampusOne - University Learning Management System  
**Testing Date:** December 29, 2025  
**Backend Server:** http://localhost:5000  
**Testing Tool:** Postman

---

## 📋 Table of Contents

1. [Phase 3.1 - Authentication API Tests](#phase-31---authentication-api-tests)
2. [Phase 3.2 - User Management API Tests](#phase-32---user-management-api-tests)
3. [2FA (Two-Factor Authentication) Tests](#2fa-two-factor-authentication-tests)
4. [Security & Error Testing](#security--error-testing)

---

## ⚙️ Prerequisites

1. **Start Backend Server:**
   ```bash
   cd campusone-backend
   npm run dev
   ```
   Server should be running on `http://localhost:5000`

2. **MongoDB Connection:** Ensure MongoDB is connected

3. **Postman Setup:** Create a new collection called "CampusOne API Tests"

---

# Phase 3.1 - Authentication API Tests

## Test 1: Health Check
**Purpose:** Verify server is running

**Method:** `GET`  
**URL:** `http://localhost:5000/api/health`  
**Headers:** None  

**Expected Response (200 OK):**
```json
{
  "status": "OK",
  "database": "Connected",
  "uptime": 123.456
}
```

---

## Test 2: Register Admin User
**Purpose:** Create an admin account for testing user management

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/register`  
**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Admin User",
  "email": "admin@campusone.com",
  "password": "Admin123",
  "role": "admin",
  "employeeId": "EMP001",
  "department": "Administration",
  "designation": "System Administrator",
  "permissions": ["manage_users", "manage_courses", "view_reports", "system_config"]
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "67...",
      "name": "Admin User",
      "email": "admin@campusone.com",
      "role": "admin"
    },
    "roleData": {
      "_id": "67...",
      "userId": "67...",
      "employeeId": "EMP001",
      "department": "Administration",
      "designation": "System Administrator",
      "permissions": ["manage_users", "manage_courses", "view_reports", "system_config"]
    }
  }
}
```

**✅ Success Criteria:**
- Status code is 201
- User and roleData are returned
- No errors in response

---

## Test 3: Register Student User
**Purpose:** Create a student account

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/register`  
**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@student.campusone.com",
  "password": "Student123",
  "role": "student",
  "enrollmentNumber": "2024-CS-001",
  "department": "Computer Science",
  "batch": "2024-2028",
  "currentSemester": 1
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "67...",
      "name": "John Doe",
      "email": "john.doe@student.campusone.com",
      "role": "student"
    },
    "roleData": {
      "_id": "67...",
      "userId": "67...",
      "enrollmentNumber": "2024-CS-001",
      "department": "Computer Science",
      "batch": "2024-2028",
      "currentSemester": 1,
      "enrolledCourses": [],
      "completedCourses": [],
      "cgpa": 0,
      "totalCredits": 0
    }
  }
}
```

---

## Test 4: Register Teacher User
**Purpose:** Create a teacher account

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/register`  
**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Dr. Sarah Johnson",
  "email": "sarah.johnson@campusone.com",
  "password": "Teacher123",
  "role": "teacher",
  "employeeId": "TCH001",
  "department": "Computer Science",
  "designation": "Professor",
  "qualification": "Ph.D. in Computer Science",
  "specialization": ["AI", "Machine Learning", "Data Science"]
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "67...",
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@campusone.com",
      "role": "teacher"
    },
    "roleData": {
      "_id": "67...",
      "userId": "67...",
      "employeeId": "TCH001",
      "department": "Computer Science",
      "designation": "Professor",
      "qualification": "Ph.D. in Computer Science",
      "specialization": ["AI", "Machine Learning", "Data Science"],
      "teachingCourses": []
    }
  }
}
```

---

## Test 5: Login with Admin Credentials
**Purpose:** Authenticate admin and get JWT token

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`  
**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@campusone.com",
  "password": "Admin123"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3...",
  "data": {
    "user": {
      "id": "67...",
      "name": "Admin User",
      "email": "admin@campusone.com",
      "role": "admin",
      "profilePicture": null,
      "twoFactorEnabled": false
    },
    "roleData": { ... }
  }
}
```

**📝 IMPORTANT:** 
- Copy the `token` value from the response
- Save it as a Postman environment variable named `authToken`
- Or copy it manually for the next tests

---

## Test 6: Get Current User Info (Protected Route)
**Purpose:** Test JWT authentication and get logged-in user data

**Method:** `GET`  
**URL:** `http://localhost:5000/api/auth/me`  
**Headers:**
```
Authorization: Bearer {{YOUR_TOKEN_HERE}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "67...",
      "name": "Admin User",
      "email": "admin@campusone.com",
      "role": "admin",
      "profilePicture": null,
      "twoFactorEnabled": false,
      "isActive": true,
      "lastLogin": "2025-12-29T..."
    },
    "roleData": { ... }
  }
}
```

---

## Test 7: Login with Invalid Credentials
**Purpose:** Test failed login handling

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`  
**Body:**
```json
{
  "email": "admin@campusone.com",
  "password": "WrongPassword"
}
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "attemptsRemaining": 4
}
```

**✅ Success Criteria:**
- Status code is 401
- Failed attempts are tracked
- Attempts remaining is shown

---

## Test 8: Account Lockout After 5 Failed Attempts
**Purpose:** Test account security lockout mechanism

**Steps:**
1. Attempt to login with wrong password 5 times consecutively
2. On the 5th attempt, account should be locked

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`  
**Body:**
```json
{
  "email": "john.doe@student.campusone.com",
  "password": "WrongPassword123"
}
```

**Repeat 5 times**

**Expected Response after 5th attempt (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Account locked due to multiple failed login attempts. Please try again after 30 minutes."
}
```

---

## Test 9: Logout
**Purpose:** Test logout endpoint

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/logout`  
**Headers:**
```
Authorization: Bearer {{YOUR_TOKEN_HERE}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**📝 Note:** JWT tokens remain valid until expiration (1 hour). Client must remove token manually.

---

# Phase 3.2 - User Management API Tests

**⚠️ IMPORTANT:** All user management endpoints require:
1. Authentication (Bearer token)
2. Admin role authorization

**Login as Admin first** (Test 5) and use the token for all tests below.

---

## Test 10: Get User Statistics
**Purpose:** Get overview of all users in system

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users/stats`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "active": 3,
    "inactive": 0,
    "locked": 1,
    "byRole": {
      "admin": 1,
      "student": 1,
      "teacher": 1
    }
  }
}
```

---

## Test 11: Get All Users (No Filters)
**Purpose:** List all users with pagination

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users?page=1&limit=10`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "data": [
    {
      "_id": "67...",
      "name": "Admin User",
      "email": "admin@campusone.com",
      "role": "admin",
      "isActive": true,
      "accountLocked": false,
      "failedLoginAttempts": 0,
      "twoFactorEnabled": false,
      "createdAt": "2025-12-29T...",
      "updatedAt": "2025-12-29T..."
    },
    { ... },
    { ... }
  ]
}
```

---

## Test 12: Filter Users by Role
**Purpose:** Get only users with specific role

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users?role=student`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "pagination": { ... },
  "data": [
    {
      "_id": "67...",
      "name": "John Doe",
      "email": "john.doe@student.campusone.com",
      "role": "student",
      "isActive": true,
      ...
    }
  ]
}
```

**Test variations:**
- `?role=teacher` - Get all teachers
- `?role=admin` - Get all admins
- `?role=ta` - Get all TAs

---

## Test 13: Search Users by Name/Email
**Purpose:** Find users using search query

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users?search=john`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "pagination": { ... },
  "data": [
    {
      "_id": "67...",
      "name": "John Doe",
      "email": "john.doe@student.campusone.com",
      "role": "student",
      ...
    }
  ]
}
```

---

## Test 14: Get Single User by ID
**Purpose:** Get detailed information about specific user

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users/{USER_ID}`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Replace `{USER_ID}` with actual user ID from previous tests**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "67...",
      "name": "John Doe",
      "email": "john.doe@student.campusone.com",
      "role": "student",
      "isActive": true,
      "accountLocked": false,
      "twoFactorEnabled": false,
      "lastLogin": "2025-12-29T...",
      "createdAt": "2025-12-29T...",
      "updatedAt": "2025-12-29T..."
    },
    "roleData": {
      "_id": "67...",
      "userId": "67...",
      "enrollmentNumber": "2024-CS-001",
      "department": "Computer Science",
      "batch": "2024-2028",
      "currentSemester": 1,
      "enrolledCourses": [],
      "completedCourses": [],
      "cgpa": 0,
      "totalCredits": 0
    }
  }
}
```

---

## Test 15: Create New Student User (Admin)
**Purpose:** Admin creates a new student account

**Method:** `POST`  
**URL:** `http://localhost:5000/api/users`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@student.campusone.com",
  "password": "Student123",
  "role": "student",
  "enrollmentNumber": "2024-CS-002",
  "department": "Computer Science",
  "batch": "2024-2028",
  "currentSemester": 1
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "67...",
      "name": "Jane Smith",
      "email": "jane.smith@student.campusone.com",
      "role": "student",
      "isActive": true
    },
    "roleData": { ... }
  }
}
```

---

## Test 16: Update User Information
**Purpose:** Admin updates user details

**Method:** `PUT`  
**URL:** `http://localhost:5000/api/users/{USER_ID}`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Updated Doe",
  "department": "Software Engineering",
  "currentSemester": 2
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "67...",
      "name": "John Updated Doe",
      "email": "john.doe@student.campusone.com",
      "role": "student",
      "isActive": true
    },
    "roleData": {
      "_id": "67...",
      "department": "Software Engineering",
      "currentSemester": 2,
      ...
    }
  }
}
```

---

## Test 17: Deactivate User Account
**Purpose:** Admin deactivates a user (prevents login)

**Method:** `PUT`  
**URL:** `http://localhost:5000/api/users/{USER_ID}/deactivate`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "User account deactivated successfully",
  "data": {
    "id": "67...",
    "name": "John Updated Doe",
    "email": "john.doe@student.campusone.com",
    "isActive": false
  }
}
```

**Verification:** Try to login with deactivated user - should get error message

---

## Test 18: Activate User Account
**Purpose:** Admin reactivates a deactivated user

**Method:** `PUT`  
**URL:** `http://localhost:5000/api/users/{USER_ID}/activate`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "User account activated successfully",
  "data": {
    "id": "67...",
    "name": "John Updated Doe",
    "email": "john.doe@student.campusone.com",
    "isActive": true
  }
}
```

---

## Test 19: Unlock Locked Account
**Purpose:** Admin unlocks account locked due to failed login attempts

**Method:** `PUT`  
**URL:** `http://localhost:5000/api/users/{LOCKED_USER_ID}/unlock`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "User account unlocked successfully",
  "data": {
    "id": "67...",
    "name": "John Updated Doe",
    "email": "john.doe@student.campusone.com",
    "accountLocked": false
  }
}
```

---

## Test 20: Delete User (Soft Delete)
**Purpose:** Admin deletes a user (actually deactivates)

**Method:** `DELETE`  
**URL:** `http://localhost:5000/api/users/{USER_ID}`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**📝 Note:** This is a soft delete - user is deactivated, not removed from database

---

# 2FA (Two-Factor Authentication) Tests

## Test 21: Setup 2FA for Admin User
**Purpose:** Generate 2FA secret and QR code

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/setup-2fa`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA setup initiated. Scan the QR code with your authenticator app.",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

**📝 Next Steps:**
1. Open the `qrCode` data URL in browser (copy the base64 string)
2. Scan QR code with Google Authenticator or Authy app
3. App will generate a 6-digit code
4. Use this code in the next test

---

## Test 22: Enable 2FA
**Purpose:** Confirm 2FA setup with verification token

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/enable-2fa`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json
```

**Body:**
```json
{
  "token": "123456"
}
```

**Replace `123456` with actual 6-digit code from your authenticator app**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA has been enabled successfully"
}
```

---

## Test 23: Login with 2FA Enabled
**Purpose:** Test login flow when 2FA is active

**Step 1 - Initial Login:**

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`  
**Body:**
```json
{
  "email": "admin@campusone.com",
  "password": "Admin123"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "requires2FA": true,
  "message": "2FA verification required",
  "userId": "67..."
}
```

**📝 Save the `userId` for next step**

---

**Step 2 - Verify 2FA Token:**

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/verify-2fa`  
**Body:**
```json
{
  "userId": "67...",
  "token": "123456",
  "rememberDevice": true
}
```

**Replace:**
- `userId` with the value from Step 1
- `token` with current 6-digit code from authenticator app
- `rememberDevice: true` to add device to trusted list

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA verification successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": "67...",
      "name": "Admin User",
      "email": "admin@campusone.com",
      "role": "admin",
      "twoFactorEnabled": true
    },
    "roleData": { ... }
  }
}
```

---

## Test 24: Get Trusted Devices
**Purpose:** View list of devices that don't require 2FA

**Method:** `GET`  
**URL:** `http://localhost:5000/api/auth/trusted-devices`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "trustedDevices": [
      {
        "deviceId": "Q2hyb21lIG9uIFdpbmRvd3M=",
        "deviceName": "Chrome on Windows",
        "ipAddress": "::1",
        "lastUsed": "2025-12-29T...",
        "_id": "67..."
      }
    ]
  }
}
```

---

## Test 25: Remove Trusted Device
**Purpose:** Remove a device from trusted list

**Method:** `DELETE`  
**URL:** `http://localhost:5000/api/auth/trusted-devices/{DEVICE_ID}`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Replace `{DEVICE_ID}` with actual deviceId from Test 24**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Device removed successfully"
}
```

---

## Test 26: Disable 2FA
**Purpose:** Turn off two-factor authentication

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/disable-2fa`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json
```

**Body:**
```json
{
  "password": "Admin123",
  "token": "123456"
}
```

**Replace `token` with current 6-digit code from authenticator app**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA has been disabled successfully"
}
```

---

# Security & Error Testing

## Test 27: Access Protected Route Without Token
**Purpose:** Verify authentication is required

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users/stats`  
**Headers:** None (no Authorization header)

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Not authorized to access this route. No token provided."
}
```

---

## Test 28: Access Admin Route as Non-Admin
**Purpose:** Verify role-based authorization

**Steps:**
1. Login as student (from Test 3)
2. Get student's token
3. Try to access admin endpoint

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users/stats`  
**Headers:**
```
Authorization: Bearer {{STUDENT_TOKEN}}
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "User role 'student' is not authorized to access this route. Required roles: admin"
}
```

---

## Test 29: Weak Password Validation
**Purpose:** Test password strength requirements

**Method:** `POST`  
**URL:** `http://localhost:5000/api/users`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Test User",
  "email": "test@campusone.com",
  "password": "weak",
  "role": "student",
  "enrollmentNumber": "2024-CS-999",
  "department": "CS"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters long"
}
```

**Test variations:**
- Password without uppercase: `"password123"` → Error
- Password without lowercase: `"PASSWORD123"` → Error
- Password without number: `"PasswordABC"` → Error
- Valid password: `"Password123"` → Success

---

## Test 30: Duplicate Email Prevention
**Purpose:** Verify duplicate emails are not allowed

**Method:** `POST`  
**URL:** `http://localhost:5000/api/users`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Duplicate User",
  "email": "john.doe@student.campusone.com",
  "password": "Student123",
  "role": "student",
  "enrollmentNumber": "2024-CS-999",
  "department": "CS"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

## Test 31: Invalid MongoDB ObjectId
**Purpose:** Test validation of ID parameters

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users/invalid-id-123`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid id format"
}
```

---

## Test 32: Invalid Token Format
**Purpose:** Test JWT token validation

**Method:** `GET`  
**URL:** `http://localhost:5000/api/auth/me`  
**Headers:**
```
Authorization: Bearer invalid.token.here
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Not authorized. Token is invalid or expired."
}
```

---

## Test 33: Pagination Validation
**Purpose:** Test invalid pagination parameters

**Method:** `GET`  
**URL:** `http://localhost:5000/api/users?page=-1&limit=200`  
**Headers:**
```
Authorization: Bearer {{ADMIN_TOKEN}}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Page must be a positive number"
}
```

---

# 📊 Testing Summary Checklist

## Phase 3.1 - Authentication API
- [ ] Health check endpoint works
- [ ] Admin registration successful
- [ ] Student registration successful
- [ ] Teacher registration successful
- [ ] Login returns valid JWT token
- [ ] Get current user info works with token
- [ ] Invalid credentials return proper error
- [ ] Account locks after 5 failed attempts
- [ ] Logout endpoint works

## Phase 3.2 - User Management API
- [ ] Get user statistics works
- [ ] Get all users with pagination works
- [ ] Filter users by role works
- [ ] Search users by name/email works
- [ ] Get single user by ID works
- [ ] Admin can create new users
- [ ] Admin can update user information
- [ ] Admin can deactivate users
- [ ] Admin can activate users
- [ ] Admin can unlock locked accounts
- [ ] Admin can delete users (soft delete)

## 2FA Features
- [ ] 2FA setup generates QR code
- [ ] 2FA can be enabled with token
- [ ] Login with 2FA requires verification
- [ ] 2FA verification works correctly
- [ ] Trusted devices are saved
- [ ] Get trusted devices list works
- [ ] Remove trusted device works
- [ ] 2FA can be disabled with password + token

## Security & Validation
- [ ] Protected routes require authentication
- [ ] Admin routes require admin role
- [ ] Weak passwords are rejected
- [ ] Duplicate emails are prevented
- [ ] Invalid ObjectIds are rejected
- [ ] Invalid tokens are rejected
- [ ] Pagination validation works

---

# 🎯 Testing Results Template

**Date:** _____________  
**Tester:** _____________  
**Total Tests:** 33  
**Tests Passed:** _____  
**Tests Failed:** _____  

**Issues Found:**
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

**Notes:**
________________________________________________________
________________________________________________________
________________________________________________________

---

**✅ All tests completed successfully = Backend Phase 3 is production-ready!**
