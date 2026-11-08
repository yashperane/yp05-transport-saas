import crypto from 'crypto';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { hashPassword } from '../utils/password.js';

/**
 * GET /api/companies/:companyId/users
 * Retrieve users belonging to a specific company.
 * Accessible by: Owner (any company in business), Company Admin (own company only).
 */
export const getCompanyUsers = async (req, res) => {
  try {
    const { companyId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    // RBAC: Company Admin can only access their own company
    if (req.user.role === 'company_admin' && req.user.companyId?.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to view users of another company.' },
      });
    }

    // Verify company belongs to authenticated transport business
    const company = await Company.findOne({ _id: companyId, transportBusinessId });
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Company not found.' },
      });
    }

    const users = await User.find({ companyId })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('getCompanyUsers error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve company users.' },
    });
  }
};

/**
 * POST /api/companies/:companyId/users/invite
 * Invite a new user (Company Admin or Employee) to the company workspace.
 * Generates a secure, time-limited token.
 */
export const inviteCompanyUser = async (req, res) => {
  try {
    const { companyId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const { name, email, phone, role = 'company_employee' } = req.body;

    // RBAC check: Only owner or company_admin of this company can invite
    if (req.user.role === 'company_admin' && req.user.companyId?.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot invite users to another company.' },
      });
    }

    // Role safety: Only company-level roles can be created here
    if (!['company_admin', 'company_employee'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROLE', message: 'Only company_admin or company_employee can be added here.' },
      });
    }

    // Company Admin cannot create another Company Admin if not allowed, but here we permit company roles
    if (!name || !name.trim() || !email || !email.trim() || !phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, and phone are required.' },
      });
    }

    // Verify company
    const company = await Company.findOne({ _id: companyId, transportBusinessId });
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Target company not found.' },
      });
    }

    // Check existing email
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'A user with this email already exists.' },
      });
    }

    // Generate secure 32-byte hex invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity

    const newUser = await User.create({
      transportBusinessId,
      companyId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      status: 'invited',
      invitationToken,
      invitationExpiresAt,
    });

    return res.status(201).json({
      success: true,
      message: 'Invitation generated successfully.',
      data: {
        user: newUser,
        // In dev mode, return invitation link for easy testing without SMTP
        invitationLink: `/invite/accept?token=${invitationToken}`,
        invitationToken,
      },
    });
  } catch (error) {
    console.error('inviteCompanyUser error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to invite user.' },
    });
  }
};

/**
 * PATCH /api/companies/:companyId/users/:userId/status
 * Activate or deactivate an employee.
 */
export const updateCompanyUserStatus = async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { status } = req.body;
    const transportBusinessId = req.user.transportBusinessId;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid status.' },
      });
    }

    // RBAC: Company Admin can only update users in their own company
    if (req.user.role === 'company_admin' && req.user.companyId?.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot modify users from another company.' },
      });
    }

    // Prevent self-deactivation
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_MODIFICATION', message: 'You cannot deactivate your own account.' },
      });
    }

    const targetUser = await User.findOne({ _id: userId, companyId, transportBusinessId });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found in this company.' },
      });
    }

    // Company Admin cannot deactivate an Owner or Super Admin
    if (['owner', 'super_admin'].includes(targetUser.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot alter system administrator accounts.' },
      });
    }

    targetUser.status = status;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}.`,
      data: { user: targetUser },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update user status.' },
    });
  }
};

/**
 * POST /api/invitations/accept
 * Public endpoint: User clicks invitation link, sets their password, and activates account.
 */
export const acceptInvitation = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Token and new password are required.' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' },
      });
    }

    const user = await User.findOne({ invitationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or already used invitation token.' },
      });
    }

    // Check expiration
    if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'EXPIRED_TOKEN', message: 'Invitation has expired. Please request a new invite.' },
      });
    }

    // Hash password and activate account
    user.passwordHash = await hashPassword(password);
    user.status = 'active';
    user.invitationToken = null;
    user.invitationExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Account activated successfully. You may now log in.',
    });
  } catch (error) {
    console.error('acceptInvitation error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to accept invitation.' },
    });
  }
};
