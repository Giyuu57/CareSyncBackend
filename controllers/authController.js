import { User } from '../models/user.js';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
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
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// Created lazily (not at import time) so a missing GOOGLE_CLIENT_ID during
// local dev doesn't crash the whole server on startup — it only breaks
// this one route, with a clear error, the first time it's actually called.
let googleClient;
const getGoogleClient = () => {
  if (!googleClient) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not set on the server.');
    }
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
};

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return validationError(res, 'Google credential is required.');
  }

  // Verifies the JWT's signature, expiry, issuer, and that it was issued
  // for OUR client ID — this is what prevents a forged/replayed token from
  // a different Google app being accepted here.
  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    res.status(401);
    throw new Error('Invalid Google credential.');
  }

  if (!payload || !payload.email) {
    res.status(401);
    throw new Error('Invalid Google credential.');
  }

  // Google verifies the email itself for its own accounts, so this is
  // trustworthy even though we skip our own email-format check here.
  const email = payload.email.trim().toLowerCase();

  let user = await User.findOne({ email });

  if (user) {
    if (user.isSuspended) {
      res.status(403);
      throw new Error('User account is suspended');
    }
    // Existing local-password account signing in with Google for the
    // first time: link it instead of creating a duplicate user.
    if (!user.googleId) {
      user.googleId = payload.sub;
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      await user.save();
    }
  } else {
    user = await User.create({
      name: payload.name || email.split('@')[0],
      email,
      googleId: payload.sub,
      avatar: payload.picture,
    });
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

  let otp;
  if (user) {
    // Generate 6-digit OTP
    otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // TODO before going live: send `otp` by email via a real provider
    // (SendGrid, SES, Nodemailer+SMTP, etc). Until that's wired up, this
    // only logs server-side so OTPs never leave the backend.
    console.log(`[FORGOT PASSWORD] OTP for ${email}: ${otp}`);
  }

  // Respond identically whether or not the account exists, and never
  // include the OTP in the HTTP response — otherwise anyone who knows an
  // email address (real account or not) could enumerate accounts or reset
  // a password without ever seeing the inbox.
  const response = { message: 'If an account exists for that email, an OTP has been sent.' };
  if (process.env.NODE_ENV !== 'production' && user) {
    // Local-dev convenience only, never present in production responses.
    response.otp = otp;
  }

  res.status(200).json(response);
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

export { register, login, googleLogin, forgotPassword, resetPassword };