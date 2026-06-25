# CampusOne Project Context

> **Canonical project tracker and source of truth**
>
> Last verified: **June 25, 2026**
>
> Update this file whenever a feature, architectural rule, known issue, or future task changes. Do not create a separate audit or to-do document.

## 1. Project Summary

CampusOne is a university learning and campus management system covering admissions, users, academic structure, course delivery, assessment, attendance, scheduling, communication, reporting, and Teaching Assistant workflows.

The application is a mature, feature-heavy codebase. Most major product areas are implemented. Current work should focus on the verified future tasks in this document, especially academic-integrity, authorization, and data-consistency issues.

### User roles

- **Admin:** users, admissions, academic setup, offerings, enrollments, schedules, reports, announcements, audit logs, and TA oversight.
- **Teacher:** offerings, lectures, marks, assignments, attendance, quizzes, Q&A, announcements, leave review, and TA review.
- **Student:** courses, grades, transcript, timetable, assignments, attendance, quizzes, Q&A, leave, and TA applications.
- **Teaching Assistant:** a student with an approved `TAAssignment` and offering-scoped `TAPermission` values. TA is not a separate `User.role`.

## 2. Technology Stack

### Backend

- Node.js with ES modules
- Express 5
- Prisma 7 with `@prisma/adapter-pg`
- PostgreSQL through Supabase
- JWT authentication
- Authenticator TOTP and email OTP MFA
- Socket.IO
- `node-cron`
- Supabase Storage
- Resend email
- Multer and XLSX
- `pdf-parse` and Mammoth for text-only assignment similarity extraction

### Frontend

- React 19
- Vite 7
- React Router DOM 7
- Tailwind CSS 4
- Axios
- Socket.IO client
- Lucide icons
- React Hot Toast

## 3. Repository Map

```text
CampusOne/
|-- campusone-backend/
|   |-- controllers/       Domain business logic
|   |-- middleware/        Authentication, authorization, validation, uploads
|   |-- prisma/            Schema, client, and database history
|   |-- routes/            Express API routes
|   |-- scripts/           Seed and super-admin scripts
|   |-- services/          Email, notifications, sockets, cron, storage
|   |-- utils/             Grading, transcript, audit, and storage helpers
|   `-- server.js          Backend entry point
|-- campusone-frontend/
|   `-- src/
|       |-- components/    Shared dashboard UI
|       |-- pages/         Role-based pages
|       |-- styles/        Shared CSS
|       `-- utils/         API client, cache, permissions, sockets
|-- supabase/              Local Supabase configuration
|-- README.md              Setup and quick-start guide
|-- AI_IMPLEMENTATION.md   AI quiz and assignment-similarity architecture
`-- Project_context.md     Canonical tracker and project reference
```

The June 24 scan found approximately:

- 31 backend controller files
- 29 backend route files
- 84 React page files
- 38 Prisma models and 20 enums

## 4. Runtime Architecture

```text
React page
  -> frontend/src/utils/api.js
  -> Axios authentication and GET-cache interceptors
  -> Express route
  -> JWT, role, permission, or TA authorization
  -> controller
  -> Prisma/PostgreSQL
  -> optional storage, email, notification, socket, cron, or audit service
```

The backend starts Express, verifies the database connection, attaches Socket.IO, starts the notification cron, and mounts domain routes under `/api`.

The frontend keeps most server calls in `campusone-frontend/src/utils/api.js`. Successful mutations invalidate matching cached GET requests. Real-time notifications use Socket.IO with a periodic unread-count fallback.

## 5. Core Domain Model

