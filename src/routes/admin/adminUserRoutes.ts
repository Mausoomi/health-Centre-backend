import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUserStatus,
  addUserNote,
  deleteUser,
} from '../../controllers/userManagementController';

const router = Router();

/**
 * ============================================================================
 * ADMIN PORTAL - USER MANAGEMENT ROUTES
 * Base URL: /api/v1/admin/users
 * ============================================================================
 */

// List all registered users (supports ?search, ?status, ?sort, ?limit)
router.get('/', getAllUsers);

// Create a new user manually from admin portal
router.post('/', createUser);

// Get single user details with stats & notes
router.get('/:id', getUserById);

// Update user account status (Active, Watch, Suspended)
router.patch('/:id/status', updateUserStatus);

// Append a persistent internal note to a user account
router.post('/:id/notes', addUserNote);

// Delete user account permanently
router.delete('/:id', deleteUser);

export const adminUserRoutes = router;
