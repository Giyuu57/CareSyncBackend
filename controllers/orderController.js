import asyncHandler from 'express-async-handler';
import { Order } from '../models/orders.js';
import mongoose from 'mongoose';
import { inventory } from '../models/inventory.js';
import {
  isValidObjectId,
  isPositiveInt,
  isNonNegativeNumber,
  isValidDate,
  isNotEmpty,
  validationError
} from '../utils/validators.js';

/**
 * Validate a medicines array — shared between B2B and B2C order creation
 */
const validateMedicinesArray = (medicines, res) => {
  if (!Array.isArray(medicines) || medicines.length === 0) {
    validationError(res, 'At least one medicine is required in the order.');
    return false;
  }
  for (let i = 0; i < medicines.length; i++) {
    const m = medicines[i];
    if (!isValidObjectId(m.medicine_id)) {
      validationError(res, `Medicine at index ${i}: invalid medicine_id format.`);
      return false;
    }
    if (!isPositiveInt(m.quantity)) {
      validationError(res, `Medicine at index ${i}: quantity must be a positive integer.`);
      return false;
    }
    if (!isNonNegativeNumber(m.price)) {
      validationError(res, `Medicine at index ${i}: price must be a non-negative number.`);
      return false;
    }
    if (!isValidDate(m.expiry)) {
      validationError(res, `Medicine at index ${i}: expiry must be a valid date.`);
      return false;
    }
  }
  return true;
};

// Auth create order (B2B - store owner)
export const createOrderAuth = asyncHandler(async (req, res) => {
  const { seller, medicines, totalItems, status } = req.body;

  if (!validateMedicinesArray(medicines, res)) return;

  if (!isPositiveInt(totalItems)) {
    return validationError(res, 'totalItems must be a positive integer.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = new Order({ 
      store: req.user.store_id, 
      seller, 
      medicines, 
      totalItems, 
      status: 'completed',
      orderType: 'b2b'
    });
    const savedOrder = await order.save({ session });

    for (const data of medicines) {
      const { medicine_id, quantity, expiry, type } = data;

      if (type === 'new') {
        const inventoryData = new inventory({
          store: req.user.store_id,
          medicine: medicine_id,
          quantity,
          expiryDate: expiry,
          order: savedOrder._id
        });
        await inventoryData.save({ session });
      } else {
        await inventory.findOneAndUpdate(
          { store: req.user.store_id, medicine: medicine_id },
          { quantity, expiryDate: expiry },
          { new: true, session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(savedOrder);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
});

// Auth get orders
export const getOrdersAuth = asyncHandler(async (req, res) => {
  const orders = await Order.find({ store: req.user.store_id, orderType: 'b2b' }).populate('medicines.medicine_id');
  res.status(200).json(orders);
});


// Dev commands
export const addOrder = asyncHandler(async (req, res) => {
  const { store, seller, medicines, totalItems, remarks } = req.body;

  if (!isValidObjectId(store)) {
    return validationError(res, 'Invalid store ID.');
  }
  if (!validateMedicinesArray(medicines, res)) return;
  if (!isPositiveInt(totalItems)) {
    return validationError(res, 'totalItems must be a positive integer.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = new Order({ 
      store, 
      seller, 
      medicines, 
      totalItems, 
      remarks, 
      status: 'completed',
      orderType: 'b2b'
    });
    const savedOrder = await order.save({ session });

    for (const data of medicines) {
      const { medicine_id, quantity, expiry, type } = data;

      if (type === 'new') {
        const inv = new inventory({
          store,
          medicine: medicine_id,
          quantity,
          expiryDate: expiry,
          order: savedOrder._id,
        });
        await inv.save({ session });
      } else {
        await inventory.findOneAndUpdate(
          { store, medicine: medicine_id },
          { $inc: { quantity: quantity }, expiryDate: expiry },
          { new: true, session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(savedOrder);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ error: err.message });
  }
});

// Get all orders
export const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('store medicines.medicine_id');
  res.status(200).json(orders);
});

// Update an order
export const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, ...rest } = req.body;

  const allowedStatuses = ['pending', 'processed', 'completed', 'cancelled'];
  if (status && !allowedStatuses.includes(status)) {
    return validationError(res, `Status must be one of: ${allowedStatuses.join(', ')}.`);
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Prevent reverting a completed order
  if (order.status === 'completed' && status && status !== 'completed') {
    return validationError(res, 'Cannot change status of a completed order.');
  }

  // If status is transitioning to completed, deduct quantity from inventory for B2C order
  if (status === 'completed' && order.status !== 'completed' && order.orderType === 'b2c') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      for (const item of order.medicines) {
        const { medicine_id, quantity } = item;

        const invItem = await inventory.findOne({
          store: order.store,
          medicine: medicine_id
        }).session(session);

        if (!invItem || invItem.quantity < quantity) {
          throw new Error(`Insufficient inventory for medicine. Required: ${quantity}, Available: ${invItem ? invItem.quantity : 0}`);
        }

        invItem.quantity -= quantity;
        await invItem.save({ session });
      }

      order.status = 'completed';
      if (rest.remarks) order.remarks = rest.remarks;
      const savedOrder = await order.save({ session });

      await session.commitTransaction();
      session.endSession();
      return res.status(200).json(savedOrder);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      throw err;
    }
  }

  const updatedOrder = await Order.findByIdAndUpdate(id, req.body, { new: true });
  res.status(200).json(updatedOrder);
});

