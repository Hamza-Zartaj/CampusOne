import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  unlockAccount,
  deleteUser,
  getUserStats,
  getUserStatsByRole,
  promoteStudentToTA,
  searchStudents
} from '../controllers/userController.js';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';
import {
  validateRegistration,
  validateUserUpdate,
  validatePagination,
  validateObjectId,
  validateEmail,
  validatePassword,
  sanitizeInput
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Apply admin authorization to all routes (only admins can manage users)
router.use(authorize('admin'));

// Get user statistics (for admin dashboard)
router.get('/stats', getUserStats);

// Get user statistics by role (Admins, Teachers, Students, TAs)
// Requires manage_users permission or Super Admin
router.get('/stats/by-role', authorizePermission('manage_users'), getUserStatsByRole);

// Search for students
// Requires manage_users permission or Super Admin
router.get('/search-students', authorizePermission('manage_users'), searchStudents);

// Get all users with filters and pagination
router.get('/', authorizePermission('manage_users'), validatePagination, getAllUsers);

// Get single user by ID
router.get('/:id', authorizePermission('manage_users'), validateObjectId('id'), getUserById);

// Promote student to TA
// Requires manage_users permission or Super Admin
router.post(
  '/promote-to-ta',
  authorizePermission('manage_users'),
  promoteStudentToTA
);

// Create new user
// Super Admin can create anyone (including admins)
// Regular admins with manage_users can create teachers and students only
router.post(
  '/',
  authorizePermission('manage_users'),
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateRegistration,
  createUser
);

// Update user
router.put(
  '/:id',
  authorizePermission('manage_users'),
  validateObjectId('id'),
  sanitizeInput,
  validateUserUpdate,
  updateUser
);

// Deactivate user account
router.put('/:id/deactivate', authorizePermission('manage_users'), validateObjectId('id'), deactivateUser);

// Activate user account
router.put('/:id/activate', authorizePermission('manage_users'), validateObjectId('id'), activateUser);

// Unlock user account
router.put('/:id/unlock', authorizePermission('manage_users'), validateObjectId('id'), unlockAccount);

// Delete user (soft delete)
router.delete('/:id', authorizePermission('manage_users'), validateObjectId('id'), deleteUser);

export default router;
