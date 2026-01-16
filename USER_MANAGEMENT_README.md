# User Management Dashboard - Implementation Guide

## Overview

The User Management system provides a comprehensive dashboard for admins to manage users across different roles (Admins, Teachers, Students, and TAs) with permission-based access control.

## Features Implemented

### 1. Permission-Based Access Control

#### Super Admin Capabilities:
- ✅ Create admins, teachers, and students
- ✅ Assign TA role to existing students
- ✅ Full access to all user management features
- ✅ No permission restrictions

#### Admin with `manage_users` Permission:
- ✅ Create teachers and students
- ✅ Assign TA role to students
- ❌ Cannot create or manage other admins
- ✅ Access to user management dashboard

### 2. User Statistics Dashboard

The dashboard displays real-time counts of:
- **Admins**: Total number of administrator accounts
- **Teachers**: Total number of teacher accounts
- **Students**: Total number of student accounts
- **TAs**: Total number of Teaching Assistant accounts

Each stat card features:
- Icon with role-specific color
- Real-time count
- Gradient background animation
- Hover effects

### 3. Create User Functionality

#### Universal Fields:
- Full Name (required)
- Email (required, unique)
- Username (optional, auto-generated from email if not provided)
- Password (required, minimum 6 characters)
- Role selection (Student/Teacher/Admin*)

*Admin option only visible to Super Admins

#### Student-Specific Fields:
- Student ID (required, unique)
- Enrollment Year (required, 2000-2100)
- Department (required)
- Batch (optional)
- Current Semester (required, 1-8)

#### Teacher-Specific Fields:
- Employee ID (required, unique)
- Department (required)
- Designation (dropdown with predefined options)

#### Admin-Specific Fields (Super Admin only):
- Employee ID (required, unique)
- Department (required)
- Designation (text input)
- Permissions (multi-select checkboxes)

### 4. Promote Student to TA

#### Features:
- **Search Functionality**: Search students by name, email, or student ID
- **Real-time Search**: Results appear as you type
- **Student Selection**: Click to select a student from search results
- **Student Details Display**: Shows selected student's information
- **One-Click Promotion**: Converts student role to TA

#### Process:
1. Click "Promote to TA" button
2. Search for student using the search bar
3. Select student from results
4. Review selected student details
5. Click "Promote to TA" to confirm

## Technical Implementation

### Backend (Node.js/Express)

#### New Middleware (`middleware/auth.js`):
```javascript
authorizePermission(...requiredPermissions)
```
- Checks if user is an admin
- Super Admins bypass all permission checks
- Regular admins must have required permissions
- Returns 403 for insufficient permissions

#### New Controllers (`controllers/userController.js`):

1. **getUserStatsByRole**
   - Route: `GET /api/users/stats/by-role`
   - Returns counts by role (admins, teachers, students, tas)
   - Requires: `manage_users` permission

2. **promoteStudentToTA**
   - Route: `POST /api/users/promote-to-ta`
   - Converts student user to TA role
   - Creates TA record linked to student
   - Requires: `manage_users` permission

3. **searchStudents**
   - Route: `GET /api/users/search-students?query={searchTerm}`
   - Searches students by name, email, username
   - Returns up to 20 results
   - Requires: `manage_users` permission

4. **Updated createUser**
   - Added username auto-generation
   - Added Super Admin check for creating admins
   - Uses `req.isSuperAdmin` flag set by middleware

#### Updated Routes (`routes/userRoutes.js`):
- All user management routes now use `authorizePermission('manage_users')`
- Routes are accessible to Super Admins and admins with `manage_users` permission
- Stats, search, and promote routes added

### Frontend (React)

#### New Components:

1. **UserManagement.jsx** (`src/pages/UserManagement.jsx`)
   - Main dashboard component
   - Stats display grid
   - Create user modal with dynamic form
   - Promote to TA modal with search
   - Real-time error and success alerts

2. **UserManagement.css** (`src/styles/UserManagement.css`)
   - Modern, responsive design
   - Gradient stat cards with hover effects
   - Modal overlays with animations
   - Form styling with focus states
   - Mobile-responsive layout

#### Updated Files:

1. **App.jsx**
   - Added UserManagement route at `/users`
   - Integrated with DashboardLayout

2. **api.js** (`src/utils/api.js`)
   - Added `userAPI` object with methods:
     - `getUserStatsByRole()`
     - `searchStudents(query)`
     - `createUser(userData)`
     - `promoteStudentToTA(studentUserId, courseIds)`
     - `getAllUsers(params)`
     - `getUserById(userId)`
     - `updateUser(userId, userData)`
     - `deactivateUser(userId)`
     - `activateUser(userId)`
     - `deleteUser(userId)`

## API Endpoints

