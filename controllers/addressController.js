import asyncHandler from 'express-async-handler';
import { Address } from '../models/address.js';
import {
  isNotEmpty,
  isValidLatitude,
  isValidLongitude,
  validationError
} from '../utils/validators.js';

// Get address by Auth
export const getAddressAuth = asyncHandler(async (req, res) => {
  const address = await Address.findById(req.user.address);
  res.status(200).json(address);
});

// Update address by Auth
export const updateAddressAuth = asyncHandler(async (req, res) => {
  const { id } = req.user.address;
  const updatedData = req.body;

  const updatedAddress = await Address.findByIdAndUpdate(id, updatedData, { new: true });
  res.status(200).json(updatedAddress);
});

// Get address by filter
export const getAddress = asyncHandler(async (req, res) => {
  const filter = req.query;
  const address = await Address.find(filter);
  res.status(200).json(address);
});

// Create a new address
export const createAddress = asyncHandler(async (req, res) => {
  const { latitude, longitude, street, city, state, postalCode, country } = req.body;

  if (!isValidLatitude(latitude)) {
    return validationError(res, 'Latitude must be a number between -90 and 90.');
  }
  if (!isValidLongitude(longitude)) {
    return validationError(res, 'Longitude must be a number between -180 and 180.');
  }
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

  const address = new Address({ latitude, longitude, street, city, state, postalCode, country });
  const savedAddress = await address.save();

  res.status(201).json(savedAddress);
});

// Get address by Auth with store ID
export const getAddressByAuthWithStoreID = asyncHandler(async (req, res) => {
  const store_id = req.user.store_id;

  if (!store_id) {
    return res.status(400).json({ message: 'Store ID is required' });
  }

  const address = await Address.findOne({ store: store_id });

  if (!address) {
    return res.status(404).json({ message: 'Address not found for the given store ID' });
  }

  res.status(200).json(address);
});

// Update address by Auth with store ID
export const updateAddressByAuthWithStoreID = asyncHandler(async (req, res) => {
  const { store_id } = req.user;

  if (!store_id) {
    return res.status(400).json({ message: 'Store ID is required' });
  }

  // Validate coordinate fields if provided
  const { latitude, longitude } = req.body;
  if (latitude !== undefined && !isValidLatitude(latitude)) {
    return validationError(res, 'Latitude must be a number between -90 and 90.');
  }
  if (longitude !== undefined && !isValidLongitude(longitude)) {
    return validationError(res, 'Longitude must be a number between -180 and 180.');
  }

  const address = await Address.findOne({ store: store_id });

  if (!address) {
    return res.status(404).json({ message: 'Address not found for the given store ID' });
  }

  const updatedData = req.body;

  const updatedAddress = await Address.findByIdAndUpdate(
    address._id,
    { ...updatedData, store: store_id },
    { new: true }
  );

  res.status(200).json(updatedAddress);
});

// Get all addresses
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find();
  res.status(200).json(addresses);
});

// Update an address
export const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const updatedAddress = await Address.findByIdAndUpdate(id, updatedData, { new: true });
  res.status(200).json(updatedAddress);
});

// Delete an address
export const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Address.findByIdAndDelete(id);
  res.status(204).send();
});

export const getAddressByCity = asyncHandler(async (req, res) => {
  const { city } = req.params;

  if (!isNotEmpty(city) || city.trim().length < 2) {
    return validationError(res, 'City name must be at least 2 characters.');
  }
  if (!/^[a-zA-Z\s\-']+$/.test(city.trim())) {
    return validationError(res, 'City name must contain only letters, spaces, or hyphens.');
  }

  try {
    const addresses = await Address.find({ city: { $regex: new RegExp(`^${city.trim()}$`, 'i') } }).populate('store');
    if (addresses.length === 0) {
      return res.status(200).json({ message: 'No places found' });
    }
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving addresses', error });
  }
});

// Get address by nearby lat/long
export const getAddressByLatLong = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.params;
  const radius = 10; // Radius in kilometers

  if (!isValidLatitude(latitude)) {
    return validationError(res, 'Latitude must be a number between -90 and 90.');
  }
  if (!isValidLongitude(longitude)) {
    return validationError(res, 'Longitude must be a number between -180 and 180.');
  }

  const addresses = await Address.find({
    location: {
      $geoWithin: {
        $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], radius / 6378.1]
      }
    }
  }).populate('store');

  if (addresses.length === 0) {
    return res.status(200).json({ message: 'No places found' });
  }
  res.status(200).json(addresses);
});

export async function updateAllAddressesWithLocation() {
  try {
    const addresses = await Address.find({
      location: { $exists: false }
    });

    const bulkOps = addresses.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            location: {
              type: 'Point',
              coordinates: [doc.longitude, doc.latitude],
            },
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      const result = await Address.bulkWrite(bulkOps);
      console.log(`✅ Updated ${result.modifiedCount} addresses with location`);
    } else {
      console.log('✅ All addresses already have location');
    }
  } catch (error) {
    console.error('❌ Error updating addresses:', error);
  }
}