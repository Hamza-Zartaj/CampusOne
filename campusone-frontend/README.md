# CampusOne Frontend

React + Vite frontend for the CampusOne campus management system.

## Tech Stack

- **React 19** with React Router DOM 7
- **Vite 7** — build tool and dev server
- **Tailwind CSS v4** — utility-first styling
- **Axios** — HTTP requests to backend API
- **react-hot-toast** — toast notifications
- **lucide-react** — icon library

## Pages

### Public
- `/` — Landing page
- `/login` — Login (with 2FA support)
- `/apply` — Admission application (7-step form)

### Admin (protected)
- `/admin/users` — User management (CRUD, bulk upload)
- `/admin/admissions` — Admission settings
- `/admin/admissions/applications/:status` — Application review
- `/admin/announcements` — Broadcast announcements
- `/admin/reports` — Reports & analytics (mock data)

### Teacher (protected)
- `/teacher/dashboard` — Quick links
- `/teacher/attendance` — Attendance management
- `/teacher/assignments` — Assignment management
- `/teacher/quizzes` — Quiz management
- `/teacher/qna` — Q&A forum
- `/teacher/announcements` — Course announcements
- `/teacher/notification` — Notifications

### Student (protected)
- `/student/dashboard` — Quick links
- `/student/attendance` — View attendance
- `/student/assignments` — View & submit assignments
- `/student/quizzes` — Take quizzes
- `/student/qna` — Q&A forum
- `/student/notification` — Notifications

### Shared (protected)
- `/dashboard` — Role-based dashboard redirect
- `/profile` — View and edit profile

## Project Structure

```
src/
├── App.jsx             # All routes
├── main.jsx
├── index.css
├── components/
│   ├── DashboardLayout.jsx
│   ├── Sidebar.jsx
│   └── Header.jsx
├── pages/
│   ├── Landing.jsx
│   ├── Dashboard.jsx
│   ├── Profile.jsx
│   ├── auth/           # Login, 2FA, password reset
│   ├── admin/          # User mgmt, admissions, announcements, reports
│   ├── teacher/        # Teacher portal pages
│   ├── student/        # Student portal pages
│   └── AdmissionApplication/  # Public multi-step form
├── utils/
│   └── api.js          # Axios API service layer
└── styles/
    └── variables.css
```

## Getting Started

```bash
npm install
npm run dev
# Runs on http://localhost:5173
```

Requires the backend running on `http://localhost:5000`.

## API Service Layer (`src/utils/api.js`)

Pre-configured API modules:
- `authAPI` — Login, 2FA, password reset, first-time setup
- `userAPI` — User CRUD, bulk upload, teacher listing
- `teacherAPI` — Teacher lookup
- `admissionAPI` — Application form, admin review, settings