- **Identity:** `User`, `TrustedDevice`, `Student`, `Teacher`, `Admin`
- **Admissions:** `AdmissionSettings`, `AdmissionApplication`
- **Academic structure:** `Department`, `Program`, `Curriculum`, `CurriculumCourse`, `Course`, `Term`
- **Course delivery:** `CourseOffering`, `Enrollment`, `SemesterIncharge`, `Lecture`
- **Assessment:** `Assignment`, `Submission`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAnswer`
- **Flexible grading:** `CourseGradeComponent`, `MarkComponent`
- **Attendance and leave:** `Attendance`, `LeaveApplication`, `Fine`
- **Communication:** `Announcement`, `Notification`, `QnaThread`, `QnaReply`
- **TA workflows:** `TAAssignment`
- **Scheduling:** `ScheduleConfig`, `Room`, `ClassSession`, `Holiday`
- **Governance:** `AuditLog`

The academic model is curriculum-versioned. A program owns curricula, a curriculum maps courses to semester slots, and a `CourseOffering` represents a course taught by a teacher in a term and section.

## 6. Verified Implemented Features

Status in this section means the relevant schema, backend route/controller, and frontend surface were found during the static scan. It does not override a known issue listed later.

### Infrastructure and authentication

- [x] Root command starts backend and frontend with `concurrently`
- [x] Full-screen modal overlays consistently render above the sticky CampusOne header
- [x] PostgreSQL and Prisma adapter setup
- [x] Local Supabase configuration
- [x] JWT login and protected routes
- [x] Failed-login account lockout
- [x] Authenticator TOTP MFA
- [x] Email OTP MFA
- [x] Trusted-device management
- [x] First-login password, email, and MFA flow
- [x] Forgot-password and reset flow
- [x] Super-admin recovery keys
- [x] Profile editing and profile-picture storage
- [x] OTP-gated profile email changes
- [x] Seven canonical admin permissions and permission presets
- [x] Permission-aware admin navigation and dashboard content

### User and admission management

- [x] Create, edit, activate, deactivate, unlock, and delete users
- [x] Excel student import and template download
- [x] Public multi-step admission application
- [x] Duplicate email, CNIC, and phone checks
- [x] Admission settings and application review
- [x] Admission document upload through Supabase Storage
- [x] Admission confirmation and status emails

### Email, announcements, and notifications

- [x] Resend-based email service
- [x] OTP, MFA, password-reset, announcement, Q&A, and admission emails
- [x] Throttled bulk announcement email delivery
- [x] Admin audience-targeted announcements
- [x] Teacher course announcements
- [x] In-app notification model and APIs
- [x] Socket.IO notification delivery
- [x] Notification bell and unread state
- [x] Assignment-deadline and quiz-opening cron notifications

### Academic management

- [x] Departments
- [x] Programs
- [x] Versioned curricula
- [x] Courses and prerequisites
- [x] Terms with single-active-term activation
- [x] Course offerings
- [x] Enrollments
- [x] Section transfer endpoint and UI
- [x] Excel enrollment import, template, validation, and row errors
- [x] Semester-incharge workflows
- [x] Student course view
- [x] Student transcript and CGPA
- [x] Student timetable
- [x] Student registration page and route

The registration page exists, but its sidebar entry remains intentionally disabled pending workflow review.

### Grading and course content

- [x] Course-level grade-component templates
- [x] Per-enrollment mark cells
- [x] Assignment, quiz, mid, final, presentation, participation, and lab component kinds
- [x] Teacher marks grid with initialization and bulk save
- [x] Per-kind marks visibility controls
- [x] Student grade-breakdown view
- [x] Participation marks
- [x] Assignment submission links in grade details
- [x] Lectures and Supabase-hosted materials

### Assignments and attendance

- [x] Assignment CRUD
- [x] Assignment file upload
- [x] Student submission and resubmission
- [x] Teacher Close/Reopen Submissions control with backend enforcement
- [x] Assignment similarity Stage 1 inside View Submissions
- [x] Exact file hash, normalized text hash, and local lexical-overlap detection
- [x] Text-only TXT, PDF, and DOCX extraction with unsupported/no-text reporting
- [x] Persistent similarity reports with stale-snapshot detection
- [x] Submission grading and feedback
- [x] TA self-grading prevention for assignment submissions
- [x] Attendance batch marking
- [x] Attendance sessions and summaries
- [x] Student attendance view
- [x] Low-attendance flag below 75%

### Quizzes

- [x] Quiz and question CRUD
- [x] Excel question import with a verified downloadable sample template
- [x] Prompt-based AI quiz question generation
- [x] Compact AI generator with course-name context and editable draft output
- [x] Strict AI structured output, CampusOne validation, duplicate context, rate limits, and missing-key handling
- [x] Teacher-only and student-only quiz route authorization
- [x] Draft-first quiz creation
- [x] Strict backend quiz/question validation
- [x] Atomic quiz question replacement
- [x] Start and resume attempts
- [x] Stable per-attempt shuffled question order
- [x] Answer saving
- [x] Server-enforced attempt deadlines and automatic expiry submission
- [x] Final-answer question ownership validation
- [x] Transactional and idempotent attempt finalization
- [x] Automatic MCQ and true/false grading
- [x] Manual answer grading
- [x] Correct separation of automatic and manual scores
- [x] Pending-manual-grading result state
- [x] Tab/window and fullscreen violation tracking
- [x] Copy, paste, context-menu, and common developer-tool shortcut blocking
- [x] Violation-based automatic submission
- [x] Student result review after quiz closure

### Q&A, leave, and TA workflows

- [x] Course Q&A threads and replies
- [x] Thread status and deletion workflows
- [x] Teacher notification and email for new questions
- [x] Student leave applications
- [x] Teacher leave review
- [x] Leave counters, fines, and automatic enrollment drop logic
- [x] Database-enforced fine-generation idempotency through stable quota units
- [x] TA eligibility checks
- [x] TA application, approval, rejection, and relief
- [x] Serializable TA approval with active-assignment cap revalidation
- [x] Offering-scoped TA permissions
- [x] TA access to attendance, assignment grading, Q&A, and roster operations
- [x] Student, teacher, and admin TA pages

### Scheduling, reporting, and audit

- [x] Schedule configuration
- [x] Room management
- [x] Holiday management
- [x] Offering class sessions and conflict validation
- [x] Overview, enrollment, grade, course, trend, admission, and attendance reports
- [x] Reports protected by `view_reports`
- [x] Audit-log model, read API, filters, pagination, and admin UI
- [x] Section transfers are atomic and blocked once section-specific academic activity exists
- [x] Shared active-term/end-date grading guard across assignment, mark-component, quiz-manual, and enrollment grading
- [x] Frontend GET cache with mutation invalidation
- [x] Full and mini seed scripts
- [x] Database helper scripts for push, reset, seed, super-admin, and Studio

## 7. Verification Snapshot

Checks run through June 25, 2026:

- **Prisma schema:** valid
- **Prisma Client generation:** passes
- **Quiz backend syntax checks:** pass
- **Quiz frontend production build:** passes
- **Quiz database schema push:** passes; the local database includes draft-first quizzes and persistent attempt question order
- **Changed backend controller imports and syntax:** pass
- **Grading-window boundary checks:** pass
- **Serializable transaction retry check:** passes
- **Earlier P0 local Supabase reset and seed baseline:** passed before the current Docker shutdown
- **Seed:** passes with 265 users, 250 students, 331 offerings, 8,195 enrollments, and 100,910 mark cells
- **Fine uniqueness integration check:** passes; two identical quota-unit inserts persisted as one row and temporary verification data was removed
- **Local Supabase Storage:** required buckets provisioned after reset
- **Backend health endpoint:** OK with database connected
- **Frontend development server:** HTTP 200
- **Frontend production build:** passes
- **Frontend build warnings:** main JavaScript bundle is about 955 KB before gzip; API/socket mixed static and dynamic imports prevent useful chunk splitting
- **Frontend lint:** fails with **88 errors and 17 warnings**

Notable lint-discovered defects:

- `AnnouncementManagement.jsx` references undefined `courseId`
- Several empty catch blocks hide failures
- Multiple unused variables and stale imports
- Multiple React hook dependency warnings
- Components are declared inside `ReviewSubmit` render
- Several effects trigger the React set-state-in-effect rule
- `TeacherQnA.jsx` contains a constant-truthiness expression

## 8. Audit Reconciliation

This table replaces the previous audit document.

| ID | Finding | Status | Current evidence |
|---:|---|---|---|
| 1 | TA can grade own assignment submission | Resolved | TA graders are rejected when their student ID matches the submission owner |
| 2 | TA approval can bypass active-assignment cap | Resolved | Approval recounts and updates inside a retrying serializable transaction |
| 3 | Fine generation race can create duplicates | Resolved | Stable `quotaUnit` values, a composite unique key, conflict-safe creation, and legacy-row backfill are implemented and verified against the local database |
| 4 | Section transfer can leave related records on old offering | Resolved | Transfer now runs serializably and rejects when grades, marks, attendance, submissions, quiz attempts, leave, or fines exist in either section |
| 5 | Frontend API URL is hard-coded | Open | `api.js` uses `http://localhost:5000/api` instead of `VITE_API_URL` |
| 6 | Announcement offering has no foreign key | Open | `Announcement.offeringId` is an indexed string without a Prisma relation |
| 7 | Old TA assignments count toward active cap | Open | Active count includes every `APPROVED` record without active-term filtering |
| 8 | Leave quota and fine calculation mismatch | Partial | Counter uses weighted `n`; fine quantity still uses raw `countedAbsent` |
| 9 | Leave dates are strings | Partial | Format/order checks exist, but schema fields remain strings and invalid calendar dates can pass |
| 10 | TA assignment duplicate rows | Resolved | `@@unique([studentId, offeringId])` exists |
| 11 | Reports overview N+1 query | Resolved | Audited nested query shape is gone |
| 12 | Invalid TA permission combinations | Resolved for audited case | Values are allow-listed and `VIEW_ROSTER` is always added |
| 13 | Audit writes are fire-and-forget | Open | Most callers do not await `AuditLogger.log()` |
| 14 | Announcement priority lacks backend validation | Open | Priority remains a free-form string |
| 15 | Announcement offering access leak | Resolved | Student and teacher offering IDs are scoped before course announcements are returned |
| 16 | Attendance TA permission bypass | Resolved | Approved TA plus `MARK_ATTENDANCE` is required |
| 17 | Q&A TA access/identity ambiguity | Open | TA access does not require enrollment and replies are not clearly marked as TA replies |
| 18 | Student section-transfer authorization | Resolved | Route requires `manage_offerings` |
| 19 | Grade changes after term closure | Resolved | Shared guard requires an active term and an inclusive, unexpired term end date across all identified grading paths |
| 20 | Announcement delete ownership | Resolved | Creator or admin check exists |
| 21 | TA review notes have no length limit | Open | Schema and API accept unbounded strings |
| 22 | Notification delivery reliability | Partial | Database insert and socket emit exist, but delivery is fire-and-forget without retry |
| 23 | Multiple active terms | Resolved | Activation deactivates all terms in one transaction |
| 24 | Sidebar TA request rejection handling | Resolved | Rejection is caught and state receives a fallback |
| 25 | Grade-distribution boundary bug | Resolved | Reports group stored grade letters directly |
| 26 | Console logging in application code | Open | Scan found 117 console calls across backend controllers/services/middleware/utils |
| 27 | Generic error messages | Partial | Some flows use server messages; many still collapse failures into generic text or empty catches |
| 28 | Stale sidebar TA status | Open | Active TA assignments load only on sidebar mount |
| 29 | TA oversight has no pagination | Open | Backend returns all matching assignments and UI renders all rows |
| 30 | Audit timestamp precision is implicit | Partial | `createdAt` exists, but no explicit database precision annotation is declared |

