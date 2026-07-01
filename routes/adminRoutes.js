import { Router } from 'express';
import { authcheck } from '../middleware/authware.js';
import { roles } from '../middleware/rolesware.js';
import {
  getAnalytics,
  getUsers,
  updateUserRole,
  deleteUser,
  getMedicines,
  updateMedicine,
  deleteMedicine,
  getAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  getAuditLogs
} from '../controllers/adminController.js';

const router = Router();

// Publicly accessible route to get active announcements
router.route('/announcements/active').get(getActiveAnnouncements);

// Protected routes - strictly admin-only
router.route('/analytics').get(authcheck, roles('admin'), getAnalytics);
router.route('/users').get(authcheck, roles('admin'), getUsers);
router.route('/users/:id/role').put(authcheck, roles('admin'), updateUserRole);
router.route('/users/:id').delete(authcheck, roles('admin'), deleteUser);

router.route('/medicines').get(authcheck, roles('admin'), getMedicines);
router.route('/medicines/:id')
  .put(authcheck, roles('admin'), updateMedicine)
  .delete(authcheck, roles('admin'), deleteMedicine);

router.route('/announcements')
  .get(authcheck, roles('admin'), getAnnouncements)
  .post(authcheck, roles('admin'), createAnnouncement);
router.route('/announcements/:id/toggle').put(authcheck, roles('admin'), toggleAnnouncement);
router.route('/announcements/:id').delete(authcheck, roles('admin'), deleteAnnouncement);

router.route('/audit-logs').get(authcheck, roles('admin'), getAuditLogs);

export default router;
