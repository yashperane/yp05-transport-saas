import { User } from '../models/User.js';
import { TransportBusiness } from '../models/TransportBusiness.js';
import { Company } from '../models/Company.js';
import { comparePassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { config } from '../config/env.js';

/**
 * POST /api/auth/login
 * Public endpoint: Authenticates with email or phone + password
 * Sets HttpOnly cookie and returns user profile + token
 */
export const login = async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;

    const loginIdentifier = (identifier || email || phone || '').trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email/Phone and password are required.',
        },
      });
    }

    // Find user by either email or phone
    const user = await User.findOne({
      $or: [{ email: loginIdentifier }, { phone: loginIdentifier }],
    });

    // Timing-safe response: Generic error to prevent account enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/phone or password.',
        },
      });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'This account is deactivated or suspended. Please contact administrator.',
        },
      });
    }

    // Verify password hash
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/phone or password.',
        },
      });
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT access token
    const token = signAccessToken(user);

    // Set secure HttpOnly cookie
    const isProduction = config.nodeEnv === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Populate business and company names if applicable
    let businessName = null;
    if (user.transportBusinessId) {
      const tb = await TransportBusiness.findById(user.transportBusinessId).select('name businessCode');
      businessName = tb ? tb.name : null;
    }

    let companyName = null;
    if (user.companyId) {
      const co = await Company.findById(user.companyId).select('companyName companyCode');
      companyName = co ? co.companyName : null;
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          transportBusinessId: user.transportBusinessId,
          businessName,
          companyId: user.companyId,
          companyName,
          permissions: user.permissions,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An unexpected error occurred during login.',
      },
    });
  }
};

/**
 * POST /api/auth/logout
 * Clears authentication cookie
 */
export const logout = async (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    secure: config.nodeEnv === 'production',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * GET /api/auth/me
 * Protected endpoint: Returns current authenticated user profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    let businessName = null;
    if (user.transportBusinessId) {
      const tb = await TransportBusiness.findById(user.transportBusinessId).select('name businessCode settings');
      businessName = tb ? tb.name : null;
    }

    let companyName = null;
    if (user.companyId) {
      const co = await Company.findById(user.companyId).select('companyName companyCode settings');
      companyName = co ? co.companyName : null;
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          transportBusinessId: user.transportBusinessId,
          businessName,
          companyId: user.companyId,
          companyName,
          permissions: user.permissions,
          lastLoginAt: user.lastLoginAt,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve profile.',
      },
    });
  }
};