## 9. Future Tasks

Only open work belongs here. Move an item to the verified feature inventory or resolved audit status when completed.

### P1 - Schema and business-rule hardening

- [ ] **Use environment-aware API configuration** (`A5`)  
  Read `import.meta.env.VITE_API_URL` with a safe same-origin fallback.

- [ ] **Add the Announcement-to-Offering relation** (`A6`)  
  Choose cascade, restrict, or set-null deletion behavior and migrate existing rows safely.

- [ ] **Scope TA active counts to the relevant term** (`A7`)  
  Filter through `offering.term` or add explicit term ownership if required by reporting/history.

- [ ] **Unify leave quota, fine, and drop boundaries** (`A8`)  
  Use one shared calculation based on weighted `n` and document exact inclusive boundaries.

- [ ] **Store leave and attendance dates as database dates** (`A9`)  
  Validate real calendar dates, range order, and term bounds before migrating string values.

- [ ] **Make audit recording reliable** (`A13`)  
  Await critical logs or introduce a durable queue/outbox.

- [ ] **Validate announcement priority on the backend** (`A14`)  
  Prefer a Prisma enum or strict request validation.

- [ ] **Clarify Q&A TA behavior** (`A17`)  
  Either require enrollment or return/render an explicit TA identity badge.

- [ ] **Limit TA review-note length** (`A21`)  
  Add backend validation, UI limits, and a bounded database column.

