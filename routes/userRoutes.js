import express from 'express';
import { authcheck } from '../middleware/authware.js';
import {roles} from '../middleware/rolesware.js';
import { getUser, getUsers, updateUser ,deleteUser ,getUserProfile , updateUserProfile} from '../controllers/userController.js';
import { getStorebyAuth ,updateStoreById } from '../controllers/storeController.js';
import { get } from 'mongoose';

const router = express.Router();
router.route('/').get(authcheck,roles('customer','store-owner','admin'),getUserProfile)
router.put('/', authcheck,roles('customer','store-owner','admin'),updateUserProfile);
router.route('/store').get(authcheck, roles('store-owner'), getStorebyAuth);
router.route('/store').put(authcheck, roles('store-owner'), updateStoreById);
router.route('/data').get(authcheck, roles('admin'),getUsers);
router.route('/:id').get(authcheck, roles("admin"), getUser).put(authcheck, roles('admin'), updateUser).delete(authcheck, roles('admin'), deleteUser);

export default router;