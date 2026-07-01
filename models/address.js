import { Schema, model } from 'mongoose';

const addressSchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },

  // Optional GeoJSON Point field
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number],   // [longitude, latitude] as floats
      required: false
    }
  }
}, { timestamps: true });

// Add 2dsphere index if location exists
addressSchema.index({ location: '2dsphere' });


export const Address = model('Address', addressSchema);