- [ ] **Improve critical notification reliability** (`A22`)  
  Return promises from notification helpers and add retry/outbox handling where delivery is business-critical.

### P2 - Maintainability and scale

- [ ] **Replace production console calls with structured logging** (`A26`)
- [ ] **Improve error context and remove silent catches** (`A27`)
- [ ] **Refresh sidebar TA status on focus or relevant socket events** (`A28`)
- [ ] **Paginate TA oversight end to end** (`A29`)
- [ ] **Declare audit timestamp precision explicitly if ordering requires it** (`A30`)
- [ ] **Fix notification full-page routing**  
  The bell navigates to plural `/admin/notifications`, `/teacher/notifications`, and `/student/notifications`, while registered teacher/student routes are singular and no admin route is registered.
- [ ] **Decide and enforce marks-release scope**  
  The endpoint is offering-shaped, but it updates course-level `CourseGradeComponent` rows and therefore affects every offering of that course.
- [ ] **Resolve the current frontend lint baseline**  
  Start with undefined identifiers and React correctness rules, then unused code and hook warnings.
- [ ] **Fix `AnnouncementManagement.jsx` undefined `courseId`**
- [ ] **Reduce the oversized frontend entry bundle**  
  Remove ineffective mixed dynamic imports and introduce route/page-level splitting.

