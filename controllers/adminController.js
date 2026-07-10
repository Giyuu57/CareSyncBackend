import { User } from '../models/user.js';
import { Store } from '../models/store.js';
import { Order } from '../models/orders.js';
import { Request } from '../models/request.js';
import { Medication } from '../models/medicine.js';
import { Announcement } from '../models/announcement.js';
import { AuditLog } from '../models/auditLog.js';
import { inventory } from '../models/inventory.js';
import { logActivity } from '../utils/logger.js';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import {
  isValidRole,
  isValidAnnouncementType,
  isNotEmpty,
  validationError
} from '../utils/validators.js';

// GET /admin/analytics
const getAnalytics = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const admins = await User.countDocuments({ role: 'admin' });
  const storeOwners = await User.countDocuments({ role: 'store-owner' });
  const customers = await User.countDocuments({ role: 'customer' });
  const suspendedUsers = await User.countDocuments({ isSuspended: true });

  const totalStores = await Store.countDocuments();

  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'pending' });
  const processedOrders = await Order.countDocuments({ status: 'processed' });
  const completedOrders = await Order.countDocuments({ status: 'completed' });
  const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

  const totalRequests = await Request.countDocuments();
  const pendingRequests = await Request.countDocuments({ status: 'pending' });
  const completedRequests = await Request.countDocuments({ status: 'completed' });
  const cancelledRequests = await Request.countDocuments({ status: 'cancelled' });

  // Map coordinates of all store requests for heatmap
  const requestPoints = await Request.find({}, 'address.latitude address.longitude name status');

  res.status(200).json({
    users: { totalUsers, admins, storeOwners, customers, suspendedUsers },
    stores: { totalStores },
    orders: { totalOrders, pendingOrders, processedOrders, completedOrders, cancelledOrders },
    requests: { totalRequests, pendingRequests, completedRequests, cancelledRequests },
    requestPoints
  });
});

// GET /admin/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}, '-passwordHash').populate('store_id');
  res.status(200).json(users);
});

// PUT /admin/users/:id/role
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, isSuspended } = req.body;

  // Validate role if provided
  if (role !== undefined && !isValidRole(role)) {
    return validationError(res, `Role must be one of: admin, store-owner, customer.`);
  }

  // Validate isSuspended if provided
  if (isSuspended !== undefined && typeof isSuspended !== 'boolean') {
    return validationError(res, 'isSuspended must be a boolean value.');
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (role !== undefined) user.role = role;
  if (isSuspended !== undefined) user.isSuspended = isSuspended;

  await user.save();
  await logActivity(
    'USER_ROLE_UPDATE',
    `Updated user ${user.name} (${user.email}) role to ${role || user.role} (suspended: ${isSuspended !== undefined ? isSuspended : user.isSuspended})`,
    req
  );

  res.status(200).json(user);
});

// GET /admin/medicines
const getMedicines = asyncHandler(async (req, res) => {
  const medicines = await Medication.find();
  res.status(200).json(medicines);
});

// PUT /admin/medicines/:id
const updateMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, composition, manufacturer, usage } = req.body;

  // Validate required medicine fields
  if (!isNotEmpty(name)) {
    return validationError(res, 'Medicine name is required.');
  }
  if (!isNotEmpty(composition)) {
    return validationError(res, 'Composition is required.');
  }
  if (!isNotEmpty(manufacturer)) {
    return validationError(res, 'Manufacturer is required.');
  }
  if (!isNotEmpty(usage)) {
    return validationError(res, 'Usage/indications are required.');
  }

  const medicine = await Medication.findByIdAndUpdate(id, req.body, { new: true });
  if (!medicine) {
    return res.status(404).json({ message: 'Medicine not found' });
  }

  await logActivity('MEDICINE_UPDATE', `Updated medicine details for ${medicine.name} (Composition: ${medicine.composition})`, req);
  res.status(200).json(medicine);
});

