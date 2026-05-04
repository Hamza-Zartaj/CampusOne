# CampusOne Code Audit Findings

**Date:** May 3, 2026  
**Scope:** Backend API, Prisma schema, Frontend components  
**Total Issues:** 30  

---

## Verification Review (May 4, 2026)

This section reflects a read-only check of the current codebase on **May 4, 2026**. No code was changed during this review.

**Review basis:**
- Static source review only
- Backend controllers, routes, middleware, services, Prisma schema, and affected frontend files were checked
- Race conditions and performance concerns were evaluated from code paths and constraints, not from load testing

### Resolved in Current Codebase

- [x] **#10 Missing Unique Constraint on TAAssignment**
- [x] **#11 N+1 Query in Reports Overview** *(the audited query shape is no longer present in `getOverview()`)*
- [x] **#15 Missing Offering Access Check in getMyAnnouncements**
- [x] **#16 Attendance Marker Type Vulnerability**
- [x] **#18 Student Can Transition Own Assignment Enrollment**
- [x] **#20 Missing CreatedBy Validation in Announcement Delete**
- [x] **#23 Missing Validator on Term Active Flag**
- [x] **#24 Sidebar Conditional Rendering Race**
- [x] **#25 Off-by-One in Report Grade Distribution** *(the current implementation groups stored `gradeLetter` values directly rather than bucketing by GPA thresholds)*

### Partially Resolved

- [ ] **#27 Missing Error Message Context**
	Some paths now return specific auth and validation errors, but several frontend/backend flows still collapse failures into generic messages.
- [ ] **#30 Missing Timestamp on Audit Changes**
	`AuditLog.createdAt` exists, but there is still no explicit higher-precision timestamp column definition.

### Still Unresolved

- [ ] **#1 TA Self-Grading Vulnerability**
- [ ] **#2 Race Condition in TA Approval (Max Active Cap Bypass)**
- [ ] **#3 Fine Idempotency Race Condition**
- [ ] **#4 Section Transfer Data Loss**
- [ ] **#5 Hard-Coded API Base URL**
- [ ] **#6 Announcement Orphan Risk (No FK Constraint)**
- [ ] **#7 Stale TA Assignments Count Toward Cap**
- [ ] **#8 Quota Band Mismatch**
- [ ] **#9 LeaveApplication Date Type (String, Not DateTime)**
- [ ] **#12 No Validation: TA Permission Combination**
- [ ] **#13 AuditLog Race Condition (Fire-and-Forget)**
- [ ] **#14 No Validation on Announcement Priority**
- [ ] **#17 QNA TA Access Without Enrollment**
- [ ] **#19 Grade Submission After Term Ends**
- [ ] **#21 TA Application Review Notes Overflow**
- [ ] **#22 Notification Delivery Timing**
- [ ] **#26 Console Logs in Production Code**
- [ ] **#28 Stale Cache in Sidebar TA Active List**
- [ ] **#29 No Pagination in TAOversight Table**

### Notes from This Review

- Items **#11** and **#25** no longer match the current implementation described in the original audit.
- Item **#17** remains open because the backend still allows TA access without enrollment, and the UI does not clearly label replies as TA-specific.
- The highest-risk unresolved items remain **#1, #2, #3, #4, #7, #8, #9, and #19**.

---

## 🔴 Critical (Fix Immediately)

### 1. TA Self-Grading Vulnerability
**File:** `campusone-backend/controllers/assignmentController.js`  
**Issue:** `gradeSubmission()` allows a TA to grade their own submissions. No validation prevents `markerId` (TA ID) from matching `studentId` in the submission.  
**Impact:** Academic integrity violation; a TA can modify their own grades.  
**Fix:** Add check: `if (submission.studentId === userId && isTAMarker) throw forbidden('Cannot grade own submission')`

---

### 2. Race Condition in TA Approval (Max Active Cap Bypass)
**File:** `campusone-backend/controllers/taController.js` → `approveApplication()`  
**Issue:** No re-validation of `maxActiveAssignments` cap (2) before approving. Between eligibility check and approval, another thread could approve a 3rd assignment.  
**Impact:** TA can exceed max 2 active assignments; violates business rule.  
**Fix:** Re-check count before approval; use DB-level unique constraint or transaction-level validation.

---

### 3. Fine Idempotency Race Condition
**File:** `campusone-backend/controllers/leaveController.js` → `generateFines()`  
**Schema:** `campusone-backend/prisma/schema.prisma` → `Fine` model  
**Issue:** `generateFines()` checks count, then creates. Two concurrent calls both pass the count check and create duplicate fines.  
**Impact:** Duplicate fine records; incorrect financial reporting and student balance.  
**Fix:** Add unique constraint in schema: `@@unique([studentId, enrollmentId, band])` or use database-level idempotency (INSERT ... ON CONFLICT).

