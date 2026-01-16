# User Management Dashboard - Demo Script

## Prerequisites
- Backend server running on http://localhost:5000
- Frontend server running on http://localhost:5173
- At least one admin account with `manage_users` permission
- Ideally have one Super Admin account

---

## Demo Script: Super Admin Flow

### Step 1: Login as Super Admin
```
Navigate to: http://localhost:5173/login
Enter Super Admin credentials
Click Login
```

### Step 2: Access User Management
```
After successful login, click "Users" in the sidebar
Or navigate directly to: http://localhost:5173/users
```

### Step 3: View Statistics
```
Observe the 4 stat cards showing:
- Admins count (Red card)
- Teachers count (Blue card)
- Students count (Green card)
- TAs count (Orange card)

Note: These update in real-time after creating/promoting users
```

### Step 4: Create a Student
```
1. Click "Create User" button (top right)
2. Select "Student" from role dropdown
3. Fill in the form:
   - Name: John Doe
   - Email: john.doe@example.com
   - Username: (leave blank or enter "johndoe")
   - Password: student123
   - Student ID: 2024-CS-101
   - Enrollment Year: 2024
   - Department: Computer Science
   - Batch: 2024
   - Current Semester: 1
4. Click "Create User"
5. Wait for success message
6. Notice Student count increased by 1
```

### Step 5: Create a Teacher
```
1. Click "Create User" button
2. Select "Teacher" from role dropdown
3. Fill in the form:
   - Name: Dr. Jane Smith
   - Email: jane.smith@example.com
   - Password: teacher123
   - Employee ID: EMP-T-001
   - Department: Computer Science
   - Designation: Lecturer
4. Click "Create User"
5. Wait for success message
6. Notice Teacher count increased by 1
```

### Step 6: Create an Admin (Super Admin Only)
```
1. Click "Create User" button
2. Select "Admin" from role dropdown (only visible to Super Admin)
3. Fill in the form:
   - Name: Test Admin
   - Email: testadmin@example.com
   - Password: admin123
   - Employee ID: EMP-A-001
   - Department: Administration
   - Designation: Administrator
4. Select permissions:
   - Check "Manage Users"
   - Check "Manage Courses"
5. Click "Create User"
6. Wait for success message
7. Notice Admin count increased by 1
```

### Step 7: Search for a Student
```
1. Click "Promote to TA" button
2. Type "john" in the search box
3. Wait for search results (should show John Doe)
4. Observe the search results showing:
   - Student name
   - Email
   - Student ID badge
   - Department badge
   - Semester badge
```

### Step 8: Promote Student to TA
```
1. Click on "John Doe" in search results
2. Observe the result item highlights in blue
3. See "Selected Student" card appear below
4. Review the selected student details
5. Click "Promote to TA" button
6. Wait for success message
7. Notice:
   - Student count decreased by 1
   - TA count increased by 1
```

### Step 9: Test Error Handling
```
1. Try to create another student with same email (john.doe@example.com)
2. Observe error message: "User with this email already exists"
3. Try to create student with same Student ID (2024-CS-101)
4. Observe error message: "Student with this student ID already exists"
```

---

## Demo Script: Regular Admin Flow

### Step 1: Login as Regular Admin
```
Navigate to: http://localhost:5173/login
Enter Regular Admin credentials (with manage_users permission)
Click Login
```

### Step 2: Access User Management
```
Click "Users" in the sidebar
Verify you can access the page
```

### Step 3: View Statistics
```
Observe the same 4 stat cards
Verify all counts are visible
```

### Step 4: Attempt to Create Admin
```
1. Click "Create User" button
2. Check role dropdown
3. Verify "Admin" option is NOT visible
4. Only "Student" and "Teacher" options should be available
```

### Step 5: Create a Teacher
```
1. Select "Teacher" from dropdown
2. Fill in all required fields
3. Click "Create User"
4. Verify success
5. Notice Teacher count increased
```

### Step 6: Create a Student
```
1. Click "Create User" button
2. Select "Student" from dropdown
3. Fill in all required fields
4. Click "Create User"
5. Verify success
6. Notice Student count increased
```

### Step 7: Promote Student to TA
```
1. Click "Promote to TA" button
2. Search for a student
3. Select student from results
4. Click "Promote to TA"
5. Verify success
6. Notice counts update correctly
```

---

## Demo Script: Testing Permissions

### Test 1: Admin without manage_users Permission
```
1. Login as admin without manage_users permission
2. Try to access /users
3. Expected: 403 Forbidden error or redirect
```

### Test 2: Non-Admin User
```
1. Login as teacher or student
2. Try to access /users
3. Expected: 403 Forbidden error or redirect
```

