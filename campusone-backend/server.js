import express from 'express';
import mongoose from 'mongoose';
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
import departmentRoutes from './routes/departmentRoutes.js';
import programRoutes from './routes/programRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import courseOfferingRoutes from './routes/courseOfferingRoutes.js';
import semesterInchargeRoutes from './routes/semesterInchargeRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import teacherToolsRoutes from './routes/teacherToolsRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import studentPortalRoutes from './routes/studentPortalRoutes.js';
import importRoutes from './routes/importRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';

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

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      // Options removed as they are deprecated in Mongoose 6+
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit process with failure
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
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/course-offerings', courseOfferingRoutes);
app.use('/api/semester-incharges', semesterInchargeRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/teacher-tools', teacherToolsRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api/import', importRoutes);
app.use('/api/announcements', announcementRoutes);

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
