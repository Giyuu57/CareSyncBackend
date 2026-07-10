import mongoose from 'mongoose';
import './models/store.js';
import './models/medicine.js';
import './models/user.js';
import { Order } from './models/orders.js';

const uri;

async function main() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");
  const orders = await Order.find().populate('store medicines.medicine_id');
  console.log("Success! Found orders count:", orders.length);
  await mongoose.disconnect();
}

main().catch(console.error);
