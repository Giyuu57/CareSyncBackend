import { inventory } from '../models/inventory.js';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { Address } from '../models/address.js';
import {
  isValidObjectId,
  isPositiveInt,
  isValidDate,
  isFutureDate,
  validationError
} from '../utils/validators.js';

// Auth create inventory
// @desc    Create a new inventory item
// @route   POST /api/inventory
// @access  Private (store-owner)
export const createinventoryAuth = asyncHandler(async (req, res) => {
  const { medicine, quantity, expiryDate, order } = req.body;

  if (!medicine || !isValidObjectId(medicine)) {
    return validationError(res, 'A valid medicine ID is required.');
  }
  if (!isPositiveInt(quantity)) {
    return validationError(res, 'Quantity must be a positive integer.');
  }
  if (!expiryDate || !isValidDate(expiryDate)) {
    return validationError(res, 'A valid expiry date is required.');
  }
  if (!isFutureDate(expiryDate)) {
    return validationError(res, 'Expiry date must be in the future.');
  }

  const data = new inventory({ store: req.user.store_id, medicine, quantity, expiryDate, order });
  const savedinventory = await data.save();

  res.status(201).json(savedinventory);
});

// Auth get inventory
// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private (store-owner)
export const getinventoryAuth = asyncHandler(async (req, res) => {
  const data = await inventory.find({ store: req.user.store_id }).populate('medicine');
  res.status(200).json(data);
});

// Auth update inventory
// @desc    Update an inventory item
// @route   PUT /api/inventory/:id
// @access  Private (store-owner)
export const updateinventoryAuth = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (updatedData.quantity !== undefined && !isPositiveInt(updatedData.quantity)) {
    return validationError(res, 'Quantity must be a positive integer.');
  }
  if (updatedData.expiryDate !== undefined) {
    if (!isValidDate(updatedData.expiryDate)) {
      return validationError(res, 'A valid expiry date is required.');
    }
    if (!isFutureDate(updatedData.expiryDate)) {
      return validationError(res, 'Expiry date must be in the future.');
    }
  }

  const updatedinventory = await inventory.findOneAndUpdate(
    { _id: id, store: req.user.store_id },
    updatedData,
    { new: true }
  );

  if (!updatedinventory) {
    res.status(404);
    throw new Error('Inventory item not found or not owned by your store.');
  }

  res.status(200).json(updatedinventory);
});

// Auth delete inventory
// @desc    Delete an inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (store-owner)
export const deleteinventoryAuth = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await inventory.findOneAndDelete({ _id: id, store: req.user.store_id });
  if (!result) {
    res.status(404);
    throw new Error('Inventory item not found');
  }
  res.status(204).send();
});

// Dev commands
export const createinventory = asyncHandler(async (req, res) => {
  const { store, medicine, quantity, expiryDate, order } = req.body;

  if (!isValidObjectId(medicine)) {
    return validationError(res, 'A valid medicine ID is required.');
  }
  if (!isPositiveInt(quantity)) {
    return validationError(res, 'Quantity must be a positive integer.');
  }
  if (!isValidDate(expiryDate)) {
    return validationError(res, 'A valid expiry date is required.');
  }

  const data = new inventory({ store, medicine, quantity, expiryDate, order });
  const savedinventory = await data.save();

  res.status(201).json(savedinventory);
});

export const getinventory = asyncHandler(async (req, res) => {
  const data = await inventory.find().populate('store medicine order');
  res.status(200).json(data);
});

export const updateinventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const updatedinventory = await inventory.findByIdAndUpdate(id, updatedData, { new: true });
  res.status(200).json(updatedinventory);
});

export const deleteinventory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await inventory.findByIdAndDelete(id);
  res.status(204).send();
});

export const getStoresWithMedicineNearby = asyncHandler(async (req, res) => {
  const { medicine, lat, lng, radius = 5 } = req.query;

  if (!medicine || !lat || !lng) {
    return validationError(res, 'medicine, lat, and lng query parameters are required.');
  }
  if (!isValidObjectId(medicine)) {
    return validationError(res, 'Invalid medicine ID format.');
  }
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return validationError(res, 'lat must be a number between -90 and 90.');
  }
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return validationError(res, 'lng must be a number between -180 and 180.');
  }

  try {
    let searchRadius = parseFloat(radius);

    const buildPipeline = (rad) => [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNum, latNum] },
          distanceField: 'distance',
          maxDistance: rad * 1000,
          spherical: true,
          query: {}
        }
      },
      {
        $lookup: {
          from: 'inventories',
          localField: 'store',
          foreignField: 'store',
          as: 'inventoryData',
        },
      },
      {
        $unwind: {
          path: '$inventoryData',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'inventoryData.medicine': new mongoose.Types.ObjectId(medicine),
          'inventoryData.quantity': { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'store',
          foreignField: '_id',
          as: 'storeDetails',
        },
      },
      {
        $unwind: {
          path: '$storeDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          store: 1,
          storeDetails: 1,
          medicine: '$inventoryData.medicine',
          quantity: '$inventoryData.quantity',
          expiryDate: '$inventoryData.expiryDate',
          distance: 1,
          'storeAddress.street': '$street',
          'storeAddress.city': '$city',
          'storeAddress.state': '$state',
          'storeAddress.postalCode': '$postalCode',
          'storeAddress.country': '$country',
          'storeAddress.location': '$location',
          'storeAddress.latitude': '$latitude',
          'storeAddress.longitude': '$longitude',
        },
      },
    ];

    let fullInventory = await Address.aggregate(buildPipeline(searchRadius));

    // Fallback: If not found in the initial radius (e.g. 20km), expand search up to 35km
    if (fullInventory.length === 0 && searchRadius < 35) {
      searchRadius = 35;
      fullInventory = await Address.aggregate(buildPipeline(searchRadius));
    }

    if (fullInventory.length === 0) {
      return res.status(404).json({ message: 'No nearby stores found with this medicine' });
    }

    res.status(200).json(fullInventory);
  } catch (error) {
    console.error('Error in getStoresWithMedicineNearby:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});