import express from 'express';
import { login, logout, getProfile } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorizeRoles, requireTenant, requireCompanyWorkspace } from '../middleware/rbac.js';

export const authRouter = express.Router();

// Public routes
authRouter.post('/login', login);
authRouter.post('/logout', logout);

// Protected session route
authRouter.get('/me', requireAuth, getProfile);

// RBAC Testing & Verification Endpoints (Guarded routes)
authRouter.get(
  '/test-owner',
  requireAuth,
  requireTenant,
  authorizeRoles('owner'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Owner access granted',
      user: { name: req.user.name, role: req.user.role, tenant: req.user.transportBusinessId },
    });
  }
);

authRouter.get(
  '/test-dispatcher',
  requireAuth,
  requireTenant,
  authorizeRoles('owner', 'dispatcher'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Dispatcher/Owner operational access granted',
      user: { name: req.user.name, role: req.user.role },
    });
  }
);

authRouter.get(
  '/test-driver',
  requireAuth,
  requireTenant,
  authorizeRoles('driver'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Driver portal access granted',
      user: { name: req.user.name, role: req.user.role },
    });
  }
);

authRouter.get(
  '/test-company',
  requireAuth,
  requireTenant,
  requireCompanyWorkspace,
  authorizeRoles('company_admin', 'company_employee'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Company workspace access granted',
      user: { name: req.user.name, role: req.user.role, company: req.user.companyId },
    });
  }
);
