import { Schema, model } from 'mongoose';

const requests = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true , unique: true},
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

export const Request = model('Request', requests);