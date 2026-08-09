import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: false },
  // Not required: users who sign up via Google never set a local password.
  passwordHash: { type: String, required: false },
  phone: { type: Number, required: false },
  // Set only for accounts created/linked via "Sign in with Google".
  // sparse: true lets many users have no googleId without violating uniqueness.
  googleId: { type: String, required: false, unique: true, sparse: true },
  role: { type: String, enum: ['admin', 'store-owner', 'customer'],default: 'customer'}, // Role-based access
  isSuspended: { type: Boolean, default: false },
  store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store',required: false },
  avatar: { type: String, required: false },
  bio: { type: String, required: false },
  dateOfBirth: { type: String, required: false },
  address: { type: String, required: false },
  resetOtp: { type: String, required: false },
  resetOtpExpires: { type: Date, required: false },
}, { timestamps: true ,strict: false});

export const User = mongoose.model('User', userSchema);