// DELETE /admin/medicines/:id
const deleteMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const medicine = await Medication.findByIdAndDelete(id);
  if (!medicine) {
    return res.status(404).json({ message: 'Medicine not found' });
  }

  await logActivity('MEDICINE_DELETE', `Deleted medicine catalog entry for ${medicine.name} (ID: ${id})`, req);
  res.status(200).json({ message: 'Medicine deleted successfully' });
});

// GET /admin/announcements
const getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
  res.status(200).json(announcements);
});

// GET /admin/announcements/active (Public/Any role access)
const getActiveAnnouncements = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const query = { isActive: true };
  if (role) {
    query.targetRole = { $in: ['all', role] };
  }
  const activeAnnouncements = await Announcement.find(query).sort({ createdAt: -1 });
  res.status(200).json(activeAnnouncements);
});

// POST /admin/announcements
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, type, targetRole } = req.body;

  if (!isNotEmpty(title)) {
    return validationError(res, 'Title is required.');
  }
  if (title.trim().length > 100) {
    return validationError(res, 'Title must be 100 characters or fewer.');
  }
  if (!isNotEmpty(message)) {
    return validationError(res, 'Message is required.');
  }
  if (message.trim().length > 500) {
    return validationError(res, 'Message must be 500 characters or fewer.');
  }
  if (type !== undefined && !isValidAnnouncementType(type)) {
    return validationError(res, 'Type must be one of: info, warning, success, danger.');
  }
  if (targetRole !== undefined && !['all', 'customer', 'store-owner'].includes(targetRole)) {
    return validationError(res, 'Target audience must be one of: all, customer, store-owner.');
  }

  const announcement = await Announcement.create({
    title: title.trim(),
    message: message.trim(),
    type: type || 'info',
    targetRole: targetRole || 'all',
    createdBy: req.user.id
  });

  await logActivity('ANNOUNCEMENT_CREATE', `Published global notice: "${title.trim()}" (Type: ${type || 'info'}, Audience: ${targetRole || 'all'})`, req);
  res.status(201).json(announcement);
});

// PUT /admin/announcements/:id/toggle
const toggleAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return validationError(res, 'isActive must be a boolean value.');
  }

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    return res.status(404).json({ message: 'Announcement not found' });
  }

  announcement.isActive = isActive;
  await announcement.save();

  await logActivity('ANNOUNCEMENT_TOGGLE', `Toggled notice active status to ${isActive} for: "${announcement.title}"`, req);
  res.status(200).json(announcement);
});

// DELETE /admin/announcements/:id
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) {
    return res.status(404).json({ message: 'Announcement not found' });
  }

  await logActivity('ANNOUNCEMENT_DELETE', `Deleted system notice: "${announcement.title}" (ID: ${id})`, req);
  res.status(200).json({ message: 'Announcement deleted successfully' });
});

// GET /admin/audit-logs
const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().populate('performedBy', 'name email role').sort({ createdAt: -1 }).limit(100);
  res.status(200).json(logs);
});

// DELETE /admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent admin from self-deleting
  if (user._id.toString() === req.user.id.toString()) {
    return res.status(400).json({ message: 'Admin cannot delete their own account.' });
  }

  // Prevent deletion of other admin accounts through this endpoint
  if (user.role === 'admin') {
    return res.status(400).json({ message: 'Admin accounts cannot be deleted through this endpoint.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // If the user is a store owner, clean up store and inventory
    if (user.role === 'store-owner' && user.store_id) {
      await inventory.deleteMany({ store: user.store_id }).session(session);
      await Store.findByIdAndDelete(user.store_id).session(session);
    }

    // Clean up any registration requests
    await Request.deleteMany({ owner: user._id }).session(session);

    // Delete the user
    await User.findByIdAndDelete(id).session(session);

    await logActivity(
      'USER_DELETE',
      `Permanently deleted user account: ${user.name} (${user.email}, Role: ${user.role}) and associated assets.`,
      req
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'User and associated data deleted successfully.' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
});

export {
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
};
