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
  getUserStats
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
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

// Get all users with filters and pagination
router.get('/', validatePagination, getAllUsers);

// Get single user by ID
router.get('/:id', validateObjectId('id'), getUserById);

// Create new user
router.post(
  '/',
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateRegistration,
  createUser
);

// Update user
router.put(
  '/:id',
  validateObjectId('id'),
  sanitizeInput,
  validateUserUpdate,
  updateUser
);

// Deactivate user account
router.put('/:id/deactivate', validateObjectId('id'), deactivateUser);

// Activate user account
router.put('/:id/activate', validateObjectId('id'), activateUser);

// Unlock user account
router.put('/:id/unlock', validateObjectId('id'), unlockAccount);

// Delete user (soft delete)
router.delete('/:id', validateObjectId('id'), deleteUser);

export default router;
