# CampusOne Frontend - Backend Integration Guide

## ✅ Setup Complete!

The frontend is now connected to the backend API.

## 🚀 How to Start

### 1. Start Backend Server
```bash
cd campusone-backend
npm run dev
```
Server runs on: `http://localhost:5000`

### 2. Start Frontend Server
```bash
cd campusone-frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

## 🔐 Testing Authentication

### Test Login (Without 2FA)

1. **Go to**: http://localhost:5173/login

2. **Use these test credentials** (from API_Testing_Guide.md):
   - **Admin User**:
     - Email: `admin@campusone.com`
     - Password: `Admin123`
   
   - **Student User**:
     - Email: `john.doe@student.campusone.com`
     - Password: `Student123`
   
   - **Teacher User**:
     - Email: `sarah.johnson@campusone.com`
     - Password: `Teacher123`

3. **Expected Flow**:
   - If user has NOT enabled 2FA → Direct login to dashboard
   - If user has enabled 2FA → Redirect to 2FA verification page

### Test Login With 2FA

If you enabled 2FA for a user:

1. Login with email/password
2. You'll be redirected to 2FA verification page
3. Enter the 6-digit code from your authenticator app (Google Authenticator, Authy, etc.)
4. Click "Verify Code"
5. You'll be redirected to the dashboard

## 📝 What's Integrated

### ✅ Login Page
- Connects to: `POST /api/auth/login`
- Handles responses for both 2FA enabled and disabled users
- Stores JWT token in localStorage
- Displays backend error messages

### ✅ 2FA Verification Page
- Connects to: `POST /api/auth/verify-2fa`
- Validates 6-digit codes from authenticator apps
- Handles session expiration
- Auto-focuses input fields

### ✅ Dashboard
- Connects to: `GET /api/auth/me`
- Fetches current user data from backend
- Displays real user information:
  - Name
  - Email
  - User Type (admin/student/teacher)
  - Account status
- Protected route (requires authentication)

### ✅ Logout
- Connects to: `POST /api/auth/logout`
- Clears JWT token and user data
- Redirects to login page

## 🔧 API Utility

Created `src/utils/api.js` with:
- Axios instance configured for backend
- Auto-attaches JWT token to requests
- Handles 401 (unauthorized) errors automatically
- Centralized API endpoint functions

## 🎨 Features

1. **Automatic Token Management**: JWT tokens are automatically added to all API requests
2. **Error Handling**: Backend error messages are displayed to users
3. **Session Management**: Expired sessions redirect to login
4. **Loading States**: Shows loading indicators during API calls
5. **Protected Routes**: Dashboard requires authentication

## 📊 Testing the Full Flow

1. **Register a new user** (using Postman or backend directly)
2. **Login** through the frontend
3. **View dashboard** with your real user data
4. **Logout** and token is cleared
5. **Try accessing dashboard without login** → Redirected to login

## 🔗 API Endpoints Used

- `POST /api/auth/login` - User login
- `POST /api/auth/verify-2fa` - 2FA verification
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

## 🛡️ Security Features

- JWT token stored in localStorage
- Token automatically sent with requests
- Expired tokens trigger re-login
- 401 errors handled globally
- Password not stored anywhere on frontend

## 🎯 Next Steps

To test more features:
1. Enable 2FA for a user (see API_Testing_Guide.md Test 21-22)
2. Test login with 2FA enabled
3. Test account lockout after failed attempts
4. Test different user roles (admin/student/teacher)

## ⚠️ Important Notes

- Backend must be running before frontend
- Both servers must be running simultaneously
- Default ports: Backend (5000), Frontend (5173)
- CORS is configured to allow localhost:5173

---

**Frontend is now fully connected to the backend! 🎉**
