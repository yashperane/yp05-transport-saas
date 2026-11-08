import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';

/**
 * GET /api/vehicles
 * Retrieve all vehicles belonging to the authenticated transport business.
 */
export const getVehicles = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { search, status, vehicleType } = req.query;

    const query = { transportBusinessId };

    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType;

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { registrationNumber: { $regex: term, $options: 'i' } },
        { vehicleNumber: { $regex: term, $options: 'i' } },
        { model: { $regex: term, $options: 'i' } },
        { manufacturer: { $regex: term, $options: 'i' } },
      ];
    }

    const vehicles = await Vehicle.find(query)
      .populate('currentDriverId', 'fullName phoneNumber availabilityStatus')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { vehicles },
    });
  } catch (error) {
    console.error('getVehicles error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve vehicles.' },
    });
  }
};

/**
 * POST /api/vehicles
 * Register a new vehicle in the fleet.
 */
export const createVehicle = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const {
      registrationNumber,
      vehicleNumber,
      vehicleType = 'pickup',
      manufacturer,
      model,
      capacity = 1000,
      capacityUnit = 'kg',
      fuelType = 'diesel',
      registrationExpiryDate,
      insuranceExpiryDate,
      fitnessCertificateExpiryDate,
      notes,
    } = req.body;

    if (!registrationNumber || !registrationNumber.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Vehicle registration number is required.' },
      });
    }

    const cleanReg = registrationNumber.trim().toUpperCase();

    // Check duplicate registration within this transport business
    const existing = await Vehicle.findOne({ transportBusinessId, registrationNumber: cleanReg });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'VEHICLE_EXISTS',
          message: `Vehicle with registration number '${cleanReg}' already exists in your fleet.`,
        },
      });
    }

    const vehicle = await Vehicle.create({
      transportBusinessId,
      registrationNumber: cleanReg,
      vehicleNumber: vehicleNumber ? vehicleNumber.trim() : '',
      vehicleType,
      manufacturer: manufacturer ? manufacturer.trim() : '',
      model: model ? model.trim() : '',
      capacity: Number(capacity) || 1000,
      capacityUnit: capacityUnit || 'kg',
      fuelType: fuelType || 'diesel',
      registrationExpiryDate: registrationExpiryDate ? new Date(registrationExpiryDate) : null,
      insuranceExpiryDate: insuranceExpiryDate ? new Date(insuranceExpiryDate) : null,
      fitnessCertificateExpiryDate: fitnessCertificateExpiryDate ? new Date(fitnessCertificateExpiryDate) : null,
      status: 'active',
      notes: notes ? notes.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet successfully.',
      data: { vehicle },
    });
  } catch (error) {
    console.error('createVehicle error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add vehicle.' },
    });
  }
};

/**
 * GET /api/vehicles/:vehicleId
 * Retrieve individual vehicle details.
 */
export const getVehicleById = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, transportBusinessId })
      .populate('currentDriverId', 'fullName phoneNumber availabilityStatus licenseNumber')
      .lean();

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found in your fleet.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { vehicle },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve vehicle.' },
    });
  }
};

/**
 * PATCH /api/vehicles/:vehicleId
 * Update vehicle details.
 */
export const updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, transportBusinessId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found.' },
      });
    }

    const {
      registrationNumber,
      vehicleNumber,
      vehicleType,
      manufacturer,
      model,
      capacity,
      capacityUnit,
      fuelType,
      registrationExpiryDate,
      insuranceExpiryDate,
      fitnessCertificateExpiryDate,
      notes,
    } = req.body;

    if (registrationNumber) {
      const cleanReg = registrationNumber.trim().toUpperCase();
      // Check collision
      const existing = await Vehicle.findOne({
        transportBusinessId,
        registrationNumber: cleanReg,
        _id: { $ne: vehicleId },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: 'VEHICLE_EXISTS', message: 'Registration number already in use.' },
        });
      }
      vehicle.registrationNumber = cleanReg;
    }

    if (vehicleNumber !== undefined) vehicle.vehicleNumber = vehicleNumber.trim();
    if (vehicleType !== undefined) vehicle.vehicleType = vehicleType;
    if (manufacturer !== undefined) vehicle.manufacturer = manufacturer.trim();
    if (model !== undefined) vehicle.model = model.trim();
    if (capacity !== undefined) vehicle.capacity = Number(capacity);
    if (capacityUnit !== undefined) vehicle.capacityUnit = capacityUnit;
    if (fuelType !== undefined) vehicle.fuelType = fuelType;
    if (registrationExpiryDate !== undefined) vehicle.registrationExpiryDate = registrationExpiryDate ? new Date(registrationExpiryDate) : null;
    if (insuranceExpiryDate !== undefined) vehicle.insuranceExpiryDate = insuranceExpiryDate ? new Date(insuranceExpiryDate) : null;
    if (fitnessCertificateExpiryDate !== undefined) vehicle.fitnessCertificateExpiryDate = fitnessCertificateExpiryDate ? new Date(fitnessCertificateExpiryDate) : null;
    if (notes !== undefined) vehicle.notes = notes.trim();

    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully.',
      data: { vehicle },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update vehicle.' },
    });
  }
};

/**
 * PATCH /api/vehicles/:vehicleId/status
 * Update vehicle operational status (active / in_maintenance / inactive).
 */
export const updateVehicleStatus = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const { status } = req.body;

    if (!['active', 'in_maintenance', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be active, in_maintenance, or inactive.' },
      });
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, transportBusinessId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found.' },
      });
    }

    vehicle.status = status;
    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: `Vehicle status updated to '${status}'.`,
      data: { vehicle },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update vehicle status.' },
    });
  }
};
