import { Request } from '../models/request.js';
import { User } from '../models/user.js';
import { Store } from '../models/store.js';
import { Address } from '../models/address.js';
import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import {
  isNotEmpty,
  isValidPhone,
  isValidLatitude,
  isValidLongitude,
  validationError
} from '../utils/validators.js';

// Create a new request
const createRequest = asyncHandler(async (req, res) => {
  let { owner, name, licenseNumber, contact, address } = req.body;

  if (req.user.role !== 'admin') {
    owner = req.user.id;
  }

  // Required field validation
  if (!isNotEmpty(name)) {
    return validationError(res, 'Pharmacy/facility name is required.');
  }
  if (!isNotEmpty(licenseNumber)) {
    return validationError(res, 'License number is required.');
  }
  if (!isNotEmpty(contact)) {
    return validationError(res, 'Contact number is required.');
  }
  if (!isValidPhone(contact)) {
    return validationError(res, 'Contact must be a valid phone number (10-15 digits).');
  }

  // Address validation
  if (!address || typeof address !== 'object') {
    return validationError(res, 'Address object is required.');
  }
  const { latitude, longitude, street, city, state, postalCode, country } = address;

  if (!isNotEmpty(street)) {
    return validationError(res, 'Street address is required.');
  }
  if (!isNotEmpty(city)) {
    return validationError(res, 'City is required.');
  }
  if (!isNotEmpty(state)) {
    return validationError(res, 'State/region is required.');
  }
  if (!isNotEmpty(postalCode)) {
    return validationError(res, 'Postal code is required.');
  }
  if (!isNotEmpty(country)) {
    return validationError(res, 'Country is required.');
  }
  if (latitude === undefined || latitude === null || !isValidLatitude(latitude)) {
    return validationError(res, 'Latitude must be a number between -90 and 90.');
  }
  if (longitude === undefined || longitude === null || !isValidLongitude(longitude)) {
    return validationError(res, 'Longitude must be a number between -180 and 180.');
  }

  const request = new Request({ owner, name: name.trim(), licenseNumber: licenseNumber.trim(), contact, address });
  const savedRequest = await request.save();

  if (savedRequest) {
    res.status(201).json(savedRequest);
  } else {
    res.status(400);
    throw new Error('Invalid request data');
  }
});

// Get all requests
const getRequests = asyncHandler(async (req, res) => {
  const requests = await Request.find().populate('owner address');
  res.status(200).json(requests);
});

// Update a request
const updateRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status value
  const allowedStatuses = ['verified', 'rejected', 'pending'];
  if (!status || !allowedStatuses.includes(status)) {
    return validationError(res, `Status must be one of: ${allowedStatuses.join(', ')}.`);
  }

  if (status === 'verified') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const request = await Request.findById(id);
      if (!request) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Request not found' });
      }

      const updatedRequest = await Request.findByIdAndUpdate(
        id,
        { status: 'completed' },
        { new: true, session }
      );
      const updatedStore = await Store.create([{
        owner: request.owner,
        name: request.name,
        licenseNumber: request.licenseNumber,
        contact: request.contact,
      }], { session });

      const address = await Address.create([{
        store: updatedStore[0]._id,
        latitude: request.address.latitude,
        longitude: request.address.longitude,
        street: request.address.street,
        city: request.address.city,
        state: request.address.state,
        postalCode: request.address.postalCode,
        country: request.address.country,
        location: {
          type: 'Point',
          coordinates: [request.address.longitude, request.address.latitude]
        },
      }], { session });

      const updateUser = await User.findByIdAndUpdate(
        request.owner,
        { role: 'store-owner', store_id: updatedStore[0]._id },
        { new: true, session }
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json(updatedRequest);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw new Error('CastError');
    }
  } else {
    const updatedRequest = await Request.findByIdAndUpdate(
      id,
      status === 'rejected' ? { status: 'cancelled' } : { status: 'pending' },
      { new: true }
    );
    return res.status(200).json(updatedRequest);
  }
});

const getAuthRequest = asyncHandler(async (req, res) => {
  const request = await Request.find({ owner: req.user.id });
  res.status(200).json(request);
});

// Delete a request
const deleteRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const request = await Request.findByIdAndDelete(id);
  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }
  res.status(200).json({ message: 'Request deleted successfully' });
});

export { createRequest, getRequests, updateRequest, getAuthRequest, deleteRequest };