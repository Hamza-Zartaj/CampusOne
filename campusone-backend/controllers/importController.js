import Course from '../models/Course.js';
import CourseOffering from '../models/CourseOffering.js';
import Program from '../models/Program.js';
import Department from '../models/Department.js';
import Teacher from '../models/Teacher.js';
import AuditLogger from '../services/auditLogger.js';

/**
 * Parse CSV string to array of objects
 */
const parseCSV = (csvString, delimiter = ',') => {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted values with commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    // Create object
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    row._rowNumber = i + 1;
    rows.push(row);
  }

  return { headers, rows };
};

/**
 * @desc    Import courses from CSV
 * @route   POST /api/import/courses
 * @access  Private (Admin)
 * 
 * Expected CSV columns:
 * courseCode, courseName, description, departmentCode, programCode, creditHours,
 * lectureHours, labHours, tutorialHours, courseType, domain, prerequisites, corequisites
 */
export const importCourses = async (req, res) => {
  try {
    const { csvData, updateExisting = false } = req.body;

    if (!csvData) {
      return res.status(400).json({
        success: false,
        message: 'Please provide CSV data'
      });
    }

    const { headers, rows } = parseCSV(csvData);

    // Validate required columns
    const requiredColumns = ['courseCode', 'courseName', 'departmentCode', 'creditHours'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}`
      });
    }

    // Pre-fetch departments and programs for lookup
    const departments = await Department.find({}).lean();
    const programs = await Program.find({}).lean();
    const existingCourses = await Course.find({}).lean();

    const deptMap = new Map(departments.map(d => [d.departmentCode, d._id]));
    const programMap = new Map(programs.map(p => [p.programCode, p._id]));
    const courseMap = new Map(existingCourses.map(c => [c.courseCode, c]));

    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    for (const row of rows) {
      try {
        const courseCode = row.courseCode?.toUpperCase().trim();
        if (!courseCode) {
          results.failed.push({ row: row._rowNumber, reason: 'Missing course code' });
          continue;
        }

        // Check if exists
        const existing = courseMap.get(courseCode);
        if (existing && !updateExisting) {
          results.skipped.push({ row: row._rowNumber, courseCode, reason: 'Already exists' });
          continue;
        }

        // Lookup department
        const departmentId = deptMap.get(row.departmentCode?.trim());
        if (!departmentId) {
          results.failed.push({ row: row._rowNumber, courseCode, reason: `Department not found: ${row.departmentCode}` });
          continue;
        }

        // Lookup program (optional)
        let programId = null;
        if (row.programCode?.trim()) {
          programId = programMap.get(row.programCode.trim());
          if (!programId) {
            results.failed.push({ row: row._rowNumber, courseCode, reason: `Program not found: ${row.programCode}` });
            continue;
          }
        }

        // Parse prerequisites (comma-separated course codes)
        const prerequisites = [];
        if (row.prerequisites?.trim()) {
          const prereqCodes = row.prerequisites.split(';').map(c => c.trim().toUpperCase());
          for (const code of prereqCodes) {
            const prereq = courseMap.get(code);
            if (prereq) {
              prerequisites.push(prereq._id);
            }
          }
        }

        // Parse corequisites
        const corequisites = [];
        if (row.corequisites?.trim()) {
          const coreqCodes = row.corequisites.split(';').map(c => c.trim().toUpperCase());
          for (const code of coreqCodes) {
            const coreq = courseMap.get(code);
            if (coreq) {
              corequisites.push(coreq._id);
            }
          }
        }

        const courseData = {
          courseCode,
          courseName: row.courseName?.trim(),
          description: row.description?.trim(),
          department: departmentId,
          program: programId,
          creditHours: parseInt(row.creditHours) || 3,
          lectureHours: parseInt(row.lectureHours) || 0,
          labHours: parseInt(row.labHours) || 0,
          tutorialHours: parseInt(row.tutorialHours) || 0,
          courseType: row.courseType?.trim() || 'core',
          domain: row.domain?.trim(),
          prerequisites,
          corequisites,
          isActive: true
        };

        if (existing && updateExisting) {
          await Course.findByIdAndUpdate(existing._id, courseData);
          results.successful.push({ row: row._rowNumber, courseCode, action: 'updated' });
        } else {
          const newCourse = await Course.create(courseData);
          courseMap.set(courseCode, newCourse); // Add to map for prereq lookups
          results.successful.push({ row: row._rowNumber, courseCode, action: 'created', id: newCourse._id });
        }
      } catch (error) {
        results.failed.push({ row: row._rowNumber, courseCode: row.courseCode, reason: error.message });
      }
    }

    // Log import
    await AuditLogger.logImport({
      importType: 'courses',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      targetModel: 'Course',
      totalRows: rows.length,
      successful: results.successful.length,
      failed: results.failed.length,
      errors: results.failed,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Course import completed',
      summary: {
        total: rows.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error importing courses',
      error: error.message
    });
  }
};

/**
 * @desc    Import curriculum from CSV
 * @route   POST /api/import/curriculum
 * @access  Private (Admin)
 * 
 * Expected CSV columns:
 * programCode, semesterNumber, courseCode, isRequired, electiveGroup
 */
export const importCurriculum = async (req, res) => {
  try {
    const { csvData, replaceExisting = false } = req.body;

    if (!csvData) {
      return res.status(400).json({
        success: false,
        message: 'Please provide CSV data'
      });
    }

    const { headers, rows } = parseCSV(csvData);

    // Validate required columns
    const requiredColumns = ['programCode', 'semesterNumber', 'courseCode'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}`
      });
    }

    // Pre-fetch data
    const programs = await Program.find({});
    const courses = await Course.find({}).lean();

    const programMap = new Map(programs.map(p => [p.programCode, p]));
    const courseMap = new Map(courses.map(c => [c.courseCode, c]));

    // Group by program
    const programUpdates = new Map();

    const results = {
      successful: [],
      failed: []
    };

    for (const row of rows) {
      try {
        const programCode = row.programCode?.trim();
        const semesterNumber = parseInt(row.semesterNumber);
        const courseCode = row.courseCode?.toUpperCase().trim();

        if (!programCode || !semesterNumber || !courseCode) {
          results.failed.push({ row: row._rowNumber, reason: 'Missing required field' });
          continue;
        }

        const program = programMap.get(programCode);
        if (!program) {
          results.failed.push({ row: row._rowNumber, reason: `Program not found: ${programCode}` });
          continue;
        }

        const course = courseMap.get(courseCode);
        if (!course) {
          results.failed.push({ row: row._rowNumber, reason: `Course not found: ${courseCode}` });
          continue;
        }

        // Initialize program update tracking
        if (!programUpdates.has(programCode)) {
          programUpdates.set(programCode, {
            program,
            semesters: new Map()
          });
        }

        const programUpdate = programUpdates.get(programCode);
        if (!programUpdate.semesters.has(semesterNumber)) {
          programUpdate.semesters.set(semesterNumber, {
            requiredCourses: [],
            electiveSlots: []
          });
        }

        const semester = programUpdate.semesters.get(semesterNumber);
        const isRequired = row.isRequired?.toLowerCase() !== 'false' && row.isRequired !== '0';
        const electiveGroup = row.electiveGroup?.trim();

        if (isRequired) {
          semester.requiredCourses.push(course._id);
        } else if (electiveGroup) {
          // Find or create elective slot
          let slot = semester.electiveSlots.find(s => s.name === electiveGroup);
          if (!slot) {
            slot = {
              name: electiveGroup,
              description: `${electiveGroup} Electives`,
              minCredits: parseInt(row.minCredits) || 3,
              maxCredits: parseInt(row.maxCredits) || 6,
              allowedCourses: []
            };
            semester.electiveSlots.push(slot);
          }
          slot.allowedCourses.push(course._id);
        }

        results.successful.push({ row: row._rowNumber, programCode, semesterNumber, courseCode });
      } catch (error) {
        results.failed.push({ row: row._rowNumber, reason: error.message });
      }
    }

    // Apply updates to programs
    for (const [programCode, update] of programUpdates) {
      const program = update.program;
      
      if (replaceExisting) {
        program.curriculum = [];
      }

      for (const [semesterNumber, semData] of update.semesters) {
        // Find existing semester in curriculum
        let semesterIndex = program.curriculum.findIndex(s => s.semesterNumber === semesterNumber);
        
        if (semesterIndex === -1) {
          program.curriculum.push({
            semesterNumber,
            requiredCourses: semData.requiredCourses,
            electiveSlots: semData.electiveSlots
          });
        } else if (replaceExisting) {
          program.curriculum[semesterIndex] = {
            semesterNumber,
            requiredCourses: semData.requiredCourses,
            electiveSlots: semData.electiveSlots
          };
        } else {
          // Merge
          const existing = program.curriculum[semesterIndex];
          const existingReqIds = existing.requiredCourses.map(c => c.toString());
          for (const courseId of semData.requiredCourses) {
            if (!existingReqIds.includes(courseId.toString())) {
              existing.requiredCourses.push(courseId);
            }
          }
          // Merge elective slots
          for (const newSlot of semData.electiveSlots) {
            const existingSlot = existing.electiveSlots.find(s => s.name === newSlot.name);
            if (existingSlot) {
              const existingAllowed = existingSlot.allowedCourses.map(c => c.toString());
              for (const courseId of newSlot.allowedCourses) {
                if (!existingAllowed.includes(courseId.toString())) {
                  existingSlot.allowedCourses.push(courseId);
                }
              }
            } else {
              existing.electiveSlots.push(newSlot);
            }
          }
        }
      }

      // Sort curriculum by semester number
      program.curriculum.sort((a, b) => a.semesterNumber - b.semesterNumber);
      await program.save();
    }

    // Log import
    await AuditLogger.logImport({
      importType: 'curriculum',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      targetModel: 'Program',
      totalRows: rows.length,
      successful: results.successful.length,
      failed: results.failed.length,
      errors: results.failed,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Curriculum import completed',
      summary: {
        total: rows.length,
        successful: results.successful.length,
        failed: results.failed.length,
        programsUpdated: programUpdates.size
      },
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error importing curriculum',
      error: error.message
    });
  }
};

