import "dotenv/config";

import './config/loadEnv.js';
import express from 'express';
import auth from './routes/userLoginRoutes.js';
import { errorHandler } from './middleware/errorhandler.js';
import userRoutes from './routes/userRoutes.js'
import medicineRoutes from './routes/medicineRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import medicationApiRoutes from './config/apiservice.js';
import cors from 'cors';
import { run } from './config/moongose.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CareSync backend is connected",
  });
});

app.use('/auth', auth);
app.use('/user', userRoutes);
app.use("/medicine", medicineRoutes);
app.use('/request', requestRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/order', orderRoutes);
app.use('/address', addressRoutes);
app.use('/search', searchRoutes);
app.use('/api/search', searchRoutes);
app.use('/medication', medicationApiRoutes);
app.use('/api/medication', medicationApiRoutes);
app.use('/admin', adminRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Connect to the database first, then start accepting requests.
// Most hosts (Render, Railway, etc.) assign their own PORT — the app must
// listen on that, not a hardcoded value, or the platform can't route to it.
run()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server: could not connect to database.', err);
    process.exit(1);
  });
