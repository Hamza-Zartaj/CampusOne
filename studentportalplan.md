# Student Portal Redesign — Course-Centric View

**Date:** 2026-05-03  
**Goal:** Make the student portal *course-centric* and *current-semester-only*. One screen per course shows everything: lectures, assignments, quizzes, mid/final marks, participation, project. All read-only — students can't edit anything.

---

## How It Works Currently

The student portal today is **feature-scoped** (each top-level item = one type of record), not course-scoped:

| Page | Route | What It Shows |
|---|---|---|
| Dashboard | `/student/dashboard` | Aggregated cards (CGPA, pending assignments, upcoming quizzes, attendance summary, recent grades) |
| My Courses | `/student/courses` | Grid of cards, one per current-term enrollment. Shows code, teacher, schedule chips. **Doesn't drill into the course.** |
| Registration | `/student/registration` | Course registration for next term |
| Timetable | `/student/timetable` | Weekly grid view |
| My Grades | `/student/grades` | Grade table — **all completed enrollments across the entire degree** |
| Transcript | `/student/transcript` | Full GPA/CGPA history per term |
| Attendance | `/student/attendance` | **Global** view — table across all courses |
| Assignments | `/student/assignments` | **Global** list across all courses, with submit button |
| Quizzes | `/student/quizzes` | **Global** list, with attempt button |
| Q&A Forum | `/student/qna` | Cross-course thread list |
| Leave Status | `/student/leave-status` | Leave applications |
| Notifications | `/student/notification` | Bell history |
| TA Program | `/student/ta` | TA application + duties |

**Key issues vs your target:**

1. **Records are global, not per-course.** A student looking at "Programming Fundamentals" can't see *that course's* lectures, assignments, quizzes, marks in one place — they have to jump between 4–5 separate pages.
2. **Some records show whole degree history**, not just current semester (e.g. My Grades, Transcript). Even StudentDashboard pulls *all completed enrollments* to compute CGPA.
3. **No "Lectures" concept exists at all.** There's no model for a lecture entry with title + uploaded material. The closest thing is `Attendance` rows (one per date) — but those have no title or file.
4. **No "Class Participation" or "Presentation/Project" mark fields.** The `Enrollment` model has `assignmentMarks`, `midMarks`, `finalMarks`, `totalMarks` only.
5. **Students can submit assignments today** (upload files, attempt quizzes). Your target says "we cannot edit anything here" — so the per-course view is purely read-only; submission happens elsewhere (or stays read-only display only).

---

## What You Want

A single course-centric view (probably extends existing `My Courses` page):

```
[ Course ▼: CS 301 — Programming Fundamentals (Sec A) ]   ← dropdown selector

═══ LECTURES ═══════════════════════════════════════════
| Code  | Name            | Sec | Date       | Title              | Material      |
|-------|-----------------|-----|------------|--------------------|---------------|
| CS301 | Prog. Fundamen. | A   | 2026-04-15 | Variables & Types  | [📎 slides01] |
| CS301 | Prog. Fundamen. | A   | 2026-04-17 | Loops              | [📎 notes02]  |

═══ ASSIGNMENTS ════════════════════════════════════════
| Code  | Name | Sec | Date       | Title           | Total | Obtained | File         |
| CS301 | …    | A   | 2026-04-10 | Recursion HW    | 100   | 92       | [📎 brief]   |

═══ QUIZZES ════════════════════════════════════════════
| Code  | Name | Sec | Date       | Title           | Total | Obtained |
| CS301 | …    | A   | 2026-04-12 | Loops Quiz      | 20    | 18       |

═══ MID TERM ═══════════════════════════════════════════
| Code  | Name | Sec | Date       | Total | Obtained |
| CS301 | …    | A   | 2026-04-20 | 30    | 27       |

═══ FINAL TERM ═════════════════════════════════════════
(same shape)

═══ CLASS PARTICIPATION ════════════════════════════════
| Code  | Name | Sec | Total | Obtained |
| CS301 | …    | A   | 5     | 4.5      |

═══ PRESENTATION / PROJECT ═════════════════════════════
| Code  | Name | Sec | Date       | Title             | Total | Obtained | File       |
```

**Rules:**
- All teacher-generated. Student is read-only.
- **Current semester only** — no historical data on this screen. (Past terms still visible via Transcript page.)
- First course is auto-selected. Dropdown switches between currently-enrolled courses.

---

## Gap Analysis