// Delete an order
export const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Order.findByIdAndDelete(id);
  res.status(204).send();
});

// Create Customer B2C Order Request
export const createCustomerOrderAuth = asyncHandler(async (req, res) => {
  const { store, medicines, totalItems, remarks } = req.body;

  if (!store) {
    return validationError(res, 'Store ID is required.');
  }
  if (!isValidObjectId(store)) {
    return validationError(res, 'Invalid store ID format.');
  }
  if (!validateMedicinesArray(medicines, res)) return;
  if (!isPositiveInt(totalItems)) {
    return validationError(res, 'totalItems must be a positive integer.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let canComplete = true;
    const inventoryItems = [];

    // Verify stock availability for each requested item
    for (const item of medicines) {
      const { medicine_id, quantity } = item;
      const invItem = await inventory.findOne({
        store,
        medicine: medicine_id
      }).session(session);

      if (!invItem || invItem.quantity < quantity) {
        canComplete = false;
        break;
      }
      inventoryItems.push({ item: invItem, quantity });
    }

    let finalStatus = 'cancelled';
    let finalRemarks = remarks;

    if (canComplete) {
      // Deduct inventory stock since all items are in stock
      for (const inv of inventoryItems) {
        inv.item.quantity -= inv.quantity;
        await inv.item.save({ session });
      }
      finalStatus = 'completed';
      if (!finalRemarks) {
        finalRemarks = 'Auto-approved: Sufficient inventory stock available.';
      } else {
        finalRemarks = `${remarks} (Auto-approved)`;
      }
    } else {
      finalStatus = 'cancelled';
      finalRemarks = remarks 
        ? `${remarks} (Auto-cancelled: Insufficient inventory stock)` 
        : 'Auto-cancelled: Insufficient inventory stock.';
    }

    const order = new Order({
      store,
      customer: req.user.id,
      orderType: 'b2c',
      medicines,
      totalItems,
      remarks: finalRemarks,
      status: finalStatus
    });

    const savedOrder = await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(savedOrder);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400);
    throw err;
  }
});

// Get Customer B2C Orders (Filtered by Role)
export const getCustomerOrdersAuth = asyncHandler(async (req, res) => {
  if (req.user.role === 'customer') {
    const orders = await Order.find({ customer: req.user.id, orderType: 'b2c' })
      .populate('medicines.medicine_id')
      .populate('store');
    res.status(200).json(orders);
  } else if (req.user.role === 'store-owner') {
    const orders = await Order.find({ store: req.user.store_id, orderType: 'b2c' })
      .populate('medicines.medicine_id')
      .populate('customer');
    res.status(200).json(orders);
  } else {
    res.status(403);
    throw new Error('Unauthorized');
  }
});
