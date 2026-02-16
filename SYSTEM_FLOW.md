# CampusOne: Department → Program → Course Flow

## Hierarchical Structure

### 1. **Department**
- Top-level organizational unit (e.g., "Computer Science", "Mathematics")
- Has a Head of Department (Teacher)
- Contains multiple Programs under it

### 2. **Program**
- Belongs to a Department
- Defines a degree type: Certificate, Diploma, Bachelor, Master, etc.
- Example: "Bachelor of Science in Computer Science"
- Properties:
  - Program Code (e.g., "BSCS")
  - Duration in Years
  - Total Semesters
  - Total Credits required

### 3. **Curriculum** (Embedded in Program)
- Organized by **semester** (1 to N)
- Each semester defines:
  - **Required Courses**: Compulsory courses students must take
  - **Elective Slots**: Optional courses (with domains/categories)
  - **Min/Max Credits**: Credit requirements for that semester
- Example: Semester 1 requires "Data Structures" + 1 elective from "Math"

### 4. **Course**
- Individual course units with:
  - Course Code (e.g., "CS101")
  - Credit Hours (1-6)
  - Type: core, elective, lab, project, internship, thesis
  - Prerequisites (other courses)
  - Department reference
- Can be offered multiple times across different programs/semesters

### 5. **CourseOffering**
- **Actual instance** of a Course being taught
- Links: Course → Program → Academic Year → Semester → Section
- Properties:
  - Teacher assigned to teach
  - TAs (Teaching Assistants)
  - Max Capacity & Current Enrollment
  - Schedule (day, time, room, type)
  - Course Materials

### 6. **SemesterIncharge**
- A Teacher assigned to **manage** a semester
- Manages: Specific Program → Semester → Batch → Academic Year
- Example: "Prof. Ahmed manages CS Batch 2023, Semester 5, Year 2025-2026"
- Handles semester-level responsibilities

## Data Flow Example

```
Department (CS) 
  └─ Program (BSCS)
     └─ Curriculum Semester 3
        ├─ Required: Data Structures, Database Design
        └─ Electives: AI, Robotics
           ↓
        CourseOffering (Data Structures for BSCS, Fall 2025)
           ├─ Teacher: Prof. Ahmed
           ├─ TAs: [TA1, TA2]
           └─ Schedule: Mon/Wed 10:00-11:30, Room 302
           
Semester Incharge: Prof. Ahmed manages BSCS Sem 3, Batch 2023, 2025-2026
```

## Key Relationships

| Entity | Parent | Purpose |
|--------|--------|---------|
| Program | Department | Defines degree structure |
| Curriculum | Program | Maps courses to semesters |
| Course | Department/Program | Individual course definition |
| CourseOffering | Course + Program | Actual class instance |
| SemesterIncharge | Program + Teacher | Semester management/oversight |

## Summary
- **Department** organizes the institution
- **Program** structures a degree inside a department
- **Curriculum** maps courses to semesters within a program
- **Course** is the base unit (reusable across programs)
- **CourseOffering** is when/how a course is actually taught
- **SemesterIncharge** manages that semester's operations
