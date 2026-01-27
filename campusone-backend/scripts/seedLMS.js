/**
 * Seed Data Script for LMS
 * Creates sample data: 1 Bachelor program, 2 core semesters, 1 elective semester
 * 
 * Usage: node scripts/seedLMS.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load env vars
dotenv.config();

// Import models
import User from '../models/User.js';
import Program from '../models/Program.js';
import CourseCatalog from '../models/CourseCatalog.js';
import Curriculum from '../models/Curriculum.js';
import AcademicTerm from '../models/AcademicTerm.js';
import CourseOffering from '../models/CourseOffering.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ MongoDB Connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Sample Data
const seedData = async () => {
  try {
    console.log('🌱 Starting LMS seed process...\n');

    // ===== 1. Create SuperAdmin and Admin =====
    console.log('📝 Creating users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Check if superadmin exists
    let superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Super Admin',
        username: 'superadmin',
        email: 'superadmin@campus.edu',
        password: hashedPassword,
        role: 'superadmin',
        isFirstLogin: false
      });
      console.log('  ✓ SuperAdmin created');
    } else {
      // Ensure role is superadmin
      if (superAdmin.role !== 'superadmin') {
        superAdmin.role = 'superadmin';
        await superAdmin.save();
      }
      console.log('  - SuperAdmin already exists');
    }

    // Create admin
    let admin = await User.findOne({ email: 'admin@campus.edu' });
    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        username: 'admin',
        email: 'admin@campus.edu',
        password: hashedPassword,
        role: 'admin',
        department: 'Computer Science',
        isFirstLogin: false
      });
      console.log('  ✓ Admin created');
    } else {
      console.log('  - Admin already exists');
    }

    // Create teachers
    let teacher1 = await User.findOne({ email: 'john.smith@campus.edu' });
    if (!teacher1) {
      teacher1 = await User.create({
        name: 'Dr. John Smith',
        username: 'johnsmith',
        email: 'john.smith@campus.edu',
        password: hashedPassword,
        role: 'teacher',
        employeeId: 'TCH001',
        department: 'Computer Science',
        isFirstLogin: false
      });
      console.log('  ✓ Teacher 1 created');
    }

    let teacher2 = await User.findOne({ email: 'sarah.jones@campus.edu' });
    if (!teacher2) {
      teacher2 = await User.create({
        name: 'Dr. Sarah Jones',
        username: 'sarahjones',
        email: 'sarah.jones@campus.edu',
        password: hashedPassword,
        role: 'teacher',
        employeeId: 'TCH002',
        department: 'Computer Science',
        isFirstLogin: false
      });
      console.log('  ✓ Teacher 2 created');
    }

    // Create TA
    let ta = await User.findOne({ email: 'mike.wilson@campus.edu' });
    if (!ta) {
      ta = await User.create({
        name: 'Mike Wilson',
        username: 'mikewilson',
        email: 'mike.wilson@campus.edu',
        password: hashedPassword,
        role: 'ta',
        department: 'Computer Science',
        isFirstLogin: false
      });
      console.log('  ✓ TA created');
    }

    // ===== 2. Create Program =====
    console.log('\n📚 Creating program...');
    
    let bscs = await Program.findOne({ code: 'BSCS' });
    if (!bscs) {
      bscs = await Program.create({
        name: 'Bachelor of Science in Computer Science',
        code: 'BSCS',
        description: 'A 4-year undergraduate program in Computer Science covering core CS fundamentals and specializations.',
        programType: 'bachelor',
        totalSemesters: 8,
        coreSemestersCount: 4,
        department: 'Computer Science',
        totalCreditHours: 130,
        minimumCGPA: 2.0
      });
      console.log('  ✓ BSCS Program created');
    } else {
      console.log('  - BSCS Program already exists');
    }

    // ===== 3. Create Courses in Catalog =====
    console.log('\n📖 Creating courses...');
    
    const coursesData = [
      // Semester 1 (Core)
      { courseCode: 'CS101', courseName: 'Introduction to Programming', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Fundamentals of programming using Python' },
      { courseCode: 'CS102', courseName: 'Discrete Mathematics', creditHours: 3, theoryHours: 3, labHours: 0, department: 'Computer Science', description: 'Mathematical foundations for CS' },
      { courseCode: 'CS103', courseName: 'Computer Fundamentals', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Introduction to computer systems' },
      { courseCode: 'ENG101', courseName: 'English Composition', creditHours: 3, theoryHours: 3, labHours: 0, department: 'English', description: 'Academic writing and communication' },
      
      // Semester 2 (Core)
      { courseCode: 'CS201', courseName: 'Object-Oriented Programming', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'OOP concepts using Java' },
      { courseCode: 'CS202', courseName: 'Data Structures', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Fundamental data structures and algorithms' },
      { courseCode: 'CS203', courseName: 'Digital Logic Design', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Boolean algebra and logic circuits' },
      { courseCode: 'MTH201', courseName: 'Calculus I', creditHours: 3, theoryHours: 3, labHours: 0, department: 'Mathematics', description: 'Differential and integral calculus' },
      
      // Semester 5 (Electives available)
      { courseCode: 'CS501', courseName: 'Database Systems', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Relational databases and SQL' },
      { courseCode: 'CS502', courseName: 'Operating Systems', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'OS concepts and design' },
      { courseCode: 'CS510', courseName: 'Artificial Intelligence', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Introduction to AI and ML' },
      { courseCode: 'CS511', courseName: 'Web Development', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Full-stack web development' },
      { courseCode: 'CS512', courseName: 'Mobile App Development', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Cross-platform mobile development' },
      { courseCode: 'CS513', courseName: 'Cloud Computing', creditHours: 3, theoryHours: 2, labHours: 2, department: 'Computer Science', description: 'Cloud platforms and services' }
    ];

    const courses = {};
    for (const courseData of coursesData) {
      let course = await CourseCatalog.findOne({ courseCode: courseData.courseCode });
      if (!course) {
        course = await CourseCatalog.create(courseData);
        console.log(`  ✓ ${courseData.courseCode} created`);
      } else {
        console.log(`  - ${courseData.courseCode} already exists`);
      }
      courses[courseData.courseCode] = course;
    }

    // Set prerequisites
    if (courses['CS201'] && courses['CS101']) {
      await CourseCatalog.findByIdAndUpdate(courses['CS201']._id, {
        prerequisites: [courses['CS101']._id]
      });
    }
    if (courses['CS202'] && courses['CS201']) {
      await CourseCatalog.findByIdAndUpdate(courses['CS202']._id, {
        prerequisites: [courses['CS201']._id]
      });
    }

    // ===== 4. Create Curriculum (Map courses to program/semesters) =====
    console.log('\n🗺️  Creating curriculum...');
    
    const curriculumData = [
      // Semester 1 - Core
      { courseCode: 'CS101', semesterNumber: 1, isElective: false },
      { courseCode: 'CS102', semesterNumber: 1, isElective: false },
      { courseCode: 'CS103', semesterNumber: 1, isElective: false },
      { courseCode: 'ENG101', semesterNumber: 1, isElective: false },
      
      // Semester 2 - Core
      { courseCode: 'CS201', semesterNumber: 2, isElective: false },
      { courseCode: 'CS202', semesterNumber: 2, isElective: false },
      { courseCode: 'CS203', semesterNumber: 2, isElective: false },
      { courseCode: 'MTH201', semesterNumber: 2, isElective: false },
      
      // Semester 5 - Core + Electives
      { courseCode: 'CS501', semesterNumber: 5, isElective: false },
      { courseCode: 'CS502', semesterNumber: 5, isElective: false },
      { courseCode: 'CS510', semesterNumber: 5, isElective: true, electiveGroup: 'CS-ELECTIVE-1' },
      { courseCode: 'CS511', semesterNumber: 5, isElective: true, electiveGroup: 'CS-ELECTIVE-1' },
      { courseCode: 'CS512', semesterNumber: 5, isElective: true, electiveGroup: 'CS-ELECTIVE-1' },
      { courseCode: 'CS513', semesterNumber: 5, isElective: true, electiveGroup: 'CS-ELECTIVE-1' }
    ];

    for (const item of curriculumData) {
      const existing = await Curriculum.findOne({
        programId: bscs._id,
        courseId: courses[item.courseCode]._id,
        semesterNumber: item.semesterNumber
      });
      
      if (!existing) {
        await Curriculum.create({
          programId: bscs._id,
          courseId: courses[item.courseCode]._id,
          semesterNumber: item.semesterNumber,
          isElective: item.isElective,
          electiveGroup: item.electiveGroup || null,
          isMandatory: !item.isElective
        });
        console.log(`  ✓ ${item.courseCode} added to Semester ${item.semesterNumber}`);
      } else {
        console.log(`  - ${item.courseCode} already in curriculum`);
      }
    }

    // ===== 5. Create Academic Terms =====
    console.log('\n📅 Creating academic terms...');
    
    let fall2025 = await AcademicTerm.findOne({ termType: 'fall', year: 2025 });
    if (!fall2025) {
      fall2025 = await AcademicTerm.create({
        termType: 'fall',
        year: 2025,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-20'),
        registrationStartDate: new Date('2025-08-15'),
        registrationEndDate: new Date('2025-08-31'),
        addDropDeadline: new Date('2025-09-15'),
        withdrawalDeadline: new Date('2025-11-15'),
        isCurrent: false
      });
      console.log('  ✓ Fall 2025 term created');
    }

    let spring2026 = await AcademicTerm.findOne({ termType: 'spring', year: 2026 });
    if (!spring2026) {
      spring2026 = await AcademicTerm.create({
        termType: 'spring',
        year: 2026,
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-15'),
        registrationStartDate: new Date('2026-01-01'),
        registrationEndDate: new Date('2026-01-14'),
        addDropDeadline: new Date('2026-01-30'),
        withdrawalDeadline: new Date('2026-04-01'),
        isCurrent: true
      });
      console.log('  ✓ Spring 2026 term created (set as current)');
    }

    let summer2026 = await AcademicTerm.findOne({ termType: 'summer', year: 2026 });
    if (!summer2026) {
      summer2026 = await AcademicTerm.create({
        termType: 'summer',
        year: 2026,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-07-31'),
        registrationStartDate: new Date('2026-05-20'),
        registrationEndDate: new Date('2026-05-31'),
        addDropDeadline: new Date('2026-06-07'),
        withdrawalDeadline: new Date('2026-07-01'),
        isCurrent: false
      });
      console.log('  ✓ Summer 2026 term created');
    }

    // ===== 6. Create Course Offerings =====
    console.log('\n🎓 Creating course offerings for Spring 2026...');
    
    const offeringsData = [
      { courseCode: 'CS101', section: 'A', teacher: teacher1 },
      { courseCode: 'CS102', section: 'A', teacher: teacher2 },
      { courseCode: 'CS201', section: 'A', teacher: teacher1 },
      { courseCode: 'CS202', section: 'A', teacher: teacher2 }
    ];

    for (const offering of offeringsData) {
      const existing = await CourseOffering.findOne({
        courseId: courses[offering.courseCode]._id,
        academicTermId: spring2026._id,
        section: offering.section
      });

      if (!existing) {
        await CourseOffering.create({
          courseId: courses[offering.courseCode]._id,
          academicTermId: spring2026._id,
          programId: bscs._id,
          section: offering.section,
          assignedTeacher: offering.teacher._id,
          assignedTAs: [ta._id],
          maxCapacity: 40,
          schedule: {
            days: ['monday', 'wednesday'],
            startTime: '09:00',
            endTime: '10:30',
            room: `Room ${Math.floor(Math.random() * 100) + 100}`
          },
          status: 'ongoing'
        });
        console.log(`  ✓ ${offering.courseCode} Section ${offering.section} offering created`);
      } else {
        console.log(`  - ${offering.courseCode} offering already exists`);
      }
    }

    // ===== 7. Create Sample Students =====
    console.log('\n👨‍🎓 Creating sample students...');
    
    const studentsData = [
      { name: 'Alice Johnson', username: 'alicejohnson', email: 'alice.johnson@campus.edu', studentId: 'STU2025001', currentSemester: 1 },
      { name: 'Bob Williams', username: 'bobwilliams', email: 'bob.williams@campus.edu', studentId: 'STU2025002', currentSemester: 1 },
      { name: 'Carol Davis', username: 'caroldavis', email: 'carol.davis@campus.edu', studentId: 'STU2024001', currentSemester: 2 },
      { name: 'David Brown', username: 'davidbrown', email: 'david.brown@campus.edu', studentId: 'STU2023001', currentSemester: 5 }
    ];

    for (const studentData of studentsData) {
      let student = await User.findOne({ email: studentData.email });
      if (!student) {
        student = await User.create({
          name: studentData.name,
          username: studentData.username,
          email: studentData.email,
          password: hashedPassword,
          role: 'student',
          studentId: studentData.studentId,
          programId: bscs._id,
          currentSemester: studentData.currentSemester,
          enrollmentYear: parseInt(studentData.studentId.substring(3, 7)),
          isFirstLogin: false
        });
        console.log(`  ✓ ${studentData.name} created (Semester ${studentData.currentSemester})`);
      } else {
        console.log(`  - ${studentData.name} already exists`);
      }
    }

    console.log('\n✅ Seed completed successfully!\n');
    console.log('='.repeat(50));
    console.log('Test Credentials:');
    console.log('='.repeat(50));
    console.log('SuperAdmin: superadmin@campus.edu / password123');
    console.log('Admin:      admin@campus.edu / password123');
    console.log('Teacher 1:  john.smith@campus.edu / password123');
    console.log('Teacher 2:  sarah.jones@campus.edu / password123');
    console.log('TA:         mike.wilson@campus.edu / password123');
    console.log('Student 1:  alice.johnson@campus.edu / password123');
    console.log('Student 2:  bob.williams@campus.edu / password123');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Seed Error:', error.message);
    throw error;
  }
};

// Run seed
const run = async () => {
  await connectDB();
  await seedData();
  await mongoose.connection.close();
  console.log('\n📤 Database connection closed');
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
