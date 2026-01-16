# Super Admin Implementation

## Overview

The system now includes a **Super Admin** role with elevated privileges to manage admin accounts. This ensures proper security and access control within the administrative hierarchy.

## Features

### Super Admin Capabilities
- ✅ Create new admin accounts
- ✅ Delete admin accounts (except other Super Admins)
- ✅ Promote regular admins to Super Admin (optional)
- ✅ All standard admin permissions
- ✅ Cannot be deleted by regular admins

### Regular Admin Restrictions
- ❌ Cannot create admin accounts
- ❌ Cannot delete admin accounts
- ❌ Cannot grant or revoke admin privileges
- ✅ Can manage students, teachers, and TAs
- ✅ Can perform all other administrative tasks based on assigned permissions

## Database Schema Changes

### Admin Model (`models/Admin.js`)

Added new field:
```javascript
isSuperAdmin: {
  type: Boolean,
  default: false
}
```

Updated designation enum to include:
```javascript
designation: {
  enum: ['System Administrator', 'Academic Officer', 'HOD', 'Dean', 'Administrator', 'Super Administrator']
}
```

## Middleware Changes

### New Middleware: `authorizeSuperAdmin`

Location: `middleware/auth.js`

Usage:
```javascript
import { protect, authorizeSuperAdmin } from '../middleware/auth.js';

router.post('/admin/create', protect, authorizeSuperAdmin, createAdminHandler);
```

This middleware:
1. Verifies the user is logged in
2. Checks if the user has the 'admin' role
3. Queries the Admin collection to verify `isSuperAdmin: true`
4. Blocks access if any check fails

## API Changes

### Registration Endpoint (`POST /api/auth/register`)

**Behavior Changes:**
- Creating an admin account (`role: 'admin'`) now requires:
  - Request must come from an authenticated Super Admin
  - Regular admins will receive a 403 Forbidden error

**Request Body (Admin Creation):**
```json
{
  "name": "John Doe",
  "email": "john@campusone.edu",
  "password": "securePassword123",
  "role": "admin",
  "employeeId": "EMP001",
  "department": "Computer Science",
  "designation": "System Administrator",
  "isSuperAdmin": false  // Only Super Admins can set this to true
}
```

### Delete User Endpoint (`DELETE /api/users/:id`)

**Behavior Changes:**
- Deleting an admin account now requires:
  - Request must come from an authenticated Super Admin
  - Super Admin accounts cannot be deleted (even by other Super Admins)

## Creating the First Super Admin

### Using the Setup Script

Run the interactive script to create your first Super Admin:

```bash
cd campusone-backend
node scripts/createSuperAdmin.js
```

The script will prompt you for:
- Name
- Email
- Employee ID (will be used as username)
- Password (minimum 6 characters)
- Department

**Example Output:**
```
✅ Connected to MongoDB

📝 Create Super Admin Account
================================

Enter name: Jane Smith
Enter email: jane.smith@campusone.edu
Enter employee ID (will be used as username): SUPER001
Enter password (min 6 characters): ********
Enter department: Administration

⏳ Creating Super Admin account...

✅ Super Admin account created successfully!

📋 Account Details:
================================
Name: Jane Smith
Email: jane.smith@campusone.edu
Username: super001
Employee ID: SUPER001
Department: Administration
Role: Super Administrator
================================

⚠️  Please save these credentials securely!
⚠️  You will be required to change the password on first login.
```

### Manual Creation (MongoDB Shell)

If you prefer manual creation:

