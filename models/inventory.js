 import { Schema, model } from 'mongoose';

 const inventorySchema = new Schema({
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
  }, { timestamps: true });
  


const inventory = model('Inventory', inventorySchema);

export { inventory }; 



/*
// Define the Medicine schema
const medicineSchema = new Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    expirationDate: { type: Date, required: true }
});

// Define the Order schema
const orderSchema = new Schema({
    customerName: { type: String, required: true },
    customerContact: {
        phone: { type: String, required: true },
        email: { type: String, required: true }
    },
    orderDate: { type: Date, default: Date.now },
    medicines: [{
        medicine: { type: Schema.Types.ObjectId, ref: 'Medicine' },
        quantity: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true }
});

// Define the StoreData schema
const storeDataSchema = new Schema({
    storeOwner: { type: Schema.Types.ObjectId, ref: 'StoreOwner', required: true },
    medicines: [medicineSchema],
    orders: [orderSchema]
});*/