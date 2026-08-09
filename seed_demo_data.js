// seed_demo_data.js
//
// Populates just enough demo data for the frontend's map and prescription
// scanner features to have something to find. Safe to run more than once —
// every insert is an upsert keyed on a stable field, so re-running just
// updates the same records instead of creating duplicates.
//
// Usage:
//   node seed_demo_data.js
//
// Requires MONGODB_URI (or the legacy `uri` variable) to be set, same as
// the main app — either in your environment or a .env file in this folder.

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import { User } from './models/user.js';
import { Store } from './models/store.js';
import { Medication } from './models/medicine.js';
import { Address } from './models/address.js';
import { inventory as Inventory } from './models/inventory.js';

const mongoUri = process.env.MONGODB_URI || process.env.uri;

if (!mongoUri) {
  console.error('Missing MongoDB connection string. Set MONGODB_URI (or `uri`) in your environment.');
  process.exit(1);
}

// These three names are hardcoded on the frontend's /prescription page as
// the demo templates it randomly picks between, so seeding exactly these
// is what makes "Scan standard templates" actually resolve to real data.
const DEMO_MEDICINES = [
  {
    name: 'Amoxicillin',
    composition: 'Amoxicillin Trihydrate',
    manufacturer: 'Cipla Ltd.',
    usage: 'Used to treat a wide range of bacterial infections, including chest, ear, and urinary tract infections.',
    precautions: 'Inform your doctor if you are allergic to penicillin. Complete the full course even if symptoms improve.',
  },
  {
    name: 'Metformin',
    composition: 'Metformin Hydrochloride',
    manufacturer: 'Sun Pharmaceutical Industries',
    usage: 'Used to control high blood sugar in people with type 2 diabetes, usually alongside diet and exercise.',
    precautions: 'Take with food to reduce stomach upset. Avoid excessive alcohol. Monitor kidney function periodically.',
  },
  {
    name: 'Paracetamol',
    composition: 'Acetaminophen',
    manufacturer: "GlaxoSmithKline (GSK)",
    usage: 'Used for the relief of mild to moderate pain and to reduce fever.',
    precautions: 'Do not exceed the recommended dose. Avoid other paracetamol-containing products at the same time.',
  },
];

// Adjust this to wherever you actually want demo results to show up —
// this defaults to Jaipur, which is also the frontend's hardcoded default
// map center in components/Map.tsx, so "Locate Near Me" during local
// testing (with a spoofed or real location nearby) will find it.
const DEMO_STORE_ADDRESS = {
  street: 'MI Road, Near Ajmeri Gate',
  city: 'Jaipur',
  state: 'Rajasthan',
  postalCode: '302001',
  country: 'India',
  latitude: 26.9124,
  longitude: 75.7873,
};

const SEED_OWNER_EMAIL = 'seed-store-owner@caresync.demo';

async function main() {
  await mongoose.connect(mongoUri, { dbName: 'CareSync' });
  console.log(`Connected to database: ${mongoose.connection.name}`);

  // 1. A store-owner user to own the demo store. Random password since
  //    nobody needs to log in as this account — it only exists to satisfy
  //    Store's required `owner` field.
  const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
  const owner = await User.findOneAndUpdate(
    { email: SEED_OWNER_EMAIL },
    {
      $setOnInsert: {
        name: 'Demo Store Owner',
        email: SEED_OWNER_EMAIL,
        passwordHash: randomPassword,
        role: 'store-owner',
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Store owner ready: ${owner.email} (${owner._id})`);

  // 2. The store itself.
  const store = await Store.findOneAndUpdate(
    { owner: owner._id },
    {
      $setOnInsert: {
        owner: owner._id,
        name: 'CareSync Demo Pharmacy',
        licenseNumber: 'DEMO-LIC-0001',
        contact: '+91-9999999999',
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Store ready: ${store.name} (${store._id})`);

  // 3. Its address — this is what /address/:city and /address/:lat/:lng
  //    (the map page) and the geospatial nearby-store lookup both query.
  const address = await Address.findOneAndUpdate(
    { store: store._id },
    {
      $setOnInsert: {
        store: store._id,
        ...DEMO_STORE_ADDRESS,
        location: {
          type: 'Point',
          coordinates: [DEMO_STORE_ADDRESS.longitude, DEMO_STORE_ADDRESS.latitude],
        },
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Address ready: ${address.street}, ${address.city} (${address._id})`);

  // 4. The three demo medicines.
  const medicineIds = [];
  for (const med of DEMO_MEDICINES) {
    const saved = await Medication.findOneAndUpdate(
      { name: med.name },
      { $setOnInsert: med },
      { upsert: true, new: true }
    );
    medicineIds.push(saved._id);
    console.log(`Medicine ready: ${saved.name} (${saved._id})`);
  }

  // 5. Inventory rows linking the store to each medicine, in stock, so the
  //    prescription scanner's nearby-store lookup has something to match.
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  for (const medicineId of medicineIds) {
    const row = await Inventory.findOneAndUpdate(
      { store: store._id, medicine: medicineId },
      {
        $setOnInsert: {
          store: store._id,
          medicine: medicineId,
          quantity: 50,
          expiryDate: oneYearFromNow,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Inventory ready: store ${store._id} x medicine ${medicineId} (qty ${row.quantity})`);
  }

  console.log('\nDone. Try the map (search city "Jaipur") and the prescription scanner templates now.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});