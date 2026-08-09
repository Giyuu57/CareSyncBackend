// fix_request_owner_index.js
//
// One-time migration: your live database still has the OLD full unique
// index on Request.owner (from before this fix), even after deploying the
// updated models/request.js. Mongoose does not automatically drop/replace
// an existing index just because the schema definition changed — it will
// only add missing indexes, and can silently leave the old (wrong) one in
// place, or error on startup if the definitions conflict.
//
// This script drops the old index and lets Mongoose recreate the correct
// partial one (via autoIndex on next app startup, or immediately below).
//
// Usage:
//   node fix_request_owner_index.js
//
// Safe to run more than once — if the old index is already gone, it just
// logs that and moves on.

import 'dotenv/config';
import mongoose from 'mongoose';
import { Request } from './models/request.js';

const mongoUri = process.env.MONGODB_URI || process.env.uri;

if (!mongoUri) {
  console.error('Missing MongoDB connection string. Set MONGODB_URI (or `uri`) in your environment.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(mongoUri, { dbName: 'CareSync' });
  console.log(`Connected to database: ${mongoose.connection.name}`);

  const collection = mongoose.connection.collection('requests');
  const existingIndexes = await collection.indexes();
  console.log('Current indexes on `requests`:', JSON.stringify(existingIndexes, null, 2));

  const oldOwnerIndex = existingIndexes.find(
    (idx) => idx.key && Object.keys(idx.key).length === 1 && idx.key.owner === 1 && !idx.partialFilterExpression
  );

  if (oldOwnerIndex) {
    console.log(`Dropping stale full-unique index: ${oldOwnerIndex.name}`);
    await collection.dropIndex(oldOwnerIndex.name);
  } else {
    console.log('No stale full-unique owner index found — nothing to drop.');
  }

  // Recreate indexes from the current schema (adds the new partial index
  // if it isn't already there; harmless no-op for anything unchanged).
  await Request.syncIndexes();
  console.log('Indexes synced. Final state:', JSON.stringify(await collection.indexes(), null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Index migration failed:', err);
  process.exit(1);
});