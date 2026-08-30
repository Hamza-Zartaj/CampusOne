# CampusOne Feature Inventory

This is the public feature inventory for the original full-stack CampusOne system. The public demo shows many of these workflows with simulated data and integrations; see [Demo](./DEMO.md) for demo-specific behavior.

Related docs: [Architecture](./ARCHITECTURE.md), [Security](./SECURITY.md), [Setup](./SETUP.md)

## User And Authentication

- Role-based accounts for admins, teachers, and students.
- JWT login with protected profile and session endpoints.
- First-login setup, profile editing, profile picture upload, and password change flows.
- TOTP-based two-factor authentication, email OTP verification, trusted devices, and account recovery flows.
- Admin user management with search, statistics, create/update actions, activation, deactivation, unlocking, deletion, and spreadsheet import support.
- Admin permission presets for scoped access to users, admissions, academic setup, offerings, announcements, audit logs, and reports.

## Admissions

- Public admissions settings and application entry points.
- Multi-step application workflow with duplicate checks.
- Admission document uploads.
- Admin review queue, application status management, statistics, and applicant detail views.
- Email notifications for application submission, review, acceptance, rejection, announcements, and related admissions events.

## Academic Structure

- Department management.
- Program management with program type support.
- Curriculum and curriculum-course management.
- Course management with course types, prerequisites, credit information, and academic metadata.
- Academic term management with season and year structure.

## Courses, Offerings, And Enrollment

- Course offering management by term, section, teacher, schedule, and capacity.
- Teacher offering views and student course views.
- Enrollment management for enroll, drop, section transfer, import, and current enrollment workflows.
- Semester incharge support.
- Student registration and student course history views.

## Scheduling

- Schedule configuration.
- Room management with room type and capacity data.
- Holiday management.
- Class session generation and timetable views.
- Teacher, student, and room availability checks.
- Conflict-aware scheduling workflows.

## Attendance, Leave, And Fines

- Teacher and authorized TA attendance marking.
- Batch attendance updates by course offering, student, date, and session.
- Student attendance summaries and course-level attendance views.
- Attendance policy configuration.
- Leave applications with teacher/admin review workflows.
- Leave-aware attendance and fine workflows for low attendance scenarios.

## Assignments

- Assignment creation, editing, publishing, closing, and reopening.
- Assignment attachments and student submissions.
- Resubmission support where enabled by assignment rules.
- Teacher grading, feedback, and release workflows.
- TA grading through pending-grade approval flows.
- Assignment similarity reports using exact hash, normalized text hash, lexical similarity, and optional AI review.

## Quizzes

- Quiz draft, publish, schedule, and attempt lifecycle.
- Online and offline quiz delivery modes.
- Multiple question types, including multiple choice, true/false, short answer, and essay-style questions.
- Question import support.
- AI-assisted quiz question generation for teachers.
- Student answer saving, submission, autoscore/manual grading, result review, and reopen grants.
- Anti-cheat event tracking for quiz attempts.
- TA grading support through pending approval workflows.

## Marks, Grades, And Transcript

- Configurable grade components for courses.
- Mark component management for offering-level assessment structures.
- Teacher marks grid and release workflows.
- Weighted totals, grade letters, GPA/CGPA style transcript views, and student grade summaries.

## Communication

- Announcements targeted by role and course offering.
- In-app notifications with real-time Socket.IO delivery in the full-stack system.
- Course Q&A threads and replies.
- Email notifications for selected announcement and Q&A events.

## Teaching Assistant Workflows

- Student TA eligibility and application flows.
- Teacher review of TA applications.
- Admin and teacher approval, rejection, and relief workflows.
- Scoped TA permissions per offering.
- TA resource sharing and pending grade approval flows.
- Admin TA oversight.

## Reporting And Audit

- Admin reports for academic, user, attendance, grade, and activity views.
- Audit logs for important administrative and assessment actions.
- Audit log filtering and admin review pages.

## AI-Assisted Workflows

- Teacher AI quiz generation with prompt validation, question count limits, type mix controls, and structured output validation.
- Assignment similarity review with deterministic matching first and optional AI-supported analysis for top matches.

## File Handling

- Supabase Storage integration for assignments, lecture files, admission documents, and profile pictures.
- Public URL helpers, signed URL helpers, safe random filenames, and delete helpers.
- Spreadsheet import support for selected admin workflows.
