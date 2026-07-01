//Not Continued
import asyncHandler from 'express-async-handler';
import {Store} from '../models/store.js';

// Create a new store
export const createStore = asyncHandler(async (req, res) => {
  const { owner, name, licenseNumber, contact, address } = req.body;

  const store = new Store({ owner, name, licenseNumber, contact, address });
  const savedStore = await store.save();

  res.status(201).json(savedStore);
});

// Get all stores
export const getStores = asyncHandler(async (req, res) => {
  const stores = await Store.find().populate('owner address');
  res.status(200).json(stores);
});

// Get a store by ID
export const getStorebyAuth = asyncHandler(async (req, res) => {
  const id  = req.user.store_id;
  const store = await Store.findById(id);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }
  
  res.status(200).json(store);
});

// Update a store
export const updateStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const updatedStore = await Store.findByIdAndUpdate(id, updatedData, { new: true });
  res.status(200).json(updatedStore);
});

// Update a store by ID
export const updateStoreById = asyncHandler(async (req, res) => {
  const { id } = req.user.store_id;
  const updatedData = req.body;

  const updatedStore = await Store.findByIdAndUpdate(id, updatedData, { new: true });
  res.status(200).json(updatedStore);
});

// Delete a store
export const deleteStore = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Store.findByIdAndDelete(id);
  res.status(204).send();
});
