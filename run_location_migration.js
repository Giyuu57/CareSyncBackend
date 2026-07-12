import 'dotenv/config';
import mongoose from 'mongoose';
import { updateAllAddressesWithLocation } from './controllers/addressController.js';

const uri = process.env.uri;

if (!uri) {
  console.error('Missing "uri" environment variable. Set it in your .env file before running this script.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri, { dbName: 'CareSync' });
  console.log('Connected to database.');

  // Backfills the `location` GeoJSON field on any address that has
  // latitude/longitude but is missing `location` — this is what the
  // nearby-search / map endpoints actually query against.
  await updateAllAddressesWithLocation();

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});