import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Sign a JWT Access Token
 * Payload includes:
 * - userId: User ID
 * - role: User Role
 * - transportBusinessId: Transport Business Tenant ID (null for super_admin)
 * - companyId: Company Workspace ID (if company_admin or company_employee)
 * 
 * Note: Never store passwords or sensitive PII in JWT payloads.
 * @param {object} user - User document
 * @returns {string} Signed JWT token
 */
export const signAccessToken = (user) => {
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    transportBusinessId: user.transportBusinessId ? user.transportBusinessId.toString() : null,
    companyId: user.companyId ? user.companyId.toString() : null,
  };

  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  });
};

/**
 * Verify a JWT Token
 * @param {string} token 
 * @returns {object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwtAccessSecret);
};
