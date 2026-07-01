import { Router } from 'express';
import { roles } from '../middleware/rolesware.js';
import { authcheck } from '../middleware/authware.js';
import { getAddressByAuthWithStoreID, createAddress, getAddresses , updateAddressByAuthWithStoreID , getAddressByCity , getAddressByLatLong} from '../controllers/addressController.js';

const router = Router();

router.route('/')
    .get(authcheck, roles('admin'), getAddresses)
    .post(authcheck, roles('admin'), createAddress);

router.route('/auth')
    .get(authcheck, roles('store-owner'), getAddressByAuthWithStoreID)
    .put(authcheck, roles('store-owner'), updateAddressByAuthWithStoreID);

router.route('/:city')
    .get( getAddressByCity);

router.route('/:latitude/:longitude')
    .get( getAddressByLatLong);

export default router;