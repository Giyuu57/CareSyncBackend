import { Schema, model } from 'mongoose';

const requests = new Schema({
    // NOT globally unique: a user must be able to submit a new request
    // after a previous one was rejected (or even after a prior store was
    // removed). The actual business rule — "only one PENDING request at a
    // time" — is enforced below via a partial unique index instead, which
    // also backs up the equivalent check already done in the frontend/
    // checkPendingRequests flow at the database level.
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true , unique : true}, // Pharmacy-specific
    contact: { type: String, required: true },
    address: {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
          street: { type: String, required: true },
          city: { type: String, required: true },
          state: { type: String, required: true },
          postalCode: { type: String, required: true },
          country: { type: String, required: true }
         },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    }, { timestamps: true });

// Enforces "one pending request per user" at the DB level without blocking
// a user from ever submitting again once that request is resolved.
requests.index(
  { owner: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export const Request = model('Request', requests);