| Need | Status | Action |
|---|---|---|
| Course dropdown that drives a single-course detail view | Missing | New page/component |
| Lecture records (date, title, file) per offering | **Missing model** | Add `Lecture` model + teacher CRUD + student GET |
| Assignments table for one offering with student's submission marks | API exists (`assignmentAPI.getMy()` filters by student); needs per-offering scope | Add `?offeringId=` filter to existing endpoint, or expose `getByOffering` |
| Quizzes table with student's attempt score | API exists | Same — scope to one offering |
| Mid term / Final term / Participation / Presentation marks | **Partially missing**: enrollment has midMarks/finalMarks/assignmentMarks; no participation, no presentation | Add `participationMarks`, `presentationMarks`, `projectMarks`, `projectTitle`, `projectFileUrl` to `Enrollment` (or split into a separate `MarkComponent` table — see "Open Questions") |
| All records limited to current semester | Page filters by active term | Use `enrollmentAPI.getCurrent` (already term-scoped) |
| Read-only for student | Current pages allow submit/attempt | New view is display-only; submit/attempt remain on existing pages OR are removed entirely (your call) |

---

## Proposed Changes

### 1. New Schema

```prisma
// New: Lecture record. One per class meeting that has uploaded material.
model Lecture {
  id            String   @id @default(cuid())
  offeringId    String
  date          DateTime @db.Date
  title         String
  description   String?
  materialUrl   String?           // uploaded file (PDF, slides, etc.)
  materialName  String?           // original filename
  createdBy     String            // teacher userId
  offering      CourseOffering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([offeringId, date])
}

// Extend Enrollment with the missing mark components.
model Enrollment {
  // … existing fields …
  participationMarks  Float?
  presentationMarks   Float?
  projectMarks        Float?
  projectTitle        String?
  projectFileUrl      String?
  midDate             DateTime? @db.Date     // when the mid was held
  finalDate           DateTime? @db.Date

  // Teacher can also set per-component totals if they differ from defaults
  midTotalMarks            Float?  @default(30)
  finalTotalMarks          Float?  @default(40)
  participationTotalMarks  Float?  @default(5)
  presentationTotalMarks   Float?  @default(10)
  projectTotalMarks        Float?  @default(15)
}

// CourseOffering — add a relation
model CourseOffering {
  // …
  lectures Lecture[]
}
```

**Migration risk:** Adding nullable columns is safe. No data migration needed for existing rows.

### 2. Backend

New routes:

```
GET    /api/lectures?offeringId=X        # list lectures for one offering
POST   /api/lectures                     # teacher create  (multipart)
PUT    /api/lectures/:id                 # teacher update
DELETE /api/lectures/:id                 # teacher delete
GET    /api/lectures/:id/material        # download attached file

# Bundle endpoint (the page's main fetch — one round-trip):
GET    /api/students/me/course-detail/:offeringId
       → {
           offering: { course, section, teacher, term, … },
           lectures: [...],
           assignments: [{ ..., mySubmission: { obtainedMarks, attachmentUrl } }],
           quizzes:    [{ ..., myAttempt:    { totalScore } }],
           enrollment: { midMarks, finalMarks, participationMarks, presentationMarks, projectMarks, … },
         }
```

Authorization: only the enrolled student (or teacher of offering / admin) may call the bundle endpoint.

Existing endpoints stay (used by teacher-side and other student pages).

Mark components are edited via existing `MarksUpload` page on teacher side — extend its UI to cover the new fields (participation, presentation, project + file upload).

### 3. Frontend

**Restructure `My Courses`** ([MyCourses.jsx](campusone-frontend/src/pages/student/academic/MyCourses.jsx)):

- New layout: top row = course selector (dropdown of currently-enrolled offerings, default = first).
- Below: 7 stacked tables fed by the bundle endpoint.
- Each table shows the course code/name/section in its first columns (per your spec — slightly redundant since header already names the course, but matches your sketch).
- Material/file cells render as download links (use the existing `/uploads/` static endpoint).
- Skeleton loading per table while bundle is in-flight.

**Sidebar reorganization (suggestion):**

The current global pages duplicate what the new view shows. Options:

- **Option A (recommended):** Keep global pages but rename "My Courses" to clarify it's the deep-dive. Sidebar layout:
  ```
  Academic
    Dashboard
    My Courses           ← new course-centric view
    Registration
    Timetable
    Transcript           (history across degree — kept)
  ─── separator ───
  Other
    Q&A Forum
    Leave Status
    Notifications
  ```
  Then **remove** standalone `Attendance`, `Assignments`, `Quizzes`, `My Grades` from sidebar — they're now reachable inside My Courses. The pages can stay as deep links (e.g. quiz attempt page is still needed since the new view is read-only).

