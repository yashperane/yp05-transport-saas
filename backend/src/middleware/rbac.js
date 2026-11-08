/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Restricts endpoint execution to allowed roles only.
 * 
 * Usage example:
 * authorizeRoles('owner', 'dispatcher')
 * 
 * @param  {...string} allowedRoles 
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required before checking permissions.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        },
      });
    }

    next();
  };
};

/**
 * Tenant Isolation Scoping Helper Middleware
 * Guarantees that requests operate strictly within the authenticated user's transportBusinessId.
 * Super Admins can optionally bypass if explicitly requested for platform management.
 */
export const requireTenant = (req, res, next) => {
  if (req.user.role === 'super_admin') {
    return next();
  }

  if (!req.user.transportBusinessId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'No transport business tenant associated with this account.',
      },
    });
  }

  // Inject trusted tenant scope helper for controllers to build queries
  req.tenantFilter = { transportBusinessId: req.user.transportBusinessId };
  next();
};

/**
 * Company Workspace Scoping Middleware
 * Enforces company boundary for company_admin and company_employee users.
 */
export const requireCompanyWorkspace = (req, res, next) => {
  const companyRoles = ['company_admin', 'company_employee'];

  if (companyRoles.includes(req.user.role)) {
    if (!req.user.companyId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'COMPANY_WORKSPACE_REQUIRED',
          message: 'No company workspace associated with this user account.',
        },
      });
    }

    req.companyFilter = {
      transportBusinessId: req.user.transportBusinessId,
      companyId: req.user.companyId,
    };
  }

  next();
};