```javascript
// 1. Create User
db.users.insertOne({
  name: "Jane Smith",
  username: "super001",
  email: "jane.smith@campusone.edu",
  password: "$2a$10$...", // Pre-hashed password
  role: "admin",
  isFirstLogin: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 2. Get the user _id and create Admin record
db.admins.insertOne({
  userId: ObjectId("..."), // User _id from step 1
  employeeId: "SUPER001",
  department: "Administration",
  designation: "Super Administrator",
  isSuperAdmin: true,
  permissions: [
    "manage_users",
    "manage_courses",
    "manage_assignments",
    "manage_attendance",
    "manage_announcements",
    "view_reports",
    "system_config",
    "manage_ta_eligibility",
    "manage_quiz"
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## Security Considerations

### Protected Operations

The following operations are now restricted to Super Admins only:

1. **Creating Admin Accounts**
   - Regular admins attempting this will receive: `403 Only Super Admins can create admin accounts`

2. **Deleting Admin Accounts**
   - Regular admins attempting this will receive: `403 Only Super Admins can delete admin accounts`

3. **Deleting Super Admin Accounts**
   - Even Super Admins cannot delete other Super Admin accounts
   - Error: `403 Super Admin accounts cannot be deleted`

### Best Practices

1. **Limit Super Admin Accounts**
   - Create only 1-2 Super Admin accounts
   - Use regular admin accounts for day-to-day operations

2. **Strong Passwords**
   - Require strong passwords for Super Admin accounts
   - Enable 2FA for all Super Admin accounts

3. **Regular Audits**
   - Periodically review admin account list
   - Remove inactive admin accounts

4. **Separation of Duties**
   - Don't use Super Admin for routine tasks
   - Create specialized admin accounts with specific permissions

## Testing

### Test Super Admin Creation

```javascript
// Login as Super Admin
POST /api/auth/login
{
  "username": "super001",
  "password": "yourPassword"
}

// Create a regular admin (should succeed)
POST /api/auth/register
Authorization: Bearer <super_admin_token>
{
  "name": "Regular Admin",
  "email": "admin@campusone.edu",
  "password": "password123",
  "role": "admin",
  "employeeId": "EMP002",
  "department": "Computer Science",
  "isSuperAdmin": false
}
```

### Test Regular Admin Restrictions

```javascript
// Login as regular admin
POST /api/auth/login
{
  "username": "emp002",
  "password": "password123"
}

// Try to create another admin (should fail)
POST /api/auth/register
Authorization: Bearer <regular_admin_token>
{
  "name": "Another Admin",
  "email": "admin2@campusone.edu",
  "password": "password123",
  "role": "admin",
  "employeeId": "EMP003",
  "department": "Computer Science"
}

// Expected Response: 403 Only Super Admins can create admin accounts
```

## Migration Guide

If you have existing admin accounts in your database:

1. **Identify Primary Administrator**
   - Choose one existing admin to promote to Super Admin

2. **Update Admin Record**
   ```javascript
   db.admins.updateOne(
     { employeeId: "EMP001" },
     { $set: { isSuperAdmin: true, designation: "Super Administrator" } }
   );
   ```

3. **Verify Changes**
   ```javascript
   db.admins.findOne({ isSuperAdmin: true });
   ```

4. **Test Access**
   - Login with the Super Admin account
   - Verify ability to create/delete admin accounts

## Troubleshooting

### "Only Super Admins can create admin accounts"

**Cause:** You're trying to create an admin account with a regular admin account.

**Solution:** 
1. Login with a Super Admin account
2. Use the Super Admin credentials to perform the operation

### "Super Admin accounts cannot be deleted"

**Cause:** You're trying to delete a Super Admin account.

**Solution:** 
1. This is intentional protection
2. To remove a Super Admin, manually update the database:
   ```javascript
   db.admins.updateOne(
     { employeeId: "SUPER001" },
     { $set: { isSuperAdmin: false } }
   );
   ```

### No Super Admin exists

**Cause:** Database doesn't have any Super Admin accounts.

**Solution:** Run the setup script:
```bash
node scripts/createSuperAdmin.js
```

## Future Enhancements

Potential improvements for consideration:

1. **Audit Logging**
   - Track all Super Admin actions
   - Log admin account creation/deletion

2. **Multi-Factor Authentication**
   - Require additional verification for Super Admin operations
   - SMS or authenticator app verification

3. **Temporary Elevation**
   - Allow temporary Super Admin access
   - Auto-revoke after specified time

4. **Admin Hierarchy**
   - Multiple admin levels (Level 1, 2, 3)
   - Granular permission inheritance