### Deferred product features

- [ ] **Wire `GRADE_QUIZZES` into quiz authorization**  
  The permission exists in the schema and TA approval UI, but the quiz controllers do not currently check or grant it.

- [ ] **TA resource uploads**  
  `UPLOAD_RESOURCES` exists as a permission value and appears in UI choices, but no resource upload endpoint or TA resource page exists.

- [ ] **Inbound Q&A email replies**  
  Parse supported inbound email webhooks and create `QnaReply` records with a clear email source.

- [ ] **Assignment similarity/plagiarism service**
  **Stage 1 is implemented.** Continue with Stage 2 from `AI_IMPLEMENTATION.md`: use cached text embeddings for unresolved candidate matches, optional LLM explanations for only the strongest passages, teacher review records, and audit logs. Ignore images and keep results as review evidence rather than automatic misconduct verdicts.

- [ ] **Advanced quiz monitoring**  
  Optional screen-sharing capture and webcam snapshots with explicit user permission and a defined privacy policy.

- [ ] **Review student registration workflow and navigation**  
  The route/page exist; verify rules and then decide whether to restore the sidebar entry.

## 10. Important Engineering Rules

- Current executable source and Prisma schema outrank comments or old assumptions.
- Inspect the controller, route, schema model, and frontend caller before changing a feature.
- Backend authorization is the security boundary; hidden frontend navigation is not authorization.
- Full-screen dialogs must use the shared `z-modal` layer rather than `z-50`.
- Admin roles and admin permissions are separate concepts.
- A TA operation must verify approved status, offering scope, required permission, and self-action restrictions.
- `CourseGradeComponent` defines grading structure; `MarkComponent` stores individual scores.
- Mutations affecting cached GET endpoints must invalidate the matching API cache prefixes.
- Notification changes may involve database rows, Socket.IO, cron metadata, email, and client state.
- Uploaded files should use Supabase Storage rather than local persistent uploads.
- Database invariants should be enforced in the schema when concurrency can bypass controller checks.
- Avoid destructive `db:reset` unless data loss is explicitly intended.

## 11. Environment Variables

Backend:

```env
PORT=5000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRE=1h
NODE_ENV=development
CLIENT_URL=http://localhost:5173
RESEND_API_KEY=...
RESEND_FROM=CampusOne <...>
RESEND_FROM_ANNOUNCEMENT=CampusOne Announcement <...>
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_QUIZ_MODEL=gpt-5.4-mini
OPENAI_CHEAP_MODEL=gpt-5.4-nano
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api
```

The variable is documented but is not yet consumed by the current API client; see future task `A5`.

## 12. Common Commands

From the repository root:

```bash
npm install
npm run dev
```

Backend:

```bash
cd campusone-backend
npm install
npx prisma generate
npm run dev
npm run db:push
npm run db:seed
npm run db:seed
npm run db:superadmin
npm run db:studio
```

Frontend:

```bash
cd campusone-frontend
npm install
npm run dev
npm run lint
npm run build
```

## 13. Maintenance Procedure

When work is completed:

1. Verify the relevant source paths and schema.
2. Update the matching audit row.
3. Remove the item from **Future Tasks**.
4. Add or adjust the item in **Verified Implemented Features** when appropriate.
5. Update the verification date at the top.
6. Keep this file as the only project status and future-work tracker.