### Test 3: Unauthenticated User
```
1. Clear localStorage (token)
2. Try to access /users
3. Expected: Redirect to login page
```

---

## Demo Script: API Testing with Postman/cURL

### Test 1: Get User Stats
```bash
curl -X GET http://localhost:5000/api/users/stats/by-role \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
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

### Test 2: Search Students
```bash
curl -X GET "http://localhost:5000/api/users/search-students?query=john" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "userId": "60d5ec49f1b2c8b1f8e4e1a1",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "username": "johndoe",
      "studentId": "2024-CS-101",
      "department": "Computer Science",
      "semester": 1
    }
  ]
}
```

### Test 3: Create Student
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "alice123",
    "role": "student",
    "studentId": "2024-CS-102",
    "enrollmentYear": 2024,
    "department": "Computer Science",
    "batch": "2024",
    "currentSemester": 1
  }'
```

### Test 4: Promote to TA
```bash
curl -X POST http://localhost:5000/api/users/promote-to-ta \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentUserId": "60d5ec49f1b2c8b1f8e4e1a1"
  }'
```

---

## Demo Script: Mobile Responsiveness

### Test on Mobile View
```
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone 12 Pro or similar
4. Navigate to /users
5. Verify:
   - Stats display in single column
   - Form fields stack vertically
   - Buttons are full width
   - Modal takes full screen
   - Text is readable
   - Interactions work smoothly
```

---

## Common Demo Scenarios

### Scenario 1: Bulk User Creation
```
Goal: Create 5 students quickly
1. Click Create User
2. Fill form for Student 1
3. Submit
4. Immediately click Create User again
5. Fill form for Student 2
6. Repeat for remaining students
7. Verify all students created successfully
8. Check stats update correctly
```

### Scenario 2: Error Recovery
```
Goal: Show error handling
1. Try to create user with invalid email
2. Show validation error
3. Try to create user with short password
4. Show validation error
5. Try to create duplicate user
6. Show duplicate error
7. Successfully create user with correct data
```

### Scenario 3: Search and Select
```
Goal: Demonstrate search UX
1. Open Promote to TA modal
2. Type single character - no results
3. Type "jo" - see results appear
4. Type "john" - see filtered results
5. Click wrong student by accident
6. Click correct student
7. Verify selection changed
8. Confirm promotion
```

---

## Presentation Tips

### Opening (2 minutes)
```
"Today I'm demonstrating our User Management Dashboard that provides 
comprehensive user administration with role-based permissions. 

We have two types of admins:
- Super Admins who can manage everything including creating other admins
- Regular Admins who can manage teachers and students but not other admins

Let me show you how it works..."
```

### Middle (8 minutes)
```
Walk through:
1. Dashboard overview (1 min)
2. Create student (2 min)
3. Create teacher (2 min)
4. Promote to TA (3 min)
```

### Closing (2 minutes)
```
"As you can see, the system provides:
- Clear role separation with Super Admin vs Regular Admin
- Real-time statistics
- Intuitive user creation
- Easy student-to-TA promotion
- Comprehensive error handling
- Modern, responsive design

All operations are secured with JWT authentication and 
permission-based authorization."
```

---

## Troubleshooting During Demo

### Issue: Backend not responding
```
Solution:
1. Check if backend server is running
2. Check terminal for errors
3. Restart: npm run dev
```

### Issue: Frontend not loading
```
Solution:
1. Check if frontend server is running
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)
4. Restart: npm run dev
```

### Issue: Stats not updating
```
Solution:
1. Close and reopen modal
2. Refresh page
3. Check browser console for errors
4. Verify API responses in Network tab
```

### Issue: Search not working
```
Solution:
1. Type at least 2 characters
2. Wait for debounce delay
3. Check if students exist
4. Verify backend API is responding
```

---

## Demo Checklist

Before Demo:
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Super Admin account ready
- [ ] Regular Admin account ready
- [ ] At least 2-3 test students exist
- [ ] Browser console clear
- [ ] Network tab open for monitoring

During Demo:
- [ ] Show stats dashboard
- [ ] Create student successfully
- [ ] Create teacher successfully
- [ ] Show Super Admin can create admin
- [ ] Search for student
- [ ] Promote student to TA
- [ ] Show error handling
- [ ] Test mobile responsiveness

After Demo:
- [ ] Answer questions
- [ ] Show documentation
- [ ] Provide testing guide
- [ ] Share API endpoints

---

**Demo Duration**: 10-15 minutes
**Audience Level**: Technical and Non-Technical
**Demo Type**: Live Coding + Presentation
