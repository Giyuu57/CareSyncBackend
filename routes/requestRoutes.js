import {Router} from 'express';
import {roles} from '../middleware/rolesware.js';
import { authcheck } from '../middleware/authware.js';
import { createRequest, getRequests , updateRequest ,getAuthRequest, deleteRequest} from '../controllers/requestController.js';
const router = Router();

router.route('/check').all(authcheck,getAuthRequest);
router.route('/').get(authcheck,roles('admin'),getRequests).post(authcheck,roles('admin','customer'),createRequest);
router.route('/:id')
  .put(authcheck,roles('admin'),updateRequest)
  .delete(authcheck,roles('admin'),deleteRequest);

export default router;