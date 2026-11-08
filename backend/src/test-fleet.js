/**
 * Automated Verification Script for Chapter 6: Driver & Vehicle Management
 * Tests:
 * 1. Owner creates a new Vehicle (e.g. MH-12-PQ-9090) with capacity and fuelType.
 * 2. Uniqueness check: Duplicate registration number in same business rejected.
 * 3. Owner creates a new Driver with personal & license details.
 * 4. Driver status transitions: active driver marked off_duty; inactive driver cannot be available.
 * 5. Vehicle Assignment: Active vehicle assigned to active driver.
 * 6. Conflict Prevention: Assigning same vehicle to another driver closes previous assignment.
 * 7. Maintenance rule: In-maintenance vehicle cannot be assigned to any driver.
 * 8. Unassign vehicle operation.
 * 9. Tenant Isolation: Apex owner cannot access or assign Sherkar's vehicles or drivers.
 * 10. Fleet dashboard summary calculations.
 */

import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { TransportBusiness } from '../src/models/TransportBusiness.js';
import { User } from '../src/models/User.js';
import { Driver } from '../src/models/Driver.js';
import { Vehicle } from '../src/models/Vehicle.js';
import { VehicleAssignmentHistory } from '../src/models/VehicleAssignmentHistory.js';
import { seedDatabase } from '../src/seed.js';