/**
 * @desc    Import course offerings from CSV
 * @route   POST /api/import/offerings
 * @access  Private (Admin)
 * 
 * Expected CSV columns:
 * courseCode, programCode, academicYear, semesterNumber, semesterName, section,
 * teacherEmployeeId, maxCapacity, schedule (JSON or formatted string)
 */
export const importOfferings = async (req, res) => {
  try {
    const { csvData, updateExisting = false } = req.body;

    if (!csvData) {
      return res.status(400).json({
        success: false,
        message: 'Please provide CSV data'
      });
    }

    const { headers, rows } = parseCSV(csvData);

    // Validate required columns
    const requiredColumns = ['courseCode', 'programCode', 'academicYear', 'semesterNumber', 'teacherEmployeeId'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}`
      });
    }

    // Pre-fetch data
    const courses = await Course.find({}).lean();
    const programs = await Program.find({}).lean();
    const teachers = await Teacher.find({}).lean();

    const courseMap = new Map(courses.map(c => [c.courseCode, c]));
    const programMap = new Map(programs.map(p => [p.programCode, p]));
    const teacherMap = new Map(teachers.map(t => [t.employeeId, t]));

    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    for (const row of rows) {
      try {
        const courseCode = row.courseCode?.toUpperCase().trim();
        const programCode = row.programCode?.trim();
        const academicYear = row.academicYear?.trim();
        const semesterNumber = parseInt(row.semesterNumber);
        const section = row.section?.toUpperCase().trim() || 'A';
        const teacherEmployeeId = row.teacherEmployeeId?.trim();

        if (!courseCode || !programCode || !academicYear || !semesterNumber || !teacherEmployeeId) {
          results.failed.push({ row: row._rowNumber, reason: 'Missing required field' });
          continue;
        }

        const course = courseMap.get(courseCode);
        if (!course) {
          results.failed.push({ row: row._rowNumber, reason: `Course not found: ${courseCode}` });
          continue;
        }

        const program = programMap.get(programCode);
        if (!program) {
          results.failed.push({ row: row._rowNumber, reason: `Program not found: ${programCode}` });
          continue;
        }

        const teacher = teacherMap.get(teacherEmployeeId);
        if (!teacher) {
          results.failed.push({ row: row._rowNumber, reason: `Teacher not found: ${teacherEmployeeId}` });
          continue;
        }

        // Check for existing offering
        const existingOffering = await CourseOffering.findOne({
          course: course._id,
          program: program._id,
          academicYear,
          semesterNumber,
          section
        });

        if (existingOffering && !updateExisting) {
          results.skipped.push({
            row: row._rowNumber,
            courseCode,
            section,
            reason: 'Offering already exists'
          });
          continue;
        }

        // Parse schedule if provided
        let schedule = [];
        if (row.schedule?.trim()) {
          try {
            // Try JSON parse first
            schedule = JSON.parse(row.schedule);
          } catch {
            // Try custom format: "Mon 09:00-10:30 Room101;Wed 09:00-10:30 Room101"
            const slots = row.schedule.split(';');
            for (const slot of slots) {
              const match = slot.trim().match(/^(\w+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})\s*(.*)$/);
              if (match) {
                const dayMap = {
                  'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
                  'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
                };
                schedule.push({
                  day: dayMap[match[1]] || match[1],
                  startTime: match[2],
                  endTime: match[3],
                  room: match[4]?.trim() || '',
                  type: 'lecture'
                });
              }
            }
          }
        }

        const offeringData = {
          course: course._id,
          program: program._id,
          academicYear,
          semesterNumber,
          semesterName: row.semesterName?.trim(),
          section,
          teacher: teacher._id,
          maxCapacity: parseInt(row.maxCapacity) || 60,
          schedule,
          enrollmentStatus: row.enrollmentStatus?.trim() || 'open',
          status: row.status?.trim() || 'scheduled',
          isActive: true
        };

        if (existingOffering && updateExisting) {
          await CourseOffering.findByIdAndUpdate(existingOffering._id, offeringData);
          results.successful.push({
            row: row._rowNumber,
            courseCode,
            section,
            action: 'updated'
          });
        } else {
          const newOffering = await CourseOffering.create(offeringData);
          results.successful.push({
            row: row._rowNumber,
            courseCode,
            section,
            action: 'created',
            id: newOffering._id
          });
        }
      } catch (error) {
        results.failed.push({
          row: row._rowNumber,
          courseCode: row.courseCode,
          reason: error.message
        });
      }
    }

    // Log import
    await AuditLogger.logImport({
      importType: 'offerings',
      performedBy: req.user._id,
      performedByRole: req.user.role,
      targetModel: 'CourseOffering',
      totalRows: rows.length,
      successful: results.successful.length,
      failed: results.failed.length,
      errors: results.failed,
      academicYear: rows[0]?.academicYear,
      semesterNumber: parseInt(rows[0]?.semesterNumber),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Course offerings import completed',
      summary: {
        total: rows.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error importing offerings',
      error: error.message
    });
  }
};

/**
 * @desc    Get CSV templates
 * @route   GET /api/import/templates/:type
 * @access  Private (Admin)
 */
export const getCSVTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    const templates = {
      courses: {
        headers: ['courseCode', 'courseName', 'description', 'departmentCode', 'programCode', 'creditHours', 'lectureHours', 'labHours', 'tutorialHours', 'courseType', 'domain', 'prerequisites', 'corequisites'],
        sample: ['CS101', 'Introduction to Programming', 'Basic programming concepts', 'CS', 'BSCS', '3', '3', '0', '0', 'core', 'Computer Science', '', ''],
        notes: 'Prerequisites and corequisites should be semicolon-separated course codes'
      },
      curriculum: {
        headers: ['programCode', 'semesterNumber', 'courseCode', 'isRequired', 'electiveGroup', 'minCredits', 'maxCredits'],
        sample: ['BSCS', '1', 'CS101', 'true', '', '', ''],
        notes: 'Set isRequired to false and specify electiveGroup for electives'
      },
      offerings: {
        headers: ['courseCode', 'programCode', 'academicYear', 'semesterNumber', 'semesterName', 'section', 'teacherEmployeeId', 'maxCapacity', 'schedule', 'enrollmentStatus', 'status'],
        sample: ['CS101', 'BSCS', '2025-2026', '1', 'Fall', 'A', 'EMP001', '60', 'Mon 09:00-10:30 Room101;Wed 09:00-10:30 Room101', 'open', 'scheduled'],
        notes: 'Schedule format: Day HH:MM-HH:MM Room; or JSON array'
      }
    };

    if (!templates[type]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid template type. Available: courses, curriculum, offerings'
      });
    }

    const template = templates[type];
    const csv = `${template.headers.join(',')}\n${template.sample.join(',')}`;

    res.status(200).json({
      success: true,
      data: {
        type,
        headers: template.headers,
        sample: template.sample,
        notes: template.notes,
        csv
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting template',
      error: error.message
    });
  }
};

/**
 * @desc    Get audit logs
 * @route   GET /api/import/audit-logs
 * @access  Private (Admin)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      category,
      performedBy,
      targetModel,
      targetId,
      academicYear,
      semesterNumber,
      program,
      startDate,
      endDate
    } = req.query;

    const result = await AuditLogger.query({
      action,
      category,
      performedBy,
      targetModel,
      targetId,
      academicYear,
      semesterNumber: semesterNumber ? parseInt(semesterNumber) : undefined,
      program,
      startDate,
      endDate
    }, { page, limit });

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
};

/**
 * @desc    Get audit trail for entity
 * @route   GET /api/import/audit-logs/:model/:id
 * @access  Private (Admin)
 */
export const getEntityAuditTrail = async (req, res) => {
  try {
    const { model, id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await AuditLogger.getEntityAuditTrail(model, id, { page, limit });

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching audit trail',
      error: error.message
    });
  }
};
