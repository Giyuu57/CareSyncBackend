import mongoose from 'mongoose';

/** Check a valid email address format */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/** Check phone is digits only, 10-15 chars */
export const isValidPhone = (phone) => {
  if (phone === null || phone === undefined) return false;
  const str = phone.toString().replace(/[\s\-\+]/g, '');
  return /^\d{10,15}$/.test(str);
};

/** Check a valid Mongoose ObjectId */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/** Latitude must be between -90 and 90 */
export const isValidLatitude = (lat) => {
  const n = parseFloat(lat);
  return !isNaN(n) && n >= -90 && n <= 90;
};

/** Longitude must be between -180 and 180 */
export const isValidLongitude = (lng) => {
  const n = parseFloat(lng);
  return !isNaN(n) && n >= -180 && n <= 180;
};

/** String is non-null and non-empty after trim */
export const isNotEmpty = (str) => {
  return typeof str === 'string' && str.trim().length > 0;
};

/** Check parseable date */
export const isValidDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
};

/** Date is strictly in the future */
export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) > new Date();
};

/** Password is at least minLen characters */
export const isValidPassword = (password, minLen = 6) => {
  return typeof password === 'string' && password.length >= minLen;
};

/** Name between 2 and 80 chars */
export const isValidName = (name) => {
  return isNotEmpty(name) && name.trim().length >= 2 && name.trim().length <= 80;
};

/** Gender must be one of the allowed values */
export const isValidGender = (gender) => {
  return ['male', 'female', 'other'].includes(gender);
};

/** Role must be one of the allowed values */
export const isValidRole = (role) => {
  return ['admin', 'store-owner', 'customer'].includes(role);
};

/** Announcement type must be one of the allowed values */
export const isValidAnnouncementType = (type) => {
  return ['info', 'warning', 'success', 'danger'].includes(type);
};

/** Quantity must be a positive integer */
export const isPositiveInt = (val) => {
  const n = Number(val);
  return Number.isInteger(n) && n > 0;
};

/** Price must be non-negative number */
export const isNonNegativeNumber = (val) => {
  const n = Number(val);
  return !isNaN(n) && n >= 0;
};

/**
 * Build a 400 error response with a message and optional field details.
 * Usage: return validationError(res, 'Email is required', { field: 'email' });
 */
export const validationError = (res, message, details = null) => {
  const body = { title: 'Validation Error', code: 400, message };
  if (details) body.details = details;
  return res.status(400).json(body);
};
