# CampusOne Frontend

React 19 and Vite 7 frontend for the CampusOne full-stack campus management system. This app is the main backend-connected interface for admins, teachers, students, and approved Teaching Assistants.

This is not the standalone public demo. The demo app lives in `campusone-frontend-demo` and uses mocked browser data.

## Tech Stack

- React 19 with React DOM 19
- Vite 7 with `@vitejs/plugin-react`
- React Router DOM 7 for routing
- Tailwind CSS 4 with `@tailwindcss/vite`
- Axios for API requests
- Socket.IO Client for real-time notifications
- Lucide React for icons
- React Hot Toast for notifications
- ESLint 9 for linting

## Environment Variables

Create `campusone-frontend/.env` from `.env.example` and set the backend URLs:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL for the Express API. |
| `VITE_SOCKET_URL` | Base URL for Socket.IO connections. |

## Scripts

```bash
npm install
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Build the frontend for production. |
| `npm run lint` | Run ESLint. |
| `npm run preview` | Preview the production build locally. |

The frontend expects the CampusOne backend to be running separately, typically on `http://localhost:5000`.

## Route Map

### Public Routes

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/login` | Login, MFA, first-time setup, password reset, and recovery flows |
| `/apply` | Public admission application |

### Shared Protected Routes

| Route | Page |
| --- | --- |
| `/dashboard` | Role-based dashboard redirect |
| `/profile` | User profile, password, and MFA management |

### Admin Routes

| Route | Page |
| --- | --- |
| `/admin/dashboard` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/admissions` | Admission settings |
| `/admin/admissions/applications/:status` | Admission application review |
| `/admin/reports` | Reports |
| `/admin/announcements` | Announcement management |
| `/admin/academic/departments` | Department management |
| `/admin/academic/programs` | Program management |
| `/admin/academic/courses` | Course management |
| `/admin/academic/attendance-policy` | Attendance policy settings |
| `/admin/academic/terms` | Term management |
| `/admin/academic/offerings` | Course offering management |
| `/admin/academic/enrollments` | Enrollment management |
| `/admin/schedule/config` | Schedule configuration |
| `/admin/schedule/rooms` | Room management |
| `/admin/schedule/holidays` | Holiday management |
| `/admin/audit-logs` | Audit logs |
| `/admin/ta-oversight` | Teaching Assistant oversight |
| `/admin/notifications` | Notifications |

### Teacher Routes

| Route | Page |
| --- | --- |
| `/teacher/dashboard` | Teacher dashboard |
| `/teacher/attendance` | Attendance management |
| `/teacher/assignments` | Assignment management |
| `/teacher/quizzes` | Quiz management |
| `/teacher/qna` | Course Q&A |
| `/teacher/announcements` | Course announcements |
| `/teacher/notification` | Notifications |
| `/teacher/notifications` | Notifications |
| `/teacher/offerings` | Assigned offerings |
| `/teacher/offerings/:offeringId/marks` | Marks upload and grading |
| `/teacher/offerings/:offeringId/lectures` | Lecture materials |
| `/teacher/leave-applications` | Leave application review |
| `/teacher/ta-applications` | Teaching Assistant application review |

### Student Routes

| Route | Page |
| --- | --- |
| `/student/dashboard` | Student dashboard |
| `/student/attendance` | Attendance view |
| `/student/assignments` | Assignment list and submissions |
| `/student/quizzes` | Quiz attempts |
| `/student/qna` | Course Q&A |
| `/student/notification` | Notifications |
| `/student/notifications` | Notifications |
| `/student/courses` | Enrolled courses |
| `/student/registration` | Course registration |
| `/student/grades` | Grades |
| `/student/transcript` | Transcript |
| `/student/timetable` | Timetable |
| `/student/leave-status` | Leave application status |
| `/student/ta` | Teaching Assistant assignments and applications |

## Frontend Structure

```text
src/
|-- App.jsx                         Route definitions and role dashboard redirect
|-- main.jsx                        React entry point
|-- index.css                       Global styles
|-- components/                     Shared layout, header, sidebar, notification, and account modals
|-- pages/
|   |-- Landing.jsx                  Public landing page
|   |-- Dashboard.jsx                Admin dashboard
|   |-- Profile.jsx                  Profile and account settings
|   |-- Notifications.jsx            Shared notification page
|   |-- auth/                        Login, MFA, setup, reset, and recovery components
|   |-- AdmissionApplication/        Public admission application flow
|   |-- admin/                       Admin management pages
|   |-- teacher/                     Teacher portal pages
|   `-- student/                     Student portal pages
|-- utils/
|   |-- api.js                       Axios API modules and auth handling
|   |-- apiCache.js                  SessionStorage GET cache and invalidation
|   |-- env.js                       Frontend environment URL helpers
|   |-- socket.js                    Socket.IO client wrapper
|   |-- permissions.js               Frontend permission helpers
|   `-- clientLogger.js              Client logging helper
`-- styles/                         Shared CSS files
```

## API Layer

`src/utils/api.js` creates the shared Axios client, attaches cache interceptors, adds the JWT bearer token from localStorage, and handles unauthorized responses by clearing local auth state and redirecting to login.

Exported API modules include:

- `authAPI`, `userAPI`, `teacherAPI`, `studentAPI`
- `admissionAPI`, `announcementAPI`, `notificationAPI`, `qnaAPI`
- `departmentAPI`, `programAPI`, `curriculumAPI`, `termAPI`, `courseAPI`
- `offeringAPI`, `enrollmentAPI`, `semesterInchargeAPI`
- `assignmentAPI`, `quizAPI`, `attendanceAPI`, `leaveAPI`
- `dashboardAPI`, `reportsAPI`, `auditLogAPI`
- `taAPI`, `scheduleAPI`, `roomAPI`, `holidayAPI`
- `gradeComponentAPI`, `markComponentAPI`, `lectureAPI`

## Real-Time Notifications

`src/utils/socket.js` manages the authenticated Socket.IO client connection using the configured socket URL and stored JWT. Notification UI is shared through `NotificationBell`, `Notifications`, and the dashboard layout.

## Build And Deployment Notes

- The app is a single-page React application.
- `vercel.json` rewrites all routes to `index.html` for client-side routing.
- Backend API and socket URLs must be configured through Vite environment variables for each environment.
