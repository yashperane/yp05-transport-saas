import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, authorizeRoles } from '../middleware/rbac.js';
import {
  getInvoices,
  getUnbilledOrders,
  getInvoiceById,
  createInvoice,
  issueInvoice,
  cancelInvoice,
  recordPayment,
} from '../controllers/billingController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

// Invoices List & Details (Owner, Dispatcher, Company Admin, Company Employee)
router.get('/', authorizeRoles('owner', 'dispatcher', 'company_admin', 'company_employee'), getInvoices);
router.get('/unbilled-orders', authorizeRoles('owner', 'dispatcher'), getUnbilledOrders);
router.get('/:invoiceId', authorizeRoles('owner', 'dispatcher', 'company_admin', 'company_employee'), getInvoiceById);

// Create, Issue, Cancel Invoices (Owner full, Dispatcher if authorized)
router.post('/', authorizeRoles('owner', 'dispatcher'), createInvoice);
router.post('/:invoiceId/issue', authorizeRoles('owner', 'dispatcher'), issueInvoice);
router.post('/:invoiceId/cancel', authorizeRoles('owner'), cancelInvoice);

// Payment Recording (Owner, Dispatcher)
router.post('/payments', authorizeRoles('owner', 'dispatcher'), recordPayment);

export { router as billingRouter };
