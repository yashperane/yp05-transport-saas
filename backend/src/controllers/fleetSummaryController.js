import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';

/**
 * GET /api/fleet/dashboard-summary
 * Scoped fleet metrics for transport business owner dashboard.
 */
export const getFleetSummary = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;

    const [
      totalDrivers,
      activeDrivers,
      availableDrivers,
      busyDrivers,
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      inactiveVehicles,
    ] = await Promise.all([
      Driver.countDocuments({ transportBusinessId }),
      Driver.countDocuments({ transportBusinessId, employmentStatus: 'active' }),
      Driver.countDocuments({ transportBusinessId, employmentStatus: 'active', availabilityStatus: 'available' }),
      Driver.countDocuments({ transportBusinessId, employmentStatus: 'active', availabilityStatus: 'busy' }),
      Vehicle.countDocuments({ transportBusinessId }),
      Vehicle.countDocuments({ transportBusinessId, status: 'active' }),
      Vehicle.countDocuments({ transportBusinessId, status: 'in_maintenance' }),
      Vehicle.countDocuments({ transportBusinessId, status: 'inactive' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          drivers: {
            total: totalDrivers,
            active: activeDrivers,
            available: availableDrivers,
            busy: busyDrivers,
          },
          vehicles: {
            total: totalVehicles,
            active: activeVehicles,
            inMaintenance: maintenanceVehicles,
            inactive: inactiveVehicles,
          },
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve fleet summary.' },
    });
  }
};
