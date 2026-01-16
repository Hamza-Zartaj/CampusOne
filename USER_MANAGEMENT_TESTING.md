# User Management Testing Guide

## Quick Start

### 1. Start Backend Server
```bash
cd campusone-backend
npm run dev
```

### 2. Start Frontend Server
```bash
cd campusone-frontend
npm run dev
```

### 3. Access User Management
- Login as an admin user
- Navigate to "Users" from the sidebar menu
- Or directly visit: `http://localhost:5173/users`

## Test Scenarios

### Scenario 1: Super Admin Creates Admin

**Prerequisites**: Login as Super Admin

**Steps**:
1. Click "Create User" button
2. Select "Admin" from role dropdown
3. Fill in details:
   ```
   Name: Test Admin
   Email: testadmin@example.com
   Password: test123
   Employee ID: EMP-TEST-001
   Department: Administration
   ```
4. Select permissions: manage_users, manage_courses
5. Click "Create User"

**Expected Result**: 
- Success message: "Admin created successfully!"
- Admin count increases by 1
- Modal closes

### Scenario 2: Regular Admin Tries to Create Admin

**Prerequisites**: Login as regular admin with manage_users permission

**Steps**:
1. Click "Create User" button
2. Try to find "Admin" option in role dropdown

**Expected Result**: 
- Admin option NOT visible in dropdown
- Only Student and Teacher options available

### Scenario 3: Admin Creates Student

**Prerequisites**: Login as admin with manage_users permission

**Steps**:
1. Click "Create User" button
2. Select "Student" from role dropdown
3. Fill in details:
   ```
   Name: John Student
   Email: john@student.com
   Password: test123
   Student ID: 2024-CS-101
   Enrollment Year: 2024
   Department: Computer Science
   Batch: 2024
   Current Semester: 1
   ```
4. Click "Create User"

**Expected Result**: 
- Success message: "Student created successfully!"
- Student count increases by 1
- Modal closes

### Scenario 4: Admin Creates Teacher

**Prerequisites**: Login as admin with manage_users permission

**Steps**:
1. Click "Create User" button
2. Select "Teacher" from role dropdown
3. Fill in details:
   ```
   Name: Dr. Jane Teacher
   Email: jane@teacher.com
   Password: test123
   Employee ID: EMP-T-001
   Department: Computer Science
   Designation: Lecturer
   ```
4. Click "Create User"

**Expected Result**: 
- Success message: "Teacher created successfully!"
- Teacher count increases by 1
- Modal closes

### Scenario 5: Promote Student to TA

**Prerequisites**: 
- Login as admin with manage_users permission
- At least one student exists in the system

**Steps**:
1. Click "Promote to TA" button
2. Type student name in search box (e.g., "John")
3. Wait for search results to appear
4. Click on student from results
5. Verify selected student details
6. Click "Promote to TA"

**Expected Result**: 
- Success message: "{Student Name} has been promoted to TA successfully!"
- Student count decreases by 1
- TA count increases by 1
- Modal closes

### Scenario 6: Search Student Not Found

**Prerequisites**: Login as admin with manage_users permission

**Steps**:
1. Click "Promote to TA" button
2. Type non-existent name "XYZ123"
3. Wait for search

**Expected Result**: 
- No results displayed
- Empty search results list

### Scenario 7: Duplicate Email Prevention

**Prerequisites**: Login as admin with manage_users permission

**Steps**:
1. Create a student with email: test@example.com
2. Try to create another user with same email

**Expected Result**: 
- Error message: "User with this email already exists"
- User not created

### Scenario 8: Duplicate Student ID Prevention

**Prerequisites**: Login as admin with manage_users permission

**Steps**:
1. Create a student with ID: 2024-CS-001
2. Try to create another student with same ID

**Expected Result**: 
- Error message: "Student with this student ID already exists"
- User not created

## API Testing with cURL/Postman

### Get User Stats by Role
```bash
curl -X GET http://localhost:5000/api/users/stats/by-role \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Student
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "email": "teststudent@example.com",
    "password": "test123",
    "role": "student",
    "studentId": "2024-CS-999",
    "enrollmentYear": 2024,
    "department": "Computer Science",
    "batch": "2024",
    "currentSemester": 1
  }'
```

### Search Students
```bash
curl -X GET "http://localhost:5000/api/users/search-students?query=john" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Promote Student to TA
```bash
curl -X POST http://localhost:5000/api/users/promote-to-ta \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "studentUserId": "STUDENT_USER_ID_HERE"
  }'
```

## Common Issues and Solutions

### Issue 1: "Only Super Admins can create admin accounts"
**Solution**: You're logged in as a regular admin. Only Super Admins can create other admins.

### Issue 2: "Access denied. Required permissions: manage_users"
**Solution**: Your admin account doesn't have the `manage_users` permission. Contact Super Admin.

### Issue 3: Backend returns 401 Unauthorized
**Solution**: 
- Check if token is valid
- Check if token is expired
- Try logging in again

### Issue 4: Stats not loading
**Solution**:
- Check browser console for errors
- Verify backend is running
- Check network tab for API call status

### Issue 5: Search results not appearing
**Solution**:
- Type at least 2 characters
- Wait for debounce delay
- Check if students exist in database

## Validation Rules

### User Creation:
- **Name**: Required
- **Email**: Required, valid email format, unique
- **Username**: Optional, unique if provided
- **Password**: Required, minimum 6 characters
- **Role**: Required, must be student/teacher/admin

### Student Specific:
- **Student ID**: Required, unique
- **Enrollment Year**: Required, between 2000-2100
- **Department**: Required
- **Current Semester**: Required, between 1-8

### Teacher/Admin Specific:
- **Employee ID**: Required, unique
- **Department**: Required

## Database Collections Affected

1. **Users** - Main user collection
2. **Students** - Student-specific data
3. **Teachers** - Teacher-specific data
4. **Admins** - Admin-specific data
5. **TAs** - TA-specific data

## Permissions Required

### Super Admin:
- Can do everything
- No permission checks

### Admin with `manage_users`:
- Create teachers and students
- Promote students to TA
- View user statistics
- Cannot create admins

### Admin without `manage_users`:
- Cannot access user management
- Will see 403 Forbidden error

## Browser Console Testing

Open browser console (F12) and check:

```javascript
// Check current user
console.log(JSON.parse(localStorage.getItem('user')));

// Check token
console.log(localStorage.getItem('token'));

// Check admin data (if stored)
console.log(JSON.parse(localStorage.getItem('adminData')));
```

## Monitoring

Watch for these in logs:

### Backend Console:
- User creation logs
- Permission check logs
- Error messages

### Frontend Console:
- API call successes/failures
- State updates
- Error messages

## Performance Notes

- Search debounce: 300ms (can be adjusted)
- Stats refresh: On modal close after user creation
- Maximum search results: 20 students
- Modal animation duration: 300ms

## Security Considerations

✅ JWT authentication on all endpoints  
✅ Role-based access control  
✅ Permission-based authorization  
✅ Input validation on backend  
✅ SQL injection prevention (MongoDB)  
✅ Password hashing (bcrypt)  
✅ Unique constraints enforced  
✅ Error messages don't leak sensitive info
