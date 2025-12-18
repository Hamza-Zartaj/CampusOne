import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  unlockAccount,
  deleteUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateUser, validateUpdateUser } from '../middleware/validation.js';

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// User management routes
router.route('/')
  .get(getAllUsers)
  .post(validateUser, createUser);

router.route('/:id')
  .get(getUserById)
  .put(validateUpdateUser, updateUser)
  .delete(deleteUser);

router.put('/:id/deactivate', deactivateUser);
router.put('/:id/activate', activateUser);
router.put('/:id/unlock', unlockAccount);

export default router;
