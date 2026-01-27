# User Management - Quick Start Guide

## 🎯 Quick Overview
The User Management page now allows you to view, search, edit, activate/deactivate, reset settings, and delete users with just a few clicks.

---

## 📋 How to Use Each Feature

### 1️⃣ **View Users by Role**
```
1. On the User Management page, you'll see four role cards:
   - Admins (Red)
   - Teachers (Blue)  
   - Students (Green)
   - TAs (Orange)

2. Click any card to expand and view all users in that role

3. Click the same card again to collapse the list
```

**Visual Indicator:**
- Selected card has a blue ring around it
- ChevronDown icon (▼) when collapsed
- ChevronUp icon (▲) when expanded

---

### 2️⃣ **Search for Users**
```
1. After clicking a role card to view users
2. Use the search bar at the top of the user list
3. Type any of:
   - User's name
   - Email address
   - Student ID (for students)
   - Employee ID (for teachers/admins)

4. Results filter instantly as you type
5. Clear search to see all users again
```

---

### 3️⃣ **Edit a User**
```
1. Find the user in the list
2. Click the blue ✏️ (Edit) button
3. Update any of the following:
   - Name
   - Email
   - Role-specific fields (Student ID, Department, etc.)
   - Permissions (for admins)

4. Click "Update User" to save changes
5. Changes reflect immediately in the list
```

**Available Fields by Role:**
- **Students**: Name, Email, Student ID, Enrollment Year, Department, Batch, Current Semester
- **Teachers**: Name, Email, Employee ID, Department, Designation
- **Admins**: Name, Email, Employee ID, Department, Designation, Permissions

---

### 4️⃣ **Deactivate/Activate a User**
```
1. Find the user in the list
2. Click the toggle button:
   - 🚫 Orange icon (UserX) = Deactivate active user
   - ✅ Green icon (UserCheck) = Activate inactive user

3. Action happens immediately
4. Status badge updates (Active/Inactive)
5. Success message confirms the change
```

**Use Cases:**
- Temporarily suspend a student
- Deactivate graduated students
- Reactivate returning users

---

### 5️⃣ **Reset User Settings**
```
1. Find the user in the list
2. Click the purple 🔄 (RotateCcw) button
3. Choose from available reset options:

   ✅ UNLOCK ACCOUNT (Available Now)
   - Removes login lock from failed attempts
   - Resets failed login counter
   - Click "Unlock Account" button

   🔜 RESET 2FA (Coming Soon)
   - Will disable two-factor authentication

   🔜 FORCE PASSWORD RESET (Coming Soon)
   - Will require password change on next login

4. Confirm the action
5. User settings are reset immediately
```

---

### 6️⃣ **Delete a User**
```
1. Find the user in the list
2. Click the red 🗑️ (Trash) button
3. Review the confirmation dialog showing:
   - User's name
   - Email
   - Role
   - Warning about permanent deletion

4. Click "Delete User" to confirm
   OR
   Click "Cancel" to abort

5. User is permanently removed
6. Stats update automatically
```

⚠️ **Important:**
- You cannot delete your own account
- Only Super Admins can delete admin accounts
- Super Admin accounts cannot be deleted
- This action cannot be undone

---

## 🔍 Understanding the User Table

Each row in the user table shows:

| Column | Description |
|--------|-------------|
| **Avatar** | Circle with user's initial |
| **Name** | Full name of the user |
| **Email** | User's email address |
| **ID** | Student ID or Employee ID |
| **Department** | User's department |
| **Semester/Designation** | Student semester or employee designation |
| **Status** | Green badge (Active) or Red badge (Inactive) |
| **Actions** | 4 buttons: Edit, Toggle Status, Reset, Delete |

---

## 💡 Tips & Tricks

### Quick Actions
- **Double-click a role card** to quickly switch between role views
- **Use keyboard shortcuts** in search (Ctrl+F works in browser)
- **Look for color coding**:
  - 🔵 Blue = Edit (safe)
  - 🟠 Orange = Deactivate (caution)
  - 🟢 Green = Activate (safe)
  - 🟣 Purple = Reset (caution)
  - 🔴 Red = Delete (danger)

### Efficient Workflow
1. **Filter First**: Click role card → Search specific user
2. **Quick Edit**: Make changes → Save → Done
3. **Batch Review**: Keep list open, process multiple users
4. **Status Check**: Look for red "Inactive" badges
5. **Regular Cleanup**: Deactivate instead of delete when possible

### Best Practices
- ✅ **Deactivate** users instead of deleting when possible
- ✅ **Unlock accounts** before helping users with login issues
- ✅ **Review user details** before deleting
- ✅ **Keep search clear** when browsing all users
- ✅ **Check permissions** before editing admin accounts

---

## 🚨 Common Scenarios

### Scenario 1: Student Can't Login
```
Problem: Student forgot password and locked account

Solution:
1. Click "Students" card
2. Search for student by name or email
3. Click purple Reset button
4. Click "Unlock Account"
5. Inform student to try again
```

### Scenario 2: Update Student Semester
```
Problem: Need to update student's current semester

Solution:
1. Click "Students" card
2. Search for student
3. Click blue Edit button
4. Change "Current Semester" field
5. Click "Update User"
```

### Scenario 3: Deactivate Graduated Students
```
Problem: Students graduated, need to deactivate accounts

Solution:
1. Click "Students" card
2. Search by batch year (e.g., "2020")
3. For each student:
   - Click orange Deactivate button
   - Confirm action
4. Repeat for all graduating students
```

### Scenario 4: Remove Test Account
```
Problem: Test account needs to be deleted

Solution:
1. Click appropriate role card
2. Search for test account
3. Click red Delete button
4. Review confirmation details
5. Click "Delete User"
6. Account is permanently removed
```

---

## ⚙️ Permission Requirements

| Action | Required Permission | Super Admin Only |
|--------|-------------------|------------------|
| View Users | `manage_users` | No |
| Edit Users | `manage_users` | No |
| Deactivate/Activate | `manage_users` | No |
| Reset Settings | `manage_users` | No |
| Delete Student/Teacher | `manage_users` | No |
| Delete Admin | `manage_users` | **Yes** |

---

## 📱 Mobile Usage

The interface is fully responsive:
- Role cards stack vertically
- Table scrolls horizontally if needed
- Action buttons remain accessible
- Modals adapt to screen size
- Touch-friendly button sizes

---

## 🆘 Troubleshooting

**Problem: Can't see user list**
- Solution: Make sure you clicked a role card (it should have a blue ring)

**Problem: Search returns no results**
- Solution: Check spelling, try partial name, clear search to start over

**Problem: Edit button disabled**
- Solution: Check your permissions with Super Admin

**Problem: Can't delete a user**
- Solution: Ensure you're not trying to delete:
  - Your own account
  - A Super Admin account (if you're not Super Admin)

**Problem: Changes not saving**
- Solution: Check for error messages, verify all required fields are filled

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message displayed
2. Verify your permissions with system administrator
3. Try refreshing the page
4. Contact technical support

---

## 🎓 Training Checklist

Practice these tasks to master the interface:

- [ ] View all students
- [ ] Search for a specific user
- [ ] Edit a user's department
- [ ] Deactivate a user account
- [ ] Activate an inactive account
- [ ] Unlock a locked account
- [ ] Delete a test user
- [ ] Update admin permissions
- [ ] Toggle between different role views
- [ ] Use search with different criteria

---

**Last Updated:** January 28, 2026  
**Version:** 2.0 - Full User Management Features