---

### 4. Section Transfer Data Loss
**File:** `campusone-backend/controllers/enrollmentController.js` → `transferSection()`  
**Issue:** Only updates `Enrollment.offeringId`; does NOT migrate related `Attendance`, `LeaveApplication`, `Fine`, or `Submission` records. Data remains orphaned on the old offering.  
**Impact:** Student attendance, leaves, fines, and grades become inconsistent; queries break.  
**Fix:** Wrap in transaction; migrate all related records before updating Enrollment.

---

### 5. Hard-Coded API Base URL
**File:** `campusone-frontend/src/utils/api.js` → base instantiation  
**Issue:** API base URL may be hard-coded (e.g., `http://localhost:5000`) without fallback to `window.location.origin` or env-based config.  
**Impact:** Frontend breaks if API server moves; no environment-aware deployment.  
**Fix:** Use `process.env.REACT_APP_API_URL || window.location.origin/api` or fetch from config endpoint.

---

### 6. Announcement Orphan Risk (No FK Constraint)
**File:** `campusone-backend/prisma/schema.prisma` → `Announcement` model  
**Issue:** `offeringId` field has no FK relation to `CourseOffering`. Offering can be deleted leaving orphaned announcements.  
**Impact:** Orphaned announcements; queries joining on offering fail or return incomplete data.  
**Fix:** Add FK constraint: `offering CourseOffering @relation(...) @db.Uuid` with ON DELETE CASCADE or RESTRICT.

---

### 7. Stale TA Assignments Count Toward Cap
**File:** `campusone-backend/prisma/schema.prisma` → `TAAssignment` model  
**Issue:** `TAAssignment` has no `termId` field. APPROVED assignments from past terms are never cleared, and `countActiveAssignments` includes all APPROVED records regardless of term.  
**Impact:** Students can't apply for new TA roles once capped, even if all old assignments are from expired terms.  
**Fix:** Add `termId` field to schema. Filter count to `status='APPROVED' AND offering.term.isActive=true`.

---

### 8. Quota Band Mismatch
**File:** `campusone-backend/controllers/leaveController.js`  
**Issue:** Band classification uses `n = countedAbsent + 0.5*LATE`, but `generateFines()` checks raw `countedAbsent` (without LATE weighting). Off-by-one in boundary checks (band >= 4 not > 4).  
**Impact:** Students in band 4 (n=4) incorrectly charged; leaves that should be free are fined.  
**Fix:** Use consistent formula: `n >= 4 && n < 6 → fined`, `n >= 6 → dropoff`. Apply in both classification and fine generation.

---

### 9. LeaveApplication Date Type (String, Not DateTime)
**File:** `campusone-backend/prisma/schema.prisma` → `LeaveApplication` model  
**Issue:** `fromDate` and `toDate` are `String`, not `DateTime`. No validation prevents invalid dates (e.g., "2026-13-45").  
**Impact:** Corrupted leave records; date filtering/comparison fails; API accepts invalid input.  
**Fix:** Change to `DateTime`. Add frontend+backend validation (ISO8601 format, fromDate ≤ toDate, within term).

---

### 10. Missing Unique Constraint on TAAssignment
**File:** `campusone-backend/prisma/schema.prisma` → `TAAssignment` model  
**Issue:** No unique constraint on `[studentId, offeringId]`. Student can apply multiple times for same offering, creating duplicates.  
**Impact:** Unclear TA status; duplicate records clog approval queue.  
**Fix:** Add `@@unique([studentId, offeringId])` or handle at application layer with CONFLICT strategy.

---

## 🟡 Medium (Fix in Next Iteration)

### 11. N+1 Query in Reports Overview
**File:** `campusone-backend/controllers/reportsController.js` → `getOverview()`  
**Issue:** Fetches all enrollments with `include: { student: { include: { user: true } } }` per enrollment. For 10,000 enrollments, this is 10,001 DB queries.  
**Impact:** Slow report load (seconds); database connection pool exhaustion.  
**Fix:** Use single query with `groupBy` or SQL aggregation; avoid nested includes in loop.

---

### 12. No Validation: TA Permission Combination
**File:** `campusone-backend/controllers/taController.js` → `approveApplication()`  
**Issue:** No check that requested permissions are logically valid. E.g., `GRADE_ASSIGNMENTS` without `VIEW_ROSTER` is nonsensical.  
**Impact:** Inconsistent TA permissions; grading UI fails if roster not visible.  
**Fix:** Define valid permission sets (bitmask or whitelist); validate at approval.

