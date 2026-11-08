import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

/**
 * Authentication Middleware
 * 1. Checks HttpOnly cookie 'token' OR Authorization header 'Bearer <token>'
 * 2. Verifies cryptographic signature with JWT_ACCESS_SECRET
 * 3. Verifies user exists in database and account is active
 * 4. Injects req.user with trusted server-side identity
 */
export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Read token from HttpOnly cookie if present
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // 2. Or read from Authorization header: Bearer <token>
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing. Please log in.',
        },
      });
    }

    // 3. Cryptographic token verification
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Session has expired. Please log in again.',
          },
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token.',
        },
      });
    }

    // 4. Validate user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The account associated with this session no longer exists.',
        },
      });
    }

    // 5. Check if user account is disabled
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been deactivated or suspended.',
        },
      });
    }

    // 6. Attach trusted server-side identity to req.user
    req.user = user;
    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      transportBusinessId: user.transportBusinessId ? user.transportBusinessId.toString() : null,
      companyId: user.companyId ? user.companyId.toString() : null,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Internal authentication error.',
      },
    });
  }
};
