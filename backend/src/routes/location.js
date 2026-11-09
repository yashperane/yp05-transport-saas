import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, authorizeRoles } from '../middleware/rbac.js';
import { updateLocation, toggleSharing, getMyStatus } from '../controllers/locationController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

// Driver only endpoints
router.post('/update', authorizeRoles('driver'), updateLocation);
router.post('/toggle-sharing', authorizeRoles('driver'), toggleSharing);
router.get('/my-status', authorizeRoles('driver'), getMyStatus);

export { router as locationRouter };