---

### 13. AuditLog Race Condition (Fire-and-Forget)
**File:** `campusone-backend/controllers/` (all)  
**Issue:** Calls to `AuditLogger.log()` are fire-and-forget (no await). Logs may not persist if server shuts down.  
**Impact:** Missing audit trail; compliance violation; security investigation impossible.  
**Fix:** Await audit log or queue to reliable backend (Redis, message queue).

---

### 14. No Validation on Announcement Priority
**File:** `campusone-frontend/src/pages/teacher/TeacherAnnouncement.jsx`  
**Issue:** Priority select hardcodes 'low', 'medium', 'high' but no enum validation on backend. Invalid priority strings pass through.  
**Impact:** Type inconsistency; reports/filtering fail on invalid priority.  
**Fix:** Add enum validation in backend; reject unknown priorities.

---

### 15. Missing Offering Access Check in getMyAnnouncements
**File:** `campusone-backend/controllers/announcementController.js`  
**Issue:** `getMyAnnouncements()` returns all announcements for user's offerings without verifying user teaches/is enrolled in offering.  
**Impact:** Teacher can read announcements from offerings they don't teach.  
**Fix:** Filter to `offering.teacher.id === userId` for teachers; `enrollment.studentId === userId` for students.

---

### 16. Attendance Marker Type Vulnerability
**File:** `campusone-backend/controllers/attendanceController.js` → `markAttendance()`  
**Issue:** Determines `markerId` as `teacher.id` or `student.id` (TA). No validation that the TA has `MARK_ATTENDANCE` permission in this offering.  
**Impact:** Any TA can mark attendance even without permission; permission system bypassed.  
**Fix:** Check `taAssignment.permissions.includes('MARK_ATTENDANCE')` before allowing TA marker.

---

### 17. QNA TA Access Without Enrollment
**File:** `campusone-backend/controllers/qnaController.js`  
**Issue:** TA with `ANSWER_QNA` permission can reply to questions without being enrolled. Replies appear to be from a course insider.  
**Impact:** Confusing user experience; TA credentials unclear; misinformation risk.  
**Fix:** Enforce enrollment OR show clear TA badge on replies. Document that TA replies are not student-peer answers.

---

### 18. Student Can Transition Own Assignment Enrollment
**File:** `campusone-backend/controllers/enrollmentController.js`  
**Issue:** `transferSection()` does not check if requester is admin/advisor. Student can call and move their own enrollment.  
**Impact:** Students bypass waitlist/capacity; enroll in sections they shouldn't.  
**Fix:** Add `authorize('admin')` or require admin token; students should request via advisor interface.

---

### 19. Grade Submission After Term Ends
**File:** `campusone-backend/controllers/assignmentController.js`  
**Issue:** No check that submission/grading happens during active term. Grades can be entered after term closes.  
**Impact:** Late grade entry; TA assigns grades outside designated period; grade integrity.  
**Fix:** Check `offering.term.isActive === true` before allowing grade submission.

---

### 20. Missing CreatedBy Validation in Announcement Delete
**File:** `campusone-backend/controllers/announcementController.js` → `deleteAnnouncement()`  
**Issue:** No verification that requester is the announcement creator (via `createdBy`). Only checks authorization level.  
**Impact:** Admin can delete any announcement; teacher can delete colleague's announcements.  
**Fix:** Add check: `if (announcement.createdBy !== userId && !isSuperAdmin) throw forbidden()`.

---

### 21. TA Application Review Notes Overflow
**File:** `campusone-backend/prisma/schema.prisma` → `TAAssignment.reviewNotes`  
**Issue:** `reviewNotes` is likely a `String` with no max length. Admin can paste unlimited text.  
**Impact:** Database bloat; JSON response timeouts.  
**Fix:** Set `@db.VarChar(500)` or similar; validate length on backend.

---

### 22. Notification Delivery Timing
**File:** `campusone-backend/services/notificationService.js` (referenced in summary)  
**Issue:** Notifications are fire-and-forget. If notification service fails, user never knows status changed.  
**Impact:** Stale client state; TA doesn't realize approval was denied.  
**Fix:** Implement notification queue with retry; emit WebSocket event on critical status changes.

---

### 23. Missing Validator on Term Active Flag
**File:** `campusone-backend/controllers/termController.js`  
**Issue:** No check that only one term is active at a time. Admin can activate multiple terms.  
**Impact:** Student applies/enrolls in ambiguous term; schedule conflicts.  
**Fix:** Add middleware: before setting `isActive=true`, set all others to `false`.

---

