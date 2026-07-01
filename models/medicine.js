import { Schema, model } from 'mongoose';

const medicineSchema = new Schema(
  {
    name: { type: String, required: true },
    composition: { type: String, required: true },
    manufacturer: { type: String, required: true },
    usage: { type: String, required: true },
    precautions: { type: String }, 
  },
  {
    timestamps: true,
    strict: false,
  }
);

// Create the model
export const Medication = model('Medicine', medicineSchema);

 
 /* const medicationSchema = new Schema({
    name: { type: String, required: true },
    dosage: { type: String },
    form: { type: String, required: true }, // e.g., tablet, liquid
    indications: { type: String }, // Conditions treated
    frequency: { type: String, required: true }, // e.g., daily
    sideEffects: [{ type: String }],
    precautions: [{ type: String }],
    storageInstructions: { type: String },// Doctor's name
    createdAt: { type: Date, default: Date.now }
  });
 */