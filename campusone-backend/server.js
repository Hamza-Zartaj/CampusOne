import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import programRoutes from './routes/programRoutes.js';
import curriculumRoutes from './routes/curriculumRoutes.js';
import termRoutes from './routes/termRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import courseOfferingRoutes from './routes/courseOfferingRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import semesterInchargeRoutes from './routes/semesterInchargeRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import qnaRoutes from './routes/qnaRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cors()); // Enable CORS for all routes

// Serve static files from uploads directory
app.use(express.static(path.join(__dirname, '../uploads')));

// Prisma Connection Test
import prisma from './prisma/client.js';

const connectDB = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL (Prisma) Connected');
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to CampusOne API',
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'Connected', uptime: process.uptime() });
  } catch {
    res.status(500).json({ status: 'ERROR', database: 'Disconnected', uptime: process.uptime() });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/curricula', curriculumRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/offerings', courseOfferingRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/semester-incharges', semesterInchargeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/qna', qnaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler - Route not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