- **Option B:** Keep all sidebar items as today; just add the rich data inside My Courses. Less disruption, more redundancy.

**Where students still need to act (not read-only):**
- Quiz attempt — `/student/quizzes/attempt/:id` route stays
- Assignment submission — keep submit button, but possibly only inside the My Courses table (an "Upload" pencil on rows where `mySubmission` is null)
- Q&A — separate page
- Leave application — separate page

If you truly want students to do *zero* edits inside My Courses, the page only renders existing submissions/attempts and points them elsewhere to actually submit. **You said "cannot edit anything here" — confirm if that means truly read-only display, or read-only-but-with-submit-buttons.**

---

## Implementation Order

1. **Schema**: add `Lecture` model + new `Enrollment` columns. `prisma db push`.
2. **Backend**:
   - `lectureController.js` + routes (CRUD + download).
   - `students/me/course-detail/:offeringId` bundle endpoint in `studentController.js` (or add to existing student-scoped controller).
   - Extend `enrollmentController.updateGrade` to accept the new mark fields.
3. **Frontend**:
   - Rewrite `MyCourses.jsx` to course-centric layout with bundle fetch.
   - Add **Lectures** tab to teacher's existing course view (`MyOfferings → offering detail → Lectures CRUD with file upload`).
   - Extend `MarksUpload.jsx` columns: add Participation, Presentation, Project (+ file upload) to the per-student grade row.
   - Sidebar pruning per Option A (after confirming).
4. **Seeding**: extend seed.js to create ~5 lectures per active-term offering with placeholder material URLs and to write participation/presentation marks for completed enrollments.

---

## Open Questions

1. **Truly read-only?** If students can no longer submit/attempt from inside My Courses, do those buttons disappear entirely or only from this view? Answer: so i want here they see there course summaries and also attentdence should be shown here as well adn they can submit assingmetns which are active in assignment tab and take quiz in quiz tab and these tabs should not show old stuff which already graded
2. **Mark components — fields vs separate table?** I proposed adding columns to `Enrollment` (simple, fast). Alternative: one `MarkComponent { enrollmentId, type, title, total, obtained, fileUrl }` table — flexible (teachers can add multiple presentations/projects), but more queries. Confirm preference. Recommendation: **fields** unless you expect multiple of same type. Answer: do the alternative one as there can be 4 assignments and 4 quizes so its like when a course is created no of assignmetns and quizes and class participation like weitaghe and total number is configured during that teacher just create entery and select date to fill the number so it its not implemeneted in courses either than implement it
3. **Lecture material storage** — same `/uploads/` static folder as assignments? Or a dedicated `/uploads/lectures/`? (Just a path detail.)Answer: should go to supabase bucket 
4. **Project/Presentation file**: is it the *teacher's* brief, the *student's* submitted artifact, or both? If both, we need a `LectureSubmission`-like model — but you said students can't edit anything here. Answer: no file for that just it entry that this day there will be presentation of project and its to be notified and than that day teacher just upload marks and we see them
5. **Mid/Final dates**: do you want to display the date the exam was held? If so, `midDate`/`finalDate` are needed. Answer: so bassically after exams when teacher upload marks of mid or final that date is shown or they create the entry with date idont remember though forget date for now as we have mids in a month we will update after that just put entry of mid or final title and next total marks and marks obtain
6. **Past semesters** — should the dropdown include past-term enrollments too (greyed out or read-only)? You said "current semester only" so I'll **exclude** them by default; Transcript stays for history. Answer: No just current semester for past data only show in transcript not anywhere else
also here how mostly each course weightage is 

 Exam Type	Percentage(%)	Consideration
Quiz	10	Take Average of All
Assignments	5	Take Average of All
Project-Presentation	10	Take Average of All
Mid Term	30	Take Average of All
Final Term	40	Take Average of All
Class Participation	5	Take Average of All
total number of asinments are 4 , 4 quizes 1 project peresentation. 1 or some time 2 class participations but total weight remain 5 as avg
and for lab 20 marks for lab work, 20 marks for quizes, 50 marks for final, 10 marks for mid. 2 or 4 for lab works and same 2 or 4 quizes
adn for final year project its 100 marks for project submission and final defense
and also there is no attendence for final year project


Once you confirm these, I'll start with the schema migration and walk up the stack.
