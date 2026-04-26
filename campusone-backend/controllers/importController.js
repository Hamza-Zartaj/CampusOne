import prisma from '../prisma/client.js';
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
    const departments = await prisma.department.findMany({
      select: { id: true, departmentCode: true }
    });
    const programs = await prisma.program.findMany({
      select: { id: true, programCode: true }
    });
    const existingCourses = await prisma.course.findMany({
      select: { id: true, courseCode: true }
    });

    const deptMap = new Map(departments.map(d => [d.departmentCode, d.id]));
    const programMap = new Map(programs.map(p => [p.programCode, p.id]));
    const courseMap = new Map(existingCourses.map(c => [c.courseCode, c.id]));

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
        const existingId = courseMap.get(courseCode);
        if (existingId && !updateExisting) {
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
            const prereqId = courseMap.get(code);
            if (prereqId) {
              prerequisites.push(prereqId);
            }
          }
        }

        // Parse corequisites
        const corequisites = [];
        if (row.corequisites?.trim()) {
          const coreqCodes = row.corequisites.split(';').map(c => c.trim().toUpperCase());
          for (const code of coreqCodes) {
            const coreqId = courseMap.get(code);
            if (coreqId) {
              corequisites.push(coreqId);
            }
          }
        }

        const courseData = {
          courseCode,
          courseName: row.courseName?.trim(),
          description: row.description?.trim(),
          departmentId,
          programId,
          creditHours: parseInt(row.creditHours) || 3,
          courseType: row.courseType?.trim() || 'core',
          prerequisites,
          domain: row.domain?.trim()
        };

        if (existingId && updateExisting) {
          await prisma.course.update({
            where: { id: existingId },
            data: courseData
          });
          results.successful.push({ row: row._rowNumber, courseCode, action: 'updated' });
        } else {
          const newCourse = await prisma.course.create({
            data: courseData
          });
          courseMap.set(courseCode, newCourse.id);
          results.successful.push({ row: row._rowNumber, courseCode, action: 'created', id: newCourse.id });
        }
      } catch (error) {
        results.failed.push({ row: row._rowNumber, courseCode: row.courseCode, reason: error.message });
      }
    }

    // Log import
    await AuditLogger.logImport({
      importType: 'courses',
      performedBy: req.user.id,
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
    const programs = await prisma.program.findMany({
      select: { id: true, programCode: true }
    });
    const courses = await prisma.course.findMany({
      select: { id: true, courseCode: true }
    });

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
          semester.requiredCourses.push(course.id);
        } else if (electiveGroup) {
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
          slot.allowedCourses.push(course.id);
        }

        results.successful.push({ row: row._rowNumber, programCode, semesterNumber, courseCode });
      } catch (error) {
        results.failed.push({ row: row._rowNumber, reason: error.message });
      }
    }

    // Apply updates to programs
    for (const [programCode, update] of programUpdates) {
      const program = update.program;
      let curriculum = program.curriculum || [];

      if (replaceExisting) {
        curriculum = [];
      }

      for (const [semesterNumber, semData] of update.semesters) {
        let semesterIndex = curriculum.findIndex(s => s.semesterNumber === semesterNumber);

        if (semesterIndex === -1) {
          curriculum.push({
            semesterNumber,
            requiredCourses: semData.requiredCourses,
            electiveSlots: semData.electiveSlots
          });
        } else if (replaceExisting) {
          curriculum[semesterIndex] = {
            semesterNumber,
            requiredCourses: semData.requiredCourses,
            electiveSlots: semData.electiveSlots
          };
        } else {
          const existing = curriculum[semesterIndex];
          const existingReqIds = existing.requiredCourses.map(c => c.toString());
          for (const courseId of semData.requiredCourses) {
            if (!existingReqIds.includes(courseId.toString())) {
              existing.requiredCourses.push(courseId);
            }
          }
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

      curriculum.sort((a, b) => a.semesterNumber - b.semesterNumber);
      await prisma.program.update({
        where: { id: program.id },
        data: { curriculum }
      });
    }

    // Log import
    await AuditLogger.logImport({
      importType: 'curriculum',
      performedBy: req.user.id,
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
    const courses = await prisma.course.findMany({
      select: { id: true, courseCode: true }
    });
    const programs = await prisma.program.findMany({
      select: { id: true, programCode: true }
    });
    const teachers = await prisma.teacher.findMany({
      select: { id: true, employeeId: true }
    });

    const courseMap = new Map(courses.map(c => [c.courseCode, c.id]));
    const programMap = new Map(programs.map(p => [p.programCode, p.id]));
    const teacherMap = new Map(teachers.map(t => [t.employeeId, t.id]));

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

        const courseId = courseMap.get(courseCode);
        if (!courseId) {
          results.failed.push({ row: row._rowNumber, reason: `Course not found: ${courseCode}` });
          continue;
        }

        const programId = programMap.get(programCode);
        if (!programId) {
          results.failed.push({ row: row._rowNumber, reason: `Program not found: ${programCode}` });
          continue;
        }

        const teacherId = teacherMap.get(teacherEmployeeId);
        if (!teacherId) {
          results.failed.push({ row: row._rowNumber, reason: `Teacher not found: ${teacherEmployeeId}` });
          continue;
        }

        // Check for existing offering
        const existingOffering = await prisma.courseOffering.findFirst({
          where: {
            courseId,
            programId,
            academicYear,
            semesterNumber,
            section
          }
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
            schedule = JSON.parse(row.schedule);
          } catch {
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
          courseId,
          programId,
          academicYear,
          semesterNumber,
          semesterName: row.semesterName?.trim(),
          section,
          teacherId,
          maxCapacity: parseInt(row.maxCapacity) || 60,
          schedule,
          currentEnrollment: 0
        };

        if (existingOffering && updateExisting) {
          await prisma.courseOffering.update({
            where: { id: existingOffering.id },
            data: offeringData
          });
          results.successful.push({
            row: row._rowNumber,
            courseCode,
            section,
            action: 'updated'
          });
        } else {
          const newOffering = await prisma.courseOffering.create({
            data: offeringData
          });
          results.successful.push({
            row: row._rowNumber,
            courseCode,
            section,
            action: 'created',
            id: newOffering.id
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
      performedBy: req.user.id,
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
 * @desc    Get import statistics
 * @route   GET /api/import/stats
 * @access  Private (Admin)
 */
export const getImportStats = async (req, res) => {
  try {
    const courses = await prisma.course.count();
    const programs = await prisma.program.count();
    const offerings = await prisma.courseOffering.count();
    const departments = await prisma.department.count();

    res.status(200).json({
      success: true,
      data: {
        courses,
        programs,
        offerings,
        departments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

/**
 * @desc    Get import audit logs
 * @route   GET /api/import/audit-logs
 * @access  Private (Admin)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entityType, userId } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching audit logs', error: error.message });
  }
};

/**
 * @desc    Get audit trail for a specific entity
 * @route   GET /api/import/audit-trail/:entityType/:entityId
 * @access  Private (Admin)
 */
export const getEntityAuditTrail = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching entity audit trail', error: error.message });
  }
};
