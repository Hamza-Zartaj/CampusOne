# CampusOne Project Context

> **Canonical project tracker and source of truth**
>
> Last verified: **June 30, 2026**
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
- `pdf-parse`, Mammoth, pgvector, and OpenAI embeddings for assignment similarity analysis

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
- [x] Supabase Storage bucket provisioning for assignment files, lecture/TA resources, admission documents, and profile pictures
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
- [x] Notification full-page routes for admin, teacher, and student plural notification URLs
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
- [x] Teacher marks grid shows only actual created assignments/quizzes and teacher-created configured assessment slots, with grouped readable headers, teacher-selected score scale, per-student weighted contribution out of 100, and graded-weight coverage
- [x] Teacher marks grid can create configured mark-only assessment slots such as mid term, final term, project/presentation, participation, and lab work directly on the page while enforcing the admin course configuration and allowing the teacher to choose the assessment's out-of marks
- [x] Per-kind marks visibility backend controls
- [x] Course-wide mark release endpoint
- [x] Student grade-breakdown view
- [x] Shared grading helper averages `AVERAGE` components, so multi-slot quiz/assignment components contribute only their configured weight
- [x] Participation marks
- [x] Assignment submission links in grade details
- [x] Lectures and Supabase-hosted materials
- [x] Lecture create/update dates are backend-validated against term bounds, holidays, existing lecture dates, and the offering `ClassSession` timetable

### Assignments and attendance

- [x] Assignment CRUD
- [x] Assignment create/edit flow links each assignment to a configured grade-component slot and blocks creation beyond the configured count
- [x] Assignment default score scale is 10 marks in the create modal, backend fallback, and default lecture grade-component template
- [x] Assignment grading syncs official submission marks into the matching lecturer marks-grid cell
- [x] Assignment file upload
- [x] Student submission and resubmission
- [x] Student assignment submissions immediately refresh cached active-assignment state and update the visible card status
- [x] Student assignment upload files are stored with generated course-code, student-name, and roll-number filenames instead of the original uploaded filename
- [x] Teacher Close/Reopen Submissions control with backend enforcement
- [x] Assignment similarity Stage 1 inside View Submissions
- [x] Exact file hash, normalized text hash, and local lexical-overlap detection
- [x] Text-only TXT, PDF, and DOCX extraction with unsupported/no-text reporting
- [x] Persistent similarity reports with stale-snapshot detection
- [x] Assignment similarity Stage 2 is teacher-triggered from a fresh Stage 1 report, not chained automatically
- [x] Stage 2 caches pgvector text embeddings and flags semantic matches only for pairs Stage 1 did not already resolve
- [x] Stage 2 can add concise AI explanations for the strongest semantic matches
- [x] Teacher review decisions for similarity matches are stored and audit-logged
- [x] Assignment similarity findings render on each related submission card with match type, score, peer, submitted-first/later timing, evidence, AI explanation, and review actions
- [x] Submission grading and feedback
- [x] TA self-grading prevention for assignment submissions
- [x] Attendance batch marking
- [x] Attendance batch marking is backend-validated against term bounds, holidays, the offering `ClassSession` timetable, and an existing lecture for the same offering/date
- [x] Attendance page can create a missing lecture inline before marking attendance
- [x] Attendance sessions and summaries
- [x] Student attendance view
- [x] Low-attendance flag below 75%

### Quizzes

- [x] Quiz and question CRUD
- [x] Quiz create/edit flow links each quiz to a configured grade-component slot and blocks creation beyond the configured count
- [x] Quiz raw scores are scaled into the grade-component total before syncing to the lecturer marks grid
- [x] Online and printed/offline quiz delivery modes, with printable question papers, mode-specific scheduling, full enrolled-student roster status, and offline mark entry synced to the marks grid
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
- [x] Mixed auto/manual quizzes do not sync a marks-grid grade until all short-answer questions are graded
- [x] Tab/window and fullscreen violation tracking
- [x] Copy, paste, context-menu, and common developer-tool shortcut blocking
- [x] Violation-based automatic submission
- [x] Quiz submit/start/answer mutations invalidate student quiz-list caches so submitted attempts disappear from active My Quizzes immediately
- [x] Student result review after quiz closure

### Q&A, leave, and TA workflows

