import { User } from '../models/user.js';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidName,
  isValidGender,
  isNotEmpty,
  validationError
} from '../utils/validators.js';

const register = asyncHandler(async (req, res) => {
  const { name, email, gender, password, phone } = req.body;

  // Required field presence
  if (!name || !email || !gender || !password || !phone) {
    return validationError(res, 'All fields are required: name, email, gender, password, phone.');
  }

  // Name validation
  if (!isValidName(name)) {
    return validationError(res, 'Name must be between 2 and 80 characters.');
  }

  // Email validation
  if (!isValidEmail(email)) {
    return validationError(res, 'Please provide a valid email address.');
  }

  // Gender validation
  if (!isValidGender(gender)) {
    return validationError(res, 'Gender must be one of: male, female, other.');
  }

  // Password strength validation
  if (!isValidPassword(password, 6)) {
    return validationError(res, 'Password must be at least 6 characters long.');
  }

  // Phone validation
  if (!isValidPhone(phone)) {
    return validationError(res, 'Phone number must be 10-15 digits.');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const user = new User({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    gender,
    passwordHash: hashedPassword,
    phone,
  });

  const check = await user.save();
  if (check) {
    res.status(201).json({
      message: `User Created ${user._id}`,
    });
  } else {
    throw new Error('MongoError');
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return validationError(res, 'Email and password are required.');
  }

  if (!isValidEmail(email)) {
    return validationError(res, 'Please provide a valid email address.');
  }

  if (!isNotEmpty(password)) {
    return validationError(res, 'Password cannot be empty.');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    if (user.isSuspended) {
      res.status(403);
      throw new Error('User account is suspended');
    }
    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role, store_id: user.store_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.status(200).json({
      message: 'User Logged In',
      token,
    });
  } else {
    throw new Error('ValidationError');
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return validationError(res, 'Email is required.');
  }
  if (!isValidEmail(email)) {
    return validationError(res, 'Please provide a valid email address.');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOtp = otp;
  user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  console.log(`[FORGOT PASSWORD] OTP for ${email}: ${otp}`);

  res.status(200).json({
    message: 'OTP sent successfully',
    otp: otp // Return OTP for local testing
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return validationError(res, 'Email, OTP, and new password are required.');
  }
  if (!isValidEmail(email)) {
    return validationError(res, 'Please provide a valid email address.');
  }
  if (!isValidPassword(newPassword, 6)) {
    return validationError(res, 'New password must be at least 6 characters long.');
  }
  if (!/^\d{6}$/.test(otp)) {
    return validationError(res, 'OTP must be a 6-digit number.');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const dbOtp = user.resetOtp ? user.resetOtp.toString().trim() : '';
  const requestOtp = otp.toString().trim();
  const isExpired = Date.now() > new Date(user.resetOtpExpires).getTime();

  if (!dbOtp || dbOtp !== requestOtp || isExpired) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  // Reset password
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  user.passwordHash = hashedPassword;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;

  await user.save();

  res.status(200).json({
    message: 'Password reset successfully'
  });
});

export { register, login, forgotPassword, resetPassword };