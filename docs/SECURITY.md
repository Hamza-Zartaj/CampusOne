# CampusOne Security Notes

This document summarizes the security controls visible in the public codebase. It is not a formal security audit and should not be treated as a production compliance statement.

Related docs: [Architecture](./ARCHITECTURE.md), [Features](./FEATURES.md), [Setup](./SETUP.md)

## Authentication

- API routes use JWT bearer authentication for protected endpoints.
- The authentication middleware verifies tokens with `JWT_SECRET`, loads the current user, checks active status, and blocks locked accounts.
- Expired account locks are cleared by the authentication middleware before continuing.
- Public auth routes include login, MFA verification, email OTP verification, password recovery, and super-admin recovery flows.

## Passwords And Account Recovery

- Password hashing uses `bcryptjs`.
- Password validation requires at least eight characters, including uppercase, lowercase, and numeric characters.
- Password reset and account recovery flows are implemented through dedicated authentication endpoints.
- First-login setup and password change flows are protected behind authenticated endpoints.

## Multi-Factor Authentication

- TOTP-based MFA uses `speakeasy`.
- Email OTP flows support login and verification scenarios.
- Trusted devices are recorded so users can reduce repeated MFA prompts where allowed.
- MFA setup, enable, disable, and trusted-device management are exposed through authenticated auth endpoints.

## Authorization

- Role checks are enforced on the backend through middleware.
- The core roles are `admin`, `teacher`, and `student`.
- Super-admin access is checked through the admin profile, not only the user role.
- Admin permissions scope access to areas such as user management, admissions, academic setup, offerings, announcements, audit logs, and reports.
- Teaching assistant access is scoped to an approved TA assignment for a specific course offering and a specific TA permission.
- Frontend visibility is not the security boundary; backend authorization determines access.

## Login Protection

- The authentication workflow tracks failed login attempts and account lock state.
- Locked accounts are blocked by protected routes until the lock expires or the account is unlocked.
- Admin user management includes account unlocking support.

## Input Validation

- Shared validation middleware covers email format, password strength, pagination inputs, CUID parameters, registration fields, and selected profile fields.
- Selected string fields are sanitized for script and HTML tag patterns.
- Quiz and assessment workflows include additional domain validation.
- AI quiz generation uses structured output validation with Zod before accepting generated questions.

## File Uploads And Storage

- Upload workflows use memory-backed Multer handling before files are processed by application services.
- Supabase Storage buckets are used for assignment files, lecture resources, admission documents, and profile pictures.
- Profile picture uploads use an image MIME allow-list in storage configuration.
- Assignment similarity analysis validates supported file origins before fetching stored files for analysis.
- Assignment similarity file analysis has a maximum file size limit.
- Storage buckets are configured as public in the local Supabase configuration, so production deployments should review bucket privacy, object access policies, and signed URL usage before launch.

## Audit Logging

- The system includes an `AuditLog` model and admin audit log views.
- Important administrative, assessment, and review actions can be recorded for traceability.
- Assignment similarity review decisions are audited.

## Database Safeguards

- Prisma models include relational constraints, unique constraints, and explicit relations for users, enrollments, attendance, TA assignments, assessments, and schedules.
- Several workflows rely on controller-level ownership checks, such as teacher ownership of course offerings and student-specific access to student records.
- Database credentials must be supplied through environment variables and should not be committed.

## External Service Handling

- Email delivery depends on Resend environment variables.
- AI features depend on OpenAI environment variables.
- Storage depends on Supabase URL and service role credentials.
- The frontend demo intentionally avoids live service calls and stores demo state in browser localStorage.

## Deployment Considerations

Before using CampusOne in a real institution, review:

- CORS origin restrictions.
- JWT secret strength and rotation.
- Supabase service role key handling.
- Bucket-level access policies and signed URL requirements.
- Database backups, migrations, and point-in-time recovery.
- Application logging and monitoring.
- Privacy, retention, and institutional compliance requirements.
- Rate limits and abuse controls for authentication, uploads, and AI workflows.

No real production credentials should appear in repository documentation. Public demo credentials, where documented, are intentionally scoped to the frontend-only demo.
