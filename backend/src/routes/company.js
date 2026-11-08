import express from 'express';
import {
  getCompanies,
  createCompany,
  getCompanyById,
  updateCompany,
  updateCompanyStatus,
  getCompanySummary,
} from '../controllers/companyController.js';
import {
  getCompanyUsers,
  inviteCompanyUser,
  updateCompanyUserStatus,
} from '../controllers/companyUserController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorizeRoles, requireTenant } from '../middleware/rbac.js';

export const companyRouter = express.Router();

// Apply auth and tenant requirement to all company routes
companyRouter.use(requireAuth, requireTenant);

// --- Company Collection Routes ---
// GET /api/companies (Owner, Dispatcher if permitted)
companyRouter.get('/', authorizeRoles('owner', 'dispatcher'), getCompanies);

// POST /api/companies (Owner only)
companyRouter.post('/', authorizeRoles('owner'), createCompany);

// --- Single Company Routes ---
// GET /api/companies/:id (Owner, Dispatcher, Company Admin/Employee of that company)
companyRouter.get(
  '/:id',
  authorizeRoles('owner', 'dispatcher', 'company_admin', 'company_employee'),
  getCompanyById
);

// PATCH /api/companies/:id (Owner only)
companyRouter.patch('/:id', authorizeRoles('owner'), updateCompany);

// PATCH /api/companies/:id/status (Owner only)
companyRouter.patch('/:id/status', authorizeRoles('owner'), updateCompanyStatus);

// GET /api/companies/:id/summary (Owner, Company Admin/Employee)
companyRouter.get(
  '/:id/summary',
  authorizeRoles('owner', 'company_admin', 'company_employee'),
  getCompanySummary
);

// --- Company User Management Routes ---
// GET /api/companies/:companyId/users (Owner, Company Admin of this company)
companyRouter.get(
  '/:companyId/users',
  authorizeRoles('owner', 'company_admin'),
  getCompanyUsers
);

// POST /api/companies/:companyId/users/invite (Owner, Company Admin of this company)
companyRouter.post(
  '/:companyId/users/invite',
  authorizeRoles('owner', 'company_admin'),
  inviteCompanyUser
);

// PATCH /api/companies/:companyId/users/:userId/status (Owner, Company Admin of this company)
companyRouter.patch(
  '/:companyId/users/:userId/status',
  authorizeRoles('owner', 'company_admin'),
  updateCompanyUserStatus
);