### User Statistics
```
GET /api/users/stats/by-role
Authorization: Bearer {token}
Permission Required: manage_users or Super Admin

Response:
{
  "success": true,
  "data": {
    "admins": 5,
    "teachers": 23,
    "students": 456,
    "tas": 12,
    "total": 496
  }
}
```

### Create User
```
POST /api/users
Authorization: Bearer {token}
Permission Required: manage_users or Super Admin
Content-Type: application/json

Body (Student):
{
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123",
  "role": "student",
  "studentId": "2024-CS-001",
  "enrollmentYear": 2024,
  "department": "Computer Science",
  "batch": "2024",
  "currentSemester": 1
}

Body (Teacher):
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "username": "janesmith",
  "password": "password123",
  "role": "teacher",
  "employeeId": "EMP-001",
  "department": "Computer Science",
  "designation": "Lecturer"
}

Body (Admin - Super Admin Only):
{
  "name": "Admin User",
  "email": "admin@example.com",
  "username": "adminuser",
  "password": "password123",
  "role": "admin",
  "employeeId": "EMP-002",
  "department": "Administration",
  "designation": "Administrator",
  "permissions": ["manage_users", "manage_courses"]
}

Response:
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": { ... },
    "roleData": { ... }
  }
}
```

### Search Students
```
GET /api/users/search-students?query={searchTerm}
Authorization: Bearer {token}
Permission Required: manage_users or Super Admin

Response:
{
  "success": true,
  "count": 3,
  "data": [
    {
      "userId": "60d5ec49f1b2c8b1f8e4e1a1",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "studentId": "2024-CS-001",
      "department": "Computer Science",
      "semester": 1
    }
  ]
}
```

### Promote Student to TA
```
POST /api/users/promote-to-ta
Authorization: Bearer {token}
Permission Required: manage_users or Super Admin
Content-Type: application/json

Body:
{
  "studentUserId": "60d5ec49f1b2c8b1f8e4e1a1",
  "courseIds": [] // Optional
}

Response:
{
  "success": true,
  "message": "Student successfully promoted to TA",
  "data": {
    "user": { ... },
    "taRecord": { ... }
  }
}
```

## Security Features

1. **JWT Token Authentication**: All endpoints require valid JWT token
2. **Role-Based Access**: Only admins can access user management
3. **Permission-Based Authorization**: Super Admin vs regular admin distinction
4. **Input Validation**: Email, password, and field validation
5. **Unique Constraints**: Email, username, studentId, employeeId must be unique
6. **Error Handling**: Comprehensive error messages and rollback on failures

## Usage Instructions

### For Super Admins:

1. **Access Dashboard**: Navigate to `/users` from the sidebar
2. **View Statistics**: See real-time counts of all user types
3. **Create Any User**:
   - Click "Create User" button
   - Select role (Student/Teacher/Admin)
   - Fill in required fields based on role
   - For Admin creation, select permissions
   - Submit form
4. **Promote to TA**:
   - Click "Promote to TA" button
   - Search for student
   - Select student from results
   - Confirm promotion

### For Admins with manage_users Permission:

1. **Access Dashboard**: Navigate to `/users` from the sidebar
2. **View Statistics**: See real-time counts of all user types
3. **Create Teacher/Student**:
   - Click "Create User" button
   - Select role (Student/Teacher only)
   - Fill in required fields
   - Submit form
4. **Promote to TA**: Same as Super Admin

## Testing Checklist

- [ ] Super Admin can create admin users
- [ ] Regular admin cannot create admin users
- [ ] Regular admin can create teachers
- [ ] Regular admin can create students
- [ ] Statistics display correctly
- [ ] Student search works
- [ ] Student can be promoted to TA
- [ ] Error messages display properly
- [ ] Success messages display properly
- [ ] Form validation works
- [ ] Modal close buttons work
- [ ] Responsive design on mobile

## Future Enhancements

- [ ] Edit user functionality
- [ ] Bulk user import via CSV
- [ ] User role change functionality
- [ ] Advanced filtering and sorting
- [ ] User activity logs
- [ ] Export user reports
- [ ] Batch operations (activate/deactivate multiple users)
- [ ] Course assignment for TAs during promotion

## Files Modified/Created

### Backend:
- ✅ `middleware/auth.js` - Added `authorizePermission` middleware
- ✅ `controllers/userController.js` - Added new controller functions
- ✅ `routes/userRoutes.js` - Updated routes with permission checks

### Frontend:
- ✅ `src/pages/UserManagement.jsx` - New component
- ✅ `src/styles/UserManagement.css` - New styles
- ✅ `src/utils/api.js` - Added userAPI functions
- ✅ `src/App.jsx` - Added UserManagement route

## Notes

- Username is auto-generated from email if not provided (takes part before @)
- Admins created by Super Admin start with default permissions if none specified
- TA promotion maintains student record reference
- All user operations are logged in the database with timestamps