### 24. Sidebar Conditional Rendering Race
**File:** `campusone-frontend/src/components/Sidebar.jsx`  
**Issue:** `useEffect(() => taAPI.getMyActive())` runs on mount but doesn't handle promise rejection. If API fails, `taActive` is never set, sidebar link appears/disappears.  
**Impact:** UX flicker; "My TA Assignments" link missing on network error.  
**Fix:** Set error state or fallback; show "TA Program" even if active list fails.

---

### 25. Off-by-One in Report Grade Distribution
**File:** `campusone-backend/controllers/reportsController.js` → `getGradeDistribution()`  
**Issue:** Grade boundaries likely use `if (gpa >= 3.8)` without proper edge case (exactly 3.8).  
**Impact:** Grade buckets misaligned; A vs A- boundary unclear.  
**Fix:** Use explicit ranges: `[3.9+, 3.7-3.89, 3.5-3.69]` with documented rounding rules.

---

## 🟢 Minor (Nice to Have)

### 26. Console Logs in Production Code
**File:** Various (likely `reportController.js`, `taController.js`)  
**Issue:** `console.log()` or `console.error()` statements in production endpoints.  
**Impact:** Noise in server logs; information leakage (stack traces visible to ops).  
**Fix:** Remove; use structured logging (Winston, Pino) with appropriate log levels.

---

### 27. Missing Error Message Context
**File:** `campusone-backend/controllers/attendanceController.js`, others  
**Issue:** Generic error messages ("Failed to load data") don't differentiate cause (network, validation, auth).  
**Impact:** User/developer can't troubleshoot; unclear if retry will help.  
**Fix:** Add error codes/types (e.g., "ERR_OFFERING_NOT_FOUND", "ERR_PERMISSION_DENIED").

---

### 28. Stale Cache in Sidebar TA Active List
**File:** `campusone-frontend/src/components/Sidebar.jsx`  
**Issue:** TA active list is fetched once on mount; never refetched. If TA approval happens in another tab, sidebar is stale.  
**Impact:** User sees outdated "TA Duties" group in sidebar after approval.  
**Fix:** Refetch on window focus or add global state subscription (Context/Redux).

---

### 29. No Pagination in TAOversight Table
**File:** `campusone-frontend/src/pages/admin/TAOversight.jsx`  
**Issue:** Renders all TA assignments in table without limit. 1000 rows freeze browser.  
**Impact:** Admin UI unresponsive on large institutions.  
**Fix:** Add pagination (limit=50, offset) or infinite scroll; backend filter + limit.

---

### 30. Missing Timestamp on Audit Changes
**File:** `campusone-backend/models/AuditLog.js`  
**Issue:** AuditLog may not include high-precision timestamps (milliseconds). Concurrent operations appear simultaneous.  
**Impact:** Unclear audit sequence in concurrent scenarios.  
**Fix:** Use `DateTime @db.Timestamp(3)` in schema; log at microsecond precision.

---

## Summary by Category

| Category | Critical | Medium | Minor | Total |
|----------|----------|--------|-------|-------|
| Security | 3 | 3 | 0 | 6 |
| Logic Bugs | 2 | 3 | 2 | 7 |
| Race Conditions | 2 | 2 | 0 | 4 |
| Data Integrity | 3 | 2 | 0 | 5 |
| Missing Validation | 2 | 2 | 0 | 4 |
| UX | 0 | 2 | 1 | 3 |
| Performance | 1 | 0 | 0 | 1 |

---

## Recommended Fix Order

**Phase 1 (This Sprint):**
1. ✅ #1 (TA self-grading) — 30 min
2. ✅ #3 (Fine idempotency) — 30 min
3. ✅ #4 (Section transfer data loss) — 1 hour
4. ✅ #2 (TA approval race) — 1 hour
5. ✅ #16 (Attendance marker permission) — 30 min

**Phase 2 (Next Sprint):**
6. #6 (Announcement FK) — 30 min
7. #7 (Stale TA cap) — 1 hour
8. #8 (Quota band mismatch) — 1 hour
9. #9 (LeaveApplication dates) — 1 hour
10. #5 (Hard-coded API URL) — 30 min

**Phase 3 (Backlog):**
11–30 (Medium & Minor items) — 3–4 weeks

---

## Testing Checklist

- [ ] Unit tests for #1, #2, #3, #16 (permission, race, idempotency)
- [ ] Integration test for #4 (section transfer with related records)
- [ ] E2E test for TA application flow (eligibility → approval → activation)
- [ ] Load test for #11 (reports with 10k+ enrollments)
- [ ] Security test: TA self-grading, cross-offering access

---

**Generated:** 2026-05-03  
**Next Review:** After Phase 1 fixes