- [x] Course Q&A threads and replies
- [x] Thread status and deletion workflows
- [x] Teacher notification and email for new questions
- [x] Student leave applications
- [x] Student leave application modal selects upcoming timetable lecture slots instead of manually entering dates; non-adjacent selected dates submit as separate leave applications
- [x] Teacher leave review
- [x] Leave counters, fines, and automatic enrollment drop logic
- [x] Database-enforced fine-generation idempotency through stable quota units
- [x] TA eligibility checks
- [x] TA application, approval, rejection, and relief
- [x] Serializable TA approval with active-assignment cap revalidation
- [x] Offering-scoped TA permissions
- [x] TA access to attendance, assignment grading, Q&A, and roster operations
- [x] `GRADE_QUIZZES` authorizes approved TAs to review quiz attempts and save manual quiz grades for teacher approval
- [x] TA assignment and quiz grades are saved as pending recommendations until a teacher/admin approves them into official student-visible marks
- [x] `UPLOAD_RESOURCES` authorizes approved TAs to upload offering resources; enrolled students see them in My Courses
- [x] TA assignment cards expose real course-tool buttons for roster, attendance, assignment grading, quiz grading, Q&A, and resources, with roster and Q&A access scoped to approved TA permissions
- [x] TA assignment grading opens the submissions panel without teacher-only close/submission-similarity controls blocking the TA view
- [x] TA assignment grading shows saved pending-approval marks and feedback on submission cards so TAs can see/edit their own recommendations before teacher approval
- [x] Student, teacher, and admin TA pages
- [x] TA oversight pagination across backend API and admin UI
- [x] Sidebar TA status refreshes on focus and relevant socket notification events

### Scheduling, reporting, and audit

- [x] Schedule configuration
- [x] Room management
- [x] Holiday management
- [x] Offering class sessions and conflict validation
- [x] Overview, enrollment, grade, course, trend, admission, and attendance reports
- [x] Reports protected by `view_reports`
- [x] Audit-log model, read API, filters, pagination, and admin UI
- [x] Audit-log `createdAt` precision is explicitly declared as database `TIMESTAMP(3)`
- [x] Section transfers are atomic and blocked once section-specific academic activity exists
- [x] Shared active-term/end-date grading guard across assignment, mark-component, quiz-manual, and enrollment grading
- [x] Frontend GET cache with mutation invalidation
- [x] Backend runtime logging uses a structured logger wrapper
- [x] Frontend runtime diagnostics use a dev-only client logger wrapper
- [x] Frontend route/page-level code splitting reduces the initial entry bundle
- [x] Full and mini seed scripts
- [x] Focused seed creates admin, teacher, student, TA, academic setup, grade components, schedule config, rooms, and class sessions without seeding assignments or quizzes
- [x] Database helper scripts for push, reset, seed, super-admin, and Studio

## 7. Verification Snapshot

Checks run through June 30, 2026:

