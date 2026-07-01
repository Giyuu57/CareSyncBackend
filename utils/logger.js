import { AuditLog } from '../models/auditLog.js';

export const logActivity = async (action, details, req) => {
  try {
    const performedBy = req && req.user ? req.user.id : null;
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip) : null;
    
    await AuditLog.create({
      action,
      details,
      performedBy,
      ipAddress
    });
  } catch (err) {
    console.error('Error logging audit activity:', err);
  }
};
