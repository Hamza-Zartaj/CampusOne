# CampusOne Architecture

CampusOne is a full-stack university learning and campus management system. The original application combines a React frontend, an Express API, Prisma with PostgreSQL, Supabase Storage, Socket.IO, Resend email, and OpenAI-assisted assessment workflows.

Related docs: [Features](./FEATURES.md), [Security](./SECURITY.md), [Setup](./SETUP.md), [Demo](./DEMO.md)

## System Overview

The original full-stack system is organized around a separate frontend and backend:

```text
React/Vite frontend
  -> Axios API layer and Socket.IO client
  -> Express API routes
  -> auth, role, permission, and TA authorization middleware
  -> controllers and services
  -> Prisma client
  -> PostgreSQL / Supabase Storage / email / AI / notifications
```

The public demo is a separate frontend-only build:

```text
React/Vite demo frontend
  -> mocked API adapters
  -> localStorage-backed demo data
  -> simulated sockets, uploads, emails, and AI responses
```

## Repository Layout

```text
campusone-backend/        Express API, Prisma schema, services, scripts
campusone-frontend/       Main React application
campusone-frontend-demo/  Frontend-only public demo
supabase/                 Local Supabase configuration
Screenshots/              Product screenshots used by the README
docs/                     Public technical documentation
```

## Backend Architecture

The backend entry point is `campusone-backend/server.js`. It creates an Express app, applies JSON and URL-encoded body parsing, enables CORS, exposes health routes, mounts the API route modules, initializes Socket.IO on the HTTP server, starts the notification scheduler, and connects Prisma before serving traffic.

The backend uses a route/controller/service shape:

- `routes/` defines HTTP endpoints and attaches authentication or authorization middleware.
- `controllers/` contains request handling and workflow coordination.
- `services/` contains integrations and reusable domain workflows, including email, storage, notifications, AI quiz generation, assignment similarity analysis, and audit logging.
- `middleware/` contains authentication, authorization, permission checks, TA access checks, validation, and upload handling.
- `prisma/` contains the database schema, migrations, and seed logic.
- `scripts/` contains operational helpers such as seeding, super admin creation, and storage bucket provisioning.

The Prisma client uses Prisma 7 with `@prisma/adapter-pg` and a PostgreSQL connection pool. In non-production mode it reuses a singleton client to avoid exhausting database connections during local development.

## Frontend Architecture

The main frontend is a React 19 and Vite 7 application. Routing is handled with React Router and lazy-loaded pages wrapped by a shared dashboard layout for authenticated experiences.

The frontend separates pages by role:

- Admin pages cover users, admissions, academic setup, offerings, schedules, reports, audit logs, announcements, notifications, and TA oversight.
- Teacher pages cover dashboard, offerings, attendance, assignments, quizzes, Q&A, announcements, marks, lectures, leave applications, notifications, and TA applications.
- Student pages cover dashboard, courses, registration, attendance, assignments, quizzes, Q&A, grades, transcript, timetable, leave status, notifications, and TA workflows.

API access is centralized in `campusone-frontend/src/utils/api.js`. The Axios instance attaches JWT bearer tokens from local storage, handles `401` responses by clearing local auth state, and exports domain-specific API helpers.

Read-heavy GET requests use a sessionStorage cache layer with endpoint-specific TTLs. Mutating requests invalidate related cache prefixes so dashboards and management pages can stay responsive without permanently stale data.

## Data Model

The database is organized around these main domains:

- Identity: users, students, teachers, admins, and trusted devices.
- Admissions: admission settings and admission applications.
- Academic structure: departments, programs, curricula, courses, terms, offerings, enrollments, and semester incharges.
- Assessment: assignments, submissions, quizzes, questions, attempts, answers, grade components, mark components, transcripts, and similarity reports.
- Attendance and leave: attendance records, attendance policy, leave applications, and fines.
- Communication: announcements, Q&A threads, replies, notifications, and audit logs.
- Scheduling: rooms, schedule configuration, class sessions, holidays, and lecture records.
- Teaching assistants: TA applications, assignments, permissions, pending grades, and shared resources.

The user roles are represented as `admin`, `teacher`, and `student`. Teaching assistant access is modeled as an approved student-to-offering assignment with scoped TA permissions, rather than as a fourth global user role.

## External Services

CampusOne can integrate with:

- PostgreSQL or Supabase PostgreSQL for application data.
- Supabase Storage for assignment files, lecture resources, admission documents, and profile pictures.
- Resend for OTP, admissions, announcement, and Q&A email delivery.
- OpenAI for AI-assisted quiz generation and second-stage assignment similarity review.
- Socket.IO for authenticated real-time notifications.
- Vercel for frontend deployment with SPA rewrites.

The frontend-only demo does not call these live services. It simulates the workflows in browser storage so reviewers can explore the product without provisioning infrastructure.