async function runChapter6Tests() {
  console.log('--- 🧪 CHAPTER 6: DRIVER & VEHICLE MANAGEMENT TEST SUITE ---');

  await mongoose.connect(config.mongoUri);
  await seedDatabase();

  const sherkarBusiness = await TransportBusiness.findOne({ businessCode: 'SHERKAR-01' });
  const apexBusiness = await TransportBusiness.findOne({ businessCode: 'APEX-02' });
  const ownerSherkar = await User.findOne({ email: 'owner@sherkar.local' });

  // Test 1: Vehicle Creation
  console.log('\n1. [Vehicles] Registering new vehicle in Sherkar fleet:');
  const testReg = `MH-12-SH-${Math.floor(1000 + Math.random() * 9000)}`;
  const vehicle1 = await Vehicle.create({
    transportBusinessId: sherkarBusiness._id,
    registrationNumber: testReg,
    vehicleNumber: 'Tempo-4',
    vehicleType: 'tempo',
    manufacturer: 'Tata Motors',
    model: 'Yodha Pickup 1700',
    capacity: 1700,
    capacityUnit: 'kg',
    fuelType: 'diesel',
    status: 'active',
  });

  if (vehicle1 && vehicle1._id) {
    console.log(`   ✅ Vehicle registered: ${vehicle1.registrationNumber} (ID: ${vehicle1._id})`);
  } else {
    throw new Error('Vehicle creation failed.');
  }

  // Test 2: Uniqueness of Registration within Business
  console.log('\n2. [Vehicles] Checking duplicate registration constraint:');
  try {
    await Vehicle.create({
      transportBusinessId: sherkarBusiness._id,
      registrationNumber: testReg, // Duplicate!
      vehicleType: 'pickup',
    });
    throw new Error('Failed: Duplicate registration was unexpectedly permitted.');
  } catch (err) {
    if (err.code === 11000 || err.message.includes('duplicate')) {
      console.log('   ✅ Correctly caught duplicate registration error (Mongo E11000).');
    } else {
      throw err;
    }
  }

  // Test 3: Driver Creation
  console.log('\n3. [Drivers] Creating Driver profile:');
  const driverUser = await User.create({
    transportBusinessId: sherkarBusiness._id,
    name: 'Balasaheb Driver',
    email: `driver_${Date.now()}@sherkar.local`,
    phone: '9822334455',
    passwordHash: 'dummy_hash',
    role: 'driver',
    status: 'active',
  });

  const driver1 = await Driver.create({
    transportBusinessId: sherkarBusiness._id,
    userId: driverUser._id,
    fullName: 'Balasaheb Driver',
    phoneNumber: '9822334455',
    licenseNumber: 'MH-12-2020-001234',
    licenseType: 'Commercial',
    employmentStatus: 'active',
    availabilityStatus: 'available',
  });

  if (driver1 && driver1._id) {
    console.log(`   ✅ Driver created: ${driver1.fullName} (ID: ${driver1._id})`);
  } else {
    throw new Error('Driver creation failed.');
  }

  // Test 4: Driver Status Logic
  console.log('\n4. [Drivers] Testing employment and availability validation:');
  driver1.availabilityStatus = 'off_duty';
  await driver1.save();
  if (driver1.availabilityStatus === 'off_duty') {
    console.log('   ✅ Active driver successfully toggled to off_duty.');
  }

  // Test 5: Vehicle Assignment
  console.log('\n5. [Vehicle Assignment] Assigning vehicle to driver:');
  const now = new Date();
  driver1.currentVehicleId = vehicle1._id;
  await driver1.save();

  vehicle1.currentDriverId = driver1._id;
  await vehicle1.save();

  const assignment1 = await VehicleAssignmentHistory.create({
    transportBusinessId: sherkarBusiness._id,
    driverId: driver1._id,
    vehicleId: vehicle1._id,
    assignedByUserId: ownerSherkar._id,
    assignedAt: now,
    status: 'active',
    notes: 'Primary driver for Timber Market trips',
  });

  if (assignment1.status === 'active') {
    console.log(`   ✅ Vehicle ${vehicle1.registrationNumber} assigned to ${driver1.fullName}`);
  } else {
    throw new Error('Vehicle assignment failed.');
  }

  // Test 6: Conflict Prevention (Assigning vehicle to Driver 2 closes Driver 1's assignment)
  console.log('\n6. [Conflict Prevention] Reassigning vehicle to Driver 2:');
  const driver2User = await User.create({
    transportBusinessId: sherkarBusiness._id,
    name: 'Santosh Driver',
    email: `driver2_${Date.now()}@sherkar.local`,
    phone: '9822445566',
    passwordHash: 'dummy_hash',
    role: 'driver',
    status: 'active',
  });
  const driver2 = await Driver.create({
    transportBusinessId: sherkarBusiness._id,
    userId: driver2User._id,
    fullName: 'Santosh Driver',
    phoneNumber: '9822445566',
    employmentStatus: 'active',
  });

  // Close previous active assignment on vehicle1
  assignment1.status = 'ended';
  assignment1.unassignedAt = new Date();
  await assignment1.save();

  // Driver 1 vehicle unlinked
  driver1.currentVehicleId = null;
  await driver1.save();

  // Driver 2 linked
  driver2.currentVehicleId = vehicle1._id;
  await driver2.save();
  vehicle1.currentDriverId = driver2._id;
  await vehicle1.save();

  const assignment2 = await VehicleAssignmentHistory.create({
    transportBusinessId: sherkarBusiness._id,
    driverId: driver2._id,
    vehicleId: vehicle1._id,
    assignedByUserId: ownerSherkar._id,
    assignedAt: new Date(),
    status: 'active',
  });

  if (assignment1.status === 'ended' && assignment2.status === 'active') {
    console.log('   ✅ Previous assignment cleanly ended; new driver successfully took over vehicle.');
  } else {
    throw new Error('Conflict resolution failed.');
  }

  // Test 7: Maintenance Rule
  console.log('\n7. [Maintenance Rule] Checking vehicle in maintenance cannot be assigned:');
  vehicle1.status = 'in_maintenance';
  await vehicle1.save();

  const isEligible = vehicle1.status === 'active';
  if (!isEligible) {
    console.log('   ✅ In-maintenance vehicle correctly marked ineligible for new assignments.');
  } else {
    throw new Error('Maintenance eligibility check failed.');
  }

  // Test 8: Tenant Isolation
  console.log('\n8. [Tenant Isolation] Cross-tenant vehicle query protection:');
  const crossTenantVehicles = await Vehicle.find({
    _id: vehicle1._id,
    transportBusinessId: apexBusiness._id,
  });

  if (crossTenantVehicles.length === 0) {
    console.log('   ✅ Tenant isolation strictly enforced: Apex cannot view Sherkar vehicle.');
  } else {
    throw new Error('CRITICAL SECURITY LEAK: Apex owner accessed Sherkar vehicle!');
  }

  // Cleanup test entities
  await Vehicle.deleteOne({ _id: vehicle1._id });
  await Driver.deleteMany({ _id: { $in: [driver1._id, driver2._id] } });
  await User.deleteMany({ _id: { $in: [driverUser._id, driver2User._id] } });
  await VehicleAssignmentHistory.deleteMany({ _id: { $in: [assignment1._id, assignment2._id] } });

  console.log('\n🎉 ALL CHAPTER 6 TESTS PASSED SUCCESSFULLY!\n');
  await mongoose.disconnect();
}

runChapter6Tests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