- **Prisma schema:** valid
- **Prisma Client generation:** passes
- **Quiz backend syntax checks:** pass
- **Quiz frontend production build:** passes
- **Quiz database schema push:** passes; the local database includes draft-first quizzes and persistent attempt question order
- **Changed backend controller/middleware/service/util imports and syntax:** pass
- **Changed backend routes syntax:** pass
- **TA pending-grade/resource schema and Prisma Client generation:** pass
- **Grading-window boundary checks:** pass
- **Serializable transaction retry check:** passes
- **Earlier P0 local Supabase reset and seed baseline:** passed before the current Docker shutdown
- **Seed:** passes with 265 users, 250 students, 331 offerings, 8,195 enrollments, and 100,910 mark cells
- **Fine uniqueness integration check:** passes; two identical quota-unit inserts persisted as one row and temporary verification data was removed
- **Local Supabase Storage:** required buckets provisioned after reset
- **Supabase Storage bucket repair:** `npm.cmd run storage:buckets` passed and confirmed the current database has `admission-documents`, `assignments`, `lectures`, and `profile-pictures`; `npx.cmd prisma validate` passes after adding the idempotent storage bucket migration, local Supabase seed, and reset hook
- **Prisma migrate deploy note:** `npx.cmd prisma migrate deploy` cannot run on the current local DB because it is non-empty and not baselined under Prisma Migrate (`P3005`); the storage bucket SQL itself was applied through the repair script
- **Backend health endpoint:** OK with database connected
- **Frontend development server:** HTTP 200
- **Frontend production build:** passes
- **Student leave lecture-slot application UX:** changed leave backend syntax check passes; frontend production build passes after replacing manual date inputs with selectable upcoming lecture slots generated from the course timetable
- **Student quiz cache invalidation:** frontend production build passes after quiz mutations were added to API cache invalidation for `/students/me` active quiz data
- **Focused seed reset/reseed:** last full local run passed for the earlier focused two-course test dataset; the current seed is now assessment-free and was not re-run to avoid resetting local data
- **Focused seed course/schedule baseline:** `node --check scripts\seed.js` passes; the seed now keeps CS101/CS201 grade components, schedule config, rooms, and class sessions while intentionally creating no assignment or quiz records
- **Teacher marks grid assessment UI:** backend mark-component route/controller syntax checks and frontend production build pass after removing the visibility/weightage panel, showing only created coursework/configured assessment columns, adding in-page configured assessment creation, and allowing teacher-selected out-of marks with automatic weight scaling
- **Coursework grade-slot linking:** Prisma schema validation, changed backend syntax checks, and frontend production build pass
- **Quiz score scaling and averaged component weighting:** changed backend syntax checks and frontend production build pass
- **Printed/offline quiz workflow:** Prisma schema validation, Prisma Client generation, local `npm.cmd run db:push`, direct `deliveryMode` read check, changed quiz backend route/controller syntax checks, and frontend production build pass; mode-specific quiz scheduling UI build passes
- **Frontend build size:** route-level splitting reduced the initial app chunk to about 373 KB before gzip
- **Frontend build warnings:** API/socket mixed static and dynamic imports still produce one Vite warning, but the oversized entry warning is gone
- **Assignment similarity Stage 2:** Prisma schema validation, Prisma Client generation, changed backend syntax checks, and frontend production build pass
- **Frontend lint:** passes with **0 errors and 52 warnings**
- **TA course-tool UX:** changed backend offering/Q&A controller and offering route syntax checks pass; frontend production build passes after replacing TA permission chips with course-tool buttons, adding the roster modal, Q&A offering deep links, and scoped TA offering loading
- **Assignment default marks:** frontend production build passes; changed assignment controller and grade-template syntax checks pass after changing the assignment creation/default grade-component scale from 100 to 10
- **Student assignment submission refresh:** frontend production build passes after assignment submissions were added to API cache invalidation for `/students/me` active-assignment data and the submitted card is updated immediately from the submit response
- **TA assignment submissions panel:** frontend production build passes after the submissions modal stopped bundling teacher-only similarity-report loading into the TA submissions fetch and hid teacher-only close/similarity controls for TA users
- **TA assignment pending-grade visibility:** frontend production build passes after TA-saved assignment grades update the open submissions panel immediately and render as pending approval with the saved mark/feedback
- **Assignment submission file naming:** changed backend assignment controller and storage helper syntax checks pass; Prisma schema validation passes after student upload storage paths switched to generated `course-student-roll.ext` filenames with explicit overwrite support for resubmissions
- **Assignment similarity submission-card UX:** frontend production build passes after moving visible similarity findings from the top report list onto each related submission card with submitted-first/later timing and inline review controls

Remaining lint warnings:

- Multiple unused variables and stale imports
- Multiple React hook dependency warnings

## 8. Audit Reconciliation

This table replaces the previous audit document.

