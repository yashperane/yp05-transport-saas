import crypto from 'crypto';
import { Driver } from '../models/Driver.js';
import { User } from '../models/User.js';
import { Vehicle } from '../models/Vehicle.js';
import { hashPassword } from '../utils/password.js';

/**
 * GET /api/drivers
 * Retrieve all drivers belonging to the authenticated transport business.
 */
export const getDrivers = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { search, employmentStatus, availabilityStatus } = req.query;

    const query = { transportBusinessId };

    if (employmentStatus) query.employmentStatus = employmentStatus;
    if (availabilityStatus) query.availabilityStatus = availabilityStatus;

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { fullName: { $regex: term, $options: 'i' } },
        { phoneNumber: { $regex: term, $options: 'i' } },
        { licenseNumber: { $regex: term, $options: 'i' } },
      ];
    }

    const drivers = await Driver.find(query)
      .populate('userId', 'email status role')
      .populate('currentVehicleId', 'registrationNumber vehicleNumber vehicleType status')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { drivers },
    });
  } catch (error) {
    console.error('getDrivers error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve drivers.' },
    });
  }
};

/**
 * POST /api/drivers
 * Create a new driver profile and corresponding User login account.
 */
export const createDriver = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const {
      fullName,
      email,
      phoneNumber,
      alternatePhoneNumber,
      address,
      emergencyContactName,
      emergencyContactNumber,
      licenseNumber,
      licenseType,
      licenseExpiryDate,
      joiningDate,
      notes,
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Driver full name is required.' },
      });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Phone number is required.' },
      });
    }

    // Auto-derive email if not provided (e.g. driver_<phone>@sherkar.local)
    const driverEmail = email && email.trim()
      ? email.trim().toLowerCase()
      : `driver_${phoneNumber.trim().replace(/\D/g, '')}@transport.local`;

    // Check if user already exists
    let user = await User.findOne({ email: driverEmail });
    if (user) {
      // Check if driver profile already linked
      const existingDriver = await Driver.findOne({ userId: user._id });
      if (existingDriver) {
        return res.status(409).json({
          success: false,
          error: { code: 'DRIVER_EXISTS', message: 'A driver with this email/account already exists.' },
        });
      }
    } else {
      // Create user account with invited/default status
      const defaultPassword = 'Password123!';
      const passwordHash = await hashPassword(defaultPassword);

      user = await User.create({
        transportBusinessId,
        name: fullName.trim(),
        email: driverEmail,
        phone: phoneNumber.trim(),
        passwordHash,
        role: 'driver',
        status: 'active',
      });
    }

    // Create Driver profile
    const driver = await Driver.create({
      transportBusinessId,
      userId: user._id,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      alternatePhoneNumber: alternatePhoneNumber ? alternatePhoneNumber.trim() : '',
      address: address ? address.trim() : '',
      emergencyContactName: emergencyContactName ? emergencyContactName.trim() : '',
      emergencyContactNumber: emergencyContactNumber ? emergencyContactNumber.trim() : '',
      licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : '',
      licenseType: licenseType || 'LMV',
      licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      employmentStatus: 'active',
      availabilityStatus: 'available',
      notes: notes ? notes.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Driver profile created successfully.',
      data: { driver },
    });
  } catch (error) {
    console.error('createDriver error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create driver.' },
    });
  }
};

/**
 * GET /api/drivers/:driverId
 * Retrieve individual driver details.
 */
export const getDriverById = async (req, res) => {
  try {
    const { driverId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    // Driver role can only access their own profile
    if (req.user.role === 'driver') {
      const selfDriver = await Driver.findOne({ userId: req.user._id, transportBusinessId });
      if (!selfDriver || selfDriver._id.toString() !== driverId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only access your own profile.' },
        });
      }
    }

    const driver = await Driver.findOne({ _id: driverId, transportBusinessId })
      .populate('userId', 'email status role lastLoginAt')
      .populate('currentVehicleId', 'registrationNumber vehicleNumber vehicleType status capacity')
      .lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver not found in your account.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { driver },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve driver.' },
    });
  }
};

/**
 * PATCH /api/drivers/:driverId
 * Update driver personal/license details.
 */
export const updateDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const driver = await Driver.findOne({ _id: driverId, transportBusinessId });
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver not found.' },
      });
    }

    const {
      fullName,
      phoneNumber,
      alternatePhoneNumber,
      address,
      emergencyContactName,
      emergencyContactNumber,
      licenseNumber,
      licenseType,
      licenseExpiryDate,
      notes,
    } = req.body;

    if (fullName) driver.fullName = fullName.trim();
    if (phoneNumber) driver.phoneNumber = phoneNumber.trim();
    if (alternatePhoneNumber !== undefined) driver.alternatePhoneNumber = alternatePhoneNumber.trim();
    if (address !== undefined) driver.address = address.trim();
    if (emergencyContactName !== undefined) driver.emergencyContactName = emergencyContactName.trim();
    if (emergencyContactNumber !== undefined) driver.emergencyContactNumber = emergencyContactNumber.trim();
    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber.trim().toUpperCase();
    if (licenseType !== undefined) driver.licenseType = licenseType;
    if (licenseExpiryDate !== undefined) driver.licenseExpiryDate = licenseExpiryDate ? new Date(licenseExpiryDate) : null;
    if (notes !== undefined) driver.notes = notes.trim();

    await driver.save();

    return res.status(200).json({
      success: true,
      message: 'Driver updated successfully.',
      data: { driver },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update driver.' },
    });
  }
};

/**
 * PATCH /api/drivers/:driverId/status
 * Update driver employment or availability status with validation.
 */
export const updateDriverStatus = async (req, res) => {
  try {
    const { driverId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const { employmentStatus, availabilityStatus } = req.body;

    const driver = await Driver.findOne({ _id: driverId, transportBusinessId });
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver not found.' },
      });
    }

    // Drivers themselves can only update their availability status (available / off_duty)
    if (req.user.role === 'driver') {
      if (employmentStatus) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Drivers cannot change their employment status.' },
        });
      }
    }

    if (employmentStatus) {
      if (!['active', 'inactive', 'suspended'].includes(employmentStatus)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Invalid employment status.' },
        });
      }
      driver.employmentStatus = employmentStatus;
      // If inactive or suspended, set availability to off_duty
      if (['inactive', 'suspended'].includes(employmentStatus)) {
        driver.availabilityStatus = 'off_duty';
      }
    }

    if (availabilityStatus) {
      if (!['available', 'busy', 'off_duty'].includes(availabilityStatus)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Invalid availability status.' },
        });
      }

      // Inactive driver cannot be set to available or busy
      if (driver.employmentStatus !== 'active' && availabilityStatus !== 'off_duty') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'Inactive or suspended drivers cannot be marked available or busy.',
          },
        });
      }

      driver.availabilityStatus = availabilityStatus;
    }

    await driver.save();

    return res.status(200).json({
      success: true,
      message: 'Driver status updated successfully.',
      data: { driver },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update driver status.' },
    });
  }
};
