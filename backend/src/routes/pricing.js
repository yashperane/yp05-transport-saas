import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, authorizeRoles } from '../middleware/rbac.js';
import {
  getAgreements,
  createAgreement,
  updateAgreementStatus,
  updateOrderPricing,
} from '../controllers/pricingController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

// Only Owner & Dispatcher can view agreements
router.get('/agreements', authorizeRoles('owner', 'dispatcher'), getAgreements);

// Only Owner can create or modify agreements
router.post('/agreements', authorizeRoles('owner'), createAgreement);
router.patch('/agreements/:agreementId/status', authorizeRoles('owner'), updateAgreementStatus);

// Owner & Dispatcher can confirm or update order pricing
router.patch('/orders/:orderId', authorizeRoles('owner', 'dispatcher'), updateOrderPricing);

export { router as pricingRouter };
