import { User } from '../models/user.js';
import asyncHandler from 'express-async-handler';
import {
  isValidPhone,
  isValidName,
  isValidGender,
  validationError
} from '../utils/validators.js';

// Auth Get user profile
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  user.passwordHash = undefined;
  res.status(200).json(user);
});

// Auth Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, gender, phone } = req.body;

  if (!name || !gender || !phone) {
    return validationError(res, 'Name, gender, and phone are required.');
  }
  if (!isValidName(name)) {
    return validationError(res, 'Name must be between 2 and 80 characters.');
  }
  if (!isValidGender(gender)) {
    return validationError(res, 'Gender must be one of: male, female, other.');
  }
  if (!isValidPhone(phone)) {
    return validationError(res, 'Phone number must be 10-15 digits.');
  }

  const updateData = {
    name: name.trim(),
    gender,
    phone,
  };

  if (req.body.avatar !== undefined) updateData.avatar = req.body.avatar;
  if (req.body.bio !== undefined) updateData.bio = req.body.bio;
  if (req.body.dateOfBirth !== undefined) updateData.dateOfBirth = req.body.dateOfBirth;
  if (req.body.address !== undefined) updateData.address = req.body.address;

  const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });
  res.status(200).json(user);
});

export { getUserProfile, updateUserProfile };

// Dev controller to create a user
const createUser = asyncHandler(async (req, res) => {
  const { name, email, gender, passwordHash, phone, role } = req.body;

  const user = new User({ name, email, gender, passwordHash, phone, role });
  const savedUser = await user.save();

  res.status(201).json(savedUser);
});

// Get all users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});

// Get a user
const getUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.findById(id);
    res.status(200).json(user);
  } catch (error) {
    throw new Error('NotFoundError');
  }
});

// Update a user
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const updatedUser = await User.findByIdAndUpdate(id, updatedData, { new: true });
  res.status(200).json(updatedUser);
});

// Delete a user
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndDelete(id);
  res.status(204).send();
});

export { createUser, getUser, getUsers, updateUser, deleteUser };