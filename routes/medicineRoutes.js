import {Router} from 'express';
const router = Router();
import { authcheck } from '../middleware/authware.js';
import {roles} from '../middleware/rolesware.js';
import {createMedicine , getMedicineById , getMedicines , updateMedicine} from '../controllers/medicineController.js';
router.route("/").get(authcheck,roles('admin', 'store-owner', 'customer'),getMedicines).post(authcheck,roles('admin', 'store-owner'),createMedicine);
router.route("/:id").get(authcheck,getMedicineById).put(authcheck,roles('admin'),updateMedicine);
//router.route("/").delete(deleteMediciene);
export default router;