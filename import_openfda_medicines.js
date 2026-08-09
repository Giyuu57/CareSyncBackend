// import_openfda_medicines.js
//
// Bulk-imports real medicine records from the OpenFDA drug label API into
// your local Medicine collection, so local search (source=careSync) has a
// real, broad catalog to match against instead of just a handful of demo
// entries.
//
// This ONLY imports medicine metadata (name/composition/manufacturer/
// usage/precautions). It does NOT create stores, addresses, or inventory —
// OpenFDA has no location data. A medicine imported here will show up in
// medicine search, but won't appear in "nearby stores with this medicine"
// results until some store's Inventory is linked to it.
//
// Usage:
//   node import_openfda_medicines.js [totalToImport]
//
//   node import_openfda_medicines.js          # imports 1000 (default)
//   node import_openfda_medicines.js 5000      # imports up to 5000
//
// Requires MONGODB_URI (or `uri`) in your environment/`.env`, same as the
// main app. OPENFDA_API_KEY (or OPENFDA_KEY) is optional but strongly
// recommended — OpenFDA allows 240 requests/min & 120,000/day with a free
// key, vs only 40/min & 1,000/day without one. Get one free at
// https://open.fda.gov/apis/authentication/

import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import { Medication } from './models/medicine.js';

const mongoUri = process.env.MONGODB_URI || process.env.uri;
const OPENFDA_API_KEY = process.env.OPENFDA_API_KEY || process.env.OPENFDA_KEY;

if (!mongoUri) {
  console.error('Missing MongoDB connection string. Set MONGODB_URI (or `uri`) in your environment.');
  process.exit(1);
}

const PAGE_SIZE = 100; // OpenFDA's max `limit` per request.
const TOTAL_TO_IMPORT = parseInt(process.argv[2], 10) || 1000;
// Conservative delay between requests so we stay well under rate limits
// even without an API key (40/min ≈ 1 every 1.5s; this leaves headroom).
const DELAY_MS = OPENFDA_API_KEY ? 300 : 1600;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Maps one OpenFDA drug label result to our local Medicine schema shape.
// Returns null if the record is missing fields we require.
function mapOpenFdaRecord(item) {
  const name = item.openfda?.brand_name?.[0] || item.openfda?.generic_name?.[0];
  const composition = item.openfda?.generic_name?.[0];
  const manufacturer = item.openfda?.manufacturer_name?.[0];
  const usage = item.indications_and_usage?.[0];

  if (!name || !composition || !manufacturer || !usage) {
    return null; // Skip incomplete records rather than saving junk data.
  }

  return {
    name,
    composition,
    manufacturer,
    usage,
    precautions: item.warnings?.[0] || item.precautions?.[0] || undefined,
  };
}

async function fetchPage(skip) {
  const response = await axios.get('https://api.fda.gov/drug/label.json', {
    params: {
      limit: PAGE_SIZE,
      skip,
      api_key: OPENFDA_API_KEY,
    },
  });
  return response.data.results || [];
}

async function main() {
  await mongoose.connect(mongoUri, { dbName: 'CareSync' });
  console.log(`Connected to database: ${mongoose.connection.name}`);

  if (!OPENFDA_API_KEY) {
    console.warn(
      'No OPENFDA_API_KEY/OPENFDA_KEY set — running at the unauthenticated rate limit (40 req/min, 1000/day). This will be slow for large imports.'
    );
  }

  let skip = 0;
  let imported = 0;
  let skippedIncomplete = 0;
  let skippedDuplicate = 0;
  const seenNames = new Set();

  while (imported < TOTAL_TO_IMPORT) {
    let page;
    try {
      page = await fetchPage(skip);
    } catch (err) {
      // OpenFDA returns 404 once you page past the end of the result set —
      // that's expected, not a failure, so just stop.
      if (err.response?.status === 404) {
        console.log('Reached the end of OpenFDA results.');
        break;
      }
      if (err.response?.status === 429) {
        console.warn('Rate limited — waiting 30s before retrying...');
        await sleep(30000);
        continue; // Retry the same page.
      }
      console.error(`Request failed at skip=${skip}:`, err.message);
      break;
    }

    if (page.length === 0) {
      console.log('No more results.');
      break;
    }

    for (const item of page) {
      const mapped = mapOpenFdaRecord(item);
      if (!mapped) {
        skippedIncomplete++;
        continue;
      }

      const key = mapped.name.toLowerCase();
      if (seenNames.has(key)) {
        skippedDuplicate++;
        continue;
      }
      seenNames.add(key);

      await Medication.findOneAndUpdate(
        { name: mapped.name },
        { $setOnInsert: mapped },
        { upsert: true }
      );
      imported++;

      if (imported >= TOTAL_TO_IMPORT) break;
    }

    skip += PAGE_SIZE;
    console.log(
      `Progress: ${imported}/${TOTAL_TO_IMPORT} imported, ${skippedIncomplete} incomplete skipped, ${skippedDuplicate} duplicates skipped (skip=${skip})`
    );

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. Imported ${imported} medicines into the local database.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});