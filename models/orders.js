import { Schema, model } from 'mongoose';

const orderSchema = new Schema({
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    seller: { type: String},
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    orderType: { type: String, enum: ['b2b', 'b2c'], default: 'b2b' },
    medicines: [{
      medicine_id: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
      quantity: { type: Number, required: true },
      expiry: {type:Date, required:true },
      price: { type: Number, required: true },
      type: {type: String,enum:['new','renew'], required: false}
    }],
    totalItems: { type: Number, required: true },
    orderDate: { type: Date, default: Date.now },
    remarks: { type: String },
    status: { type: String, enum: ['pending', 'processed', 'completed', 'cancelled'], default: 'pending' },
  }, { timestamps: true });

  export const Order = model('Order', orderSchema);