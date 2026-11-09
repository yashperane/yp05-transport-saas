import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, authorizeRoles } from '../middleware/rbac.js';
import {
  getDashboardFinancials,
  getCompanyBillingReport,
  getPaymentLedger,
} from '../controllers/reportController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

// Only Owner & Dispatcher have financial reporting access
router.get('/dashboard-financials', authorizeRoles('owner', 'dispatcher'), getDashboardFinancials);
router.get('/company-billing', authorizeRoles('owner', 'dispatcher'), getCompanyBillingReport);
router.get('/payments', authorizeRoles('owner', 'dispatcher'), getPaymentLedger);

export { router as reportRouter };
