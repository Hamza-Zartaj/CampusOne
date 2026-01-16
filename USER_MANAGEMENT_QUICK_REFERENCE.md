# User Management - Quick Reference Card

## 🎯 Quick Access
**URL**: http://localhost:5173/users  
**Permission Required**: Admin with `manage_users` or Super Admin

---

## 👥 User Roles Hierarchy

```
┌─────────────────────┐
│   Super Admin       │  ← Can do EVERYTHING
├─────────────────────┤
│   Admin             │  ← Can manage teachers/students
│   (manage_users)    │
├─────────────────────┤
│   Teacher           │  ← Teaching staff
├─────────────────────┤
│   TA                │  ← Student + teaching duties
├─────────────────────┤
│   Student           │  ← Regular students
└─────────────────────┘
```

---

## 🔐 Permission Matrix

| Action | Super Admin | Admin (manage_users) | Admin (no permission) |
|--------|-------------|---------------------|----------------------|
| View Dashboard | ✅ | ✅ | ❌ |
| View Stats | ✅ | ✅ | ❌ |
| Create Admin | ✅ | ❌ | ❌ |
| Create Teacher | ✅ | ✅ | ❌ |
| Create Student | ✅ | ✅ | ❌ |
| Promote to TA | ✅ | ✅ | ❌ |
| Search Students | ✅ | ✅ | ❌ |

---

## 📊 Dashboard Stats

```
╔═══════════╗  ╔═══════════╗  ╔═══════════╗  ╔═══════════╗
║ Admins    ║  ║ Teachers  ║  ║ Students  ║  ║    TAs    ║
║    🔴     ║  ║    🔵     ║  ║    🟢     ║  ║    🟠     ║
║     5     ║  ║    23     ║  ║   456     ║  ║    12     ║
╚═══════════╝  ╚═══════════╝  ╚═══════════╝  ╚═══════════╝
```

---

## 🆕 Create User - Required Fields

### Student
```
✓ Name
✓ Email (unique)
✓ Password (min 6 chars)
✓ Student ID (unique)
✓ Enrollment Year
✓ Department
✓ Current Semester
```

### Teacher
```
✓ Name
✓ Email (unique)
✓ Password (min 6 chars)
✓ Employee ID (unique)
✓ Department
○ Designation (dropdown)
```

### Admin (Super Admin Only)
```
✓ Name
✓ Email (unique)
✓ Password (min 6 chars)
✓ Employee ID (unique)
✓ Department
○ Designation
○ Permissions (checkboxes)
```

---

## 🎓 Promote to TA Workflow

```
1. Click "Promote to TA"
   ↓
2. Search student (type name/email/ID)
   ↓
3. Select student from results
   ↓
4. Review selected student details
   ↓
5. Click "Promote to TA"
   ↓
6. ✅ Student → TA conversion complete
```

---

## 🔍 Search Tips

- **Minimum characters**: 2
- **Search fields**: Name, Email, Student ID
- **Max results**: 20 students
- **Debounce delay**: 300ms
- **Case insensitive**: Yes

---

## ⚠️ Common Errors

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "User with this email already exists" | Duplicate email | Use different email |
| "Student with this student ID already exists" | Duplicate ID | Use different ID |
| "Only Super Admins can create admin accounts" | Not Super Admin | Login as Super Admin |
| "Access denied. Required permissions: manage_users" | Missing permission | Contact Super Admin |
| "Student user not found" | Invalid user ID | Verify student exists |

---

## 🎨 Color Codes

**Stats Cards:**
- Admins: `#ef4444` (Red)
- Teachers: `#3b82f6` (Blue)
- Students: `#10b981` (Green)
- TAs: `#f59e0b` (Orange)

**Alerts:**
- Success: `#10b981` (Green)
- Error: `#ef4444` (Red)

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close modal |
| `Tab` | Navigate form fields |
| `Enter` | Submit form (when focused) |

---

## 🔗 API Endpoints Quick Reference

```
GET  /api/users/stats/by-role      → Get user counts
GET  /api/users/search-students    → Search students
POST /api/users                    → Create user
POST /api/users/promote-to-ta      → Promote student
```

**Authentication**: Bearer Token required for all

---

## 📱 Mobile Responsive

| Device | Stats Grid | Form Layout | Modal |
|--------|-----------|-------------|-------|
| Desktop | 4 columns | 2 columns | Centered |
| Tablet | 2 columns | 2 columns | Centered |
| Mobile | 1 column | 1 column | Full screen |

---

## 🚀 Quick Actions

### Create Student (30 seconds)
```
1. Create User
2. Student
3. Fill name, email, password
4. Fill student ID, year, dept, semester
5. Submit
```

### Promote to TA (20 seconds)
```
1. Promote to TA
2. Type student name
3. Click student
4. Promote to TA
```

---

## 💾 Data Validation

**Email Format**: `user@domain.com`  
**Password Length**: Minimum 6 characters  
**Student ID Format**: Any (e.g., `2024-CS-001`)  
**Employee ID Format**: Any (e.g., `EMP-001`)  
**Enrollment Year Range**: 2000-2100  
**Semester Range**: 1-8

---

## 🔄 Auto-Generated Fields

- **Username**: Generated from email if left blank
  - Example: `john@example.com` → `john`
- **Timestamps**: Created automatically
  - createdAt
  - updatedAt

---

## 📈 Performance Metrics

- **Stats Load Time**: < 500ms
- **Search Response**: ~300ms
- **User Creation**: < 1000ms
- **Modal Animation**: 300ms
- **Page Load**: < 2000ms

---

## 🎯 Success Indicators

✅ Success message appears  
✅ Modal closes automatically  
✅ Stats update immediately  
✅ Form resets after creation  
✅ No error messages shown

---

## 🆘 Emergency Contacts

**Backend Server**: http://localhost:5000  
**Frontend Server**: http://localhost:5173  
**API Base URL**: http://localhost:5000/api

**Check Server Status:**
```bash
# Backend
cd campusone-backend && npm run dev

# Frontend
cd campusone-frontend && npm run dev
```

---

## 📚 Documentation Files

1. `USER_MANAGEMENT_README.md` - Full documentation
2. `USER_MANAGEMENT_TESTING.md` - Testing guide
3. `USER_MANAGEMENT_VISUAL_GUIDE.md` - UI reference
4. `USER_MANAGEMENT_DEMO.md` - Demo script
5. `USER_MANAGEMENT_SUMMARY.md` - Implementation summary

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Create Student | 30-45 sec |
| Create Teacher | 30-45 sec |
| Create Admin | 45-60 sec |
| Promote to TA | 15-20 sec |
| Search Student | 5-10 sec |

---

## 🏆 Best Practices

1. ✅ Use consistent ID formats
2. ✅ Verify email before creating
3. ✅ Set appropriate permissions for admins
4. ✅ Search before creating to avoid duplicates
5. ✅ Review selected student before promoting
6. ✅ Keep admin passwords secure
7. ✅ Document department names consistently
8. ✅ Use descriptive designations

---

**Version**: 1.0  
**Last Updated**: January 17, 2026  
**Status**: Production Ready ✅