| ID | Finding | Status | Current evidence |
|---:|---|---|---|
| 1 | TA can grade own assignment submission | Resolved | TA graders are rejected when their student ID matches the submission owner |
| 2 | TA approval can bypass active-assignment cap | Resolved | Approval recounts and updates inside a retrying serializable transaction |
| 3 | Fine generation race can create duplicates | Resolved | Stable `quotaUnit` values, a composite unique key, conflict-safe creation, and legacy-row backfill are implemented and verified against the local database |
| 4 | Section transfer can leave related records on old offering | Resolved | Transfer now runs serializably and rejects when grades, marks, attendance, submissions, quiz attempts, leave, or fines exist in either section |
| 5 | Frontend API URL is hard-coded | Resolved | `api.js` reads `import.meta.env.VITE_API_URL` with a same-origin `/api` fallback |
| 6 | Announcement offering has no foreign key | Resolved | `Announcement.offeringId` has a Prisma relation to `CourseOffering` with `onDelete: SetNull` and a cleanup/FK migration |
| 7 | Old TA assignments count toward active cap | Resolved | Eligibility and approval counts scope approved TA assignments through the relevant offering term |
| 8 | Leave quota and fine calculation mismatch | Resolved | Leave banding and fine generation use shared weighted `n` boundaries: `n <= 4`, `4 < n <= 6`, and `n > 6` |
| 9 | Leave dates are strings | Resolved | Leave and attendance dates are stored as database dates with real-date, range, and term-bound validation |
| 10 | TA assignment duplicate rows | Resolved | `@@unique([studentId, offeringId])` exists |
| 11 | Reports overview N+1 query | Resolved | Audited nested query shape is gone |
| 12 | Invalid TA permission combinations | Resolved for audited case | Values are allow-listed and `VIEW_ROSTER` is always added |
| 13 | Audit writes are fire-and-forget | Resolved | Critical P1 mutation paths await audit writes through awaitable audit helpers |
| 14 | Announcement priority lacks backend validation | Resolved | Announcement create/update paths strictly allow only `low`, `medium`, or `high` |
| 15 | Announcement offering access leak | Resolved | Student and teacher offering IDs are scoped before course announcements are returned |
| 16 | Attendance TA permission bypass | Resolved | Approved TA plus `MARK_ATTENDANCE` is required |
| 17 | Q&A TA access/identity ambiguity | Resolved | Approved `ANSWER_QNA` TAs can participate and API/UI return/render explicit TA identity badges |
| 18 | Student section-transfer authorization | Resolved | Route requires `manage_offerings` |
| 19 | Grade changes after term closure | Resolved | Shared guard requires an active term and an inclusive, unexpired term end date across all identified grading paths |
| 20 | Announcement delete ownership | Resolved | Creator or admin check exists |
| 21 | TA review notes have no length limit | Resolved | TA review notes are backend-validated, UI-limited, and stored in a bounded database column |
| 22 | Notification delivery reliability | Resolved | Notification helpers return promises, retry database writes, and critical P1 delivery paths await them |
| 23 | Multiple active terms | Resolved | Activation deactivates all terms in one transaction |
| 24 | Sidebar TA request rejection handling | Resolved | Rejection is caught and state receives a fallback |
| 25 | Grade-distribution boundary bug | Resolved | Reports group stored grade letters directly |
| 26 | Console logging in application code | Resolved | Backend runtime source uses `utils/logger.js`; frontend runtime source uses `utils/clientLogger.js`; direct console calls remain only inside those wrappers |
| 27 | Generic error messages | Resolved for P2 scope | Empty catch blocks were removed from runtime source and recovery paths now log contextual details through the logger wrappers |
| 28 | Stale sidebar TA status | Resolved | Sidebar refreshes active TA assignments on window focus and relevant socket notifications |
| 29 | TA oversight has no pagination | Resolved | Backend `getAllAssignments` returns paginated results and the admin UI sends page/limit controls |
| 30 | Audit timestamp precision is implicit | Resolved | `AuditLog.createdAt` is declared with explicit `@db.Timestamp(3)` precision and a migration |

## 9. Future Tasks

Only open work belongs here. Move an item to the verified feature inventory or resolved audit status when completed.

### Deferred product features

- [ ] **Inbound Q&A email replies**  
  Parse supported inbound email webhooks and create `QnaReply` records with a clear email source.

- [ ] **Advanced quiz monitoring**  
  Optional screen-sharing capture and webcam snapshots with explicit user permission and a defined privacy policy.

- [ ] **Review student registration workflow and navigation**  
  The route/page exist; verify rules and then decide whether to restore the sidebar entry.

## 10. Important Engineering Rules

- Current executable source and Prisma schema outrank comments or old assumptions.
- Inspect the controller, route, schema model, and frontend caller before changing a feature.
- After completing any meaningful feature, schema, workflow, seed, verification, or UX change, update `Project_context.md` in the same turn so it remains the canonical project tracker.
- Backend authorization is the security boundary; hidden frontend navigation is not authorization.
- Full-screen dialogs must use the shared `z-modal` layer rather than `z-50`.
- Admin roles and admin permissions are separate concepts.
- A TA operation must verify approved status, offering scope, required permission, and self-action restrictions.
- `CourseGradeComponent` defines grading structure; `MarkComponent` stores individual scores.
- Assignment and quiz records use `componentIndex` to link coursework to the matching `MarkComponent` slot.
- Quiz attempts may have any raw total; official marks-grid sync scales the raw quiz score to the configured quiz component total.
- Quizzes with pending short-answer grading must leave the linked marks-grid cell blank until all manual grading is complete.
- `AVERAGE` grade components average graded slot percentages before applying `weightPercent`; they must not sum every slot as separate final-weight marks.
- Mutations affecting cached GET endpoints must invalidate the matching API cache prefixes.
- Notification changes may involve database rows, Socket.IO, cron metadata, email, and client state.
- Uploaded files should use Supabase Storage rather than local persistent uploads.
- Attendance and lecture dates must not be treated as free-form dates; backend mutations must validate term bounds, holidays, and the offering `ClassSession` timetable.
- Attendance marking requires an existing lecture for the same offering/date; the teacher attendance page provides an inline create-lecture flow when one is missing.
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
OPENAI_SIMILARITY_MODEL=gpt-5.4-nano
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api
```

`VITE_API_URL` is consumed by the frontend API client, with a same-origin `/api` fallback.

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
