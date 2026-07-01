import {Router} from 'express';
import {roles} from '../middleware/rolesware.js';
import { authcheck } from '../middleware/authware.js';
import { getStoresWithMedicineNearby } from '../controllers/inventoryController.js';
import { createinventoryAuth, getinventoryAuth, updateinventoryAuth, deleteinventoryAuth } from '../controllers/inventoryController.js';
import { createinventory , getinventory , updateinventory, deleteinventory } from '../controllers/inventoryController.js';
const router = Router();

router.get('/stores-with-medicine-nearby',authcheck,roles('customer','store-owner','admin'), getStoresWithMedicineNearby);
// Auth commands
router.route('/').get(authcheck,roles('store-owner'),getinventoryAuth).post(authcheck,roles('store-owner'),createinventoryAuth);
router.route('/:id').put(authcheck,roles('store-owner'),updateinventoryAuth).delete(authcheck,roles('store-owner'),deleteinventoryAuth);
router.route('/dev').get(authcheck,roles('admin'),getinventory).post(authcheck,roles('admin'),createinventory);
router.route('/dev/:id').put(authcheck,roles('admin'),updateinventory).delete(authcheck,roles('admin'),deleteinventory);

export default router;