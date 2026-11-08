/**
 * Seed Script for Local Development & Testing
 * Creates:
 * 1. Pilot Transport Business: "Sherkar Transport Services"
 * 2. Another Business: "Apex Logistics" (To test tenant isolation!)
 * 3. Client Company: "Tata Projects Site A" under Sherkar Transport
 * 4. Test Accounts for all 6 roles:
 *    - superadmin@platform.local (Super Admin)
 *    - owner@sherkar.local (Owner - Sherkar)
 *    - dispatcher@sherkar.local (Dispatcher)
 *    - driver1@sherkar.local (Driver - operates vehicle 1)
 *    - companyadmin@tataprojects.local (Company Admin)
 *    - employee@tataprojects.local (Company Employee)
 *    - otherowner@apex.local (Tenant 2 Owner)
 * 
 * Default password for all seed accounts: "Password123!"
 */

import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { TransportBusiness } from '../src/models/TransportBusiness.js';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';
import { Driver } from '../src/models/Driver.js';
import { Vehicle } from '../src/models/Vehicle.js';
import { hashPassword } from '../src/utils/password.js';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding for Chapter 3 test accounts...');

  const defaultPassword = 'Password123!';
  const passwordHash = await hashPassword(defaultPassword);

  // 1. Create or update Tenant 1: Sherkar Transport Services
  let sherkarBusiness = await TransportBusiness.findOne({ businessCode: 'SHERKAR-01' });
  if (!sherkarBusiness) {
    sherkarBusiness = await TransportBusiness.create({
      name: 'Sherkar Transport Services',
      businessCode: 'SHERKAR-01',
      contactName: 'Sherkar (Owner)',
      phone: '9876543210',
      email: 'owner@sherkar.local',
      address: 'Market Yard, Pune',
      settings: {
        driverVisibility: 'assigned_and_available',
        companyTrackingVisibility: 'status_only',
        allowDriverSelfAssignment: true,
      },
    });
    console.log('   ✅ Created Tenant 1: Sherkar Transport Services');
  }

  // 2. Create Tenant 2 for cross-tenant testing: Apex Logistics
  let apexBusiness = await TransportBusiness.findOne({ businessCode: 'APEX-02' });
  if (!apexBusiness) {
    apexBusiness = await TransportBusiness.create({
      name: 'Apex Logistics',
      businessCode: 'APEX-02',
      contactName: 'Apex Admin',
      phone: '9876543299',
      email: 'owner@apex.local',
      address: 'MIDC Bhosari, Pune',
      settings: {
        driverVisibility: 'assigned_only',
      },
    });
    console.log('   ✅ Created Tenant 2: Apex Logistics (for Tenant Isolation testing)');
  }

  // 3. Create Client Company under Sherkar Transport
  let tataCompany = await Company.findOne({ 
    transportBusinessId: sherkarBusiness._id,
    companyCode: 'TATA-SITE-A' 
  });
  if (!tataCompany) {
    tataCompany = await Company.create({
      transportBusinessId: sherkarBusiness._id,
      companyName: 'Tata Projects Site A',
      companyCode: 'TATA-SITE-A',
      contactPerson: 'Kulkarni (Site Supervisor)',
      phone: '9123456780',
      email: 'companyadmin@tataprojects.local',
      address: 'Metro Site Depot, Pune',
    });
    console.log('   ✅ Created Client Company: Tata Projects Site A');
  }

  // 4. Seed Users for each role
  const seedUsers = [
    {
      name: 'Platform Super Admin',
      email: 'superadmin@platform.local',
      phone: '9999900001',
      role: 'super_admin',
      transportBusinessId: null,
      companyId: null,
    },
    {
      name: 'Sherkar (Owner)',
      email: 'owner@sherkar.local',
      phone: '9876543210',
      role: 'owner',
      transportBusinessId: sherkarBusiness._id,
      companyId: null,
    },
    {
      name: 'Ramesh (Dispatcher)',
      email: 'dispatcher@sherkar.local',
      phone: '9876543211',
      role: 'dispatcher',
      transportBusinessId: sherkarBusiness._id,
      companyId: null,
    },
    {
      name: 'Suresh Driver',
      email: 'driver1@sherkar.local',
      phone: '9876543212',
      role: 'driver',
      transportBusinessId: sherkarBusiness._id,
      companyId: null,
    },
    {
      name: 'Kulkarni (Company Admin)',
      email: 'companyadmin@tataprojects.local',
      phone: '9123456780',
      role: 'company_admin',
      transportBusinessId: sherkarBusiness._id,
      companyId: tataCompany._id,
    },
    {
      name: 'Pooja (Company Employee)',
      email: 'employee@tataprojects.local',
      phone: '9123456781',
      role: 'company_employee',
      transportBusinessId: sherkarBusiness._id,
      companyId: tataCompany._id,
    },
    {
      name: 'Apex Tenant Owner',
      email: 'otherowner@apex.local',
      phone: '9876543299',
      role: 'owner',
      transportBusinessId: apexBusiness._id,
      companyId: null,
    },
  ];

  for (const u of seedUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const createdUser = await User.create({
        ...u,
        passwordHash,
        status: 'active',
      });
      console.log(`   ✅ Seeded user: ${u.email} [${u.role}]`);

      // If driver, create Driver profile
      if (u.role === 'driver') {
        await Driver.create({
          transportBusinessId: sherkarBusiness._id,
          userId: createdUser._id,
          driverName: u.name,
          phone: u.phone,
          availabilityStatus: 'available',
        });
      }
    }
  }

  console.log('🎉 Seed complete! Default password for all test accounts is: Password123!');
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seed.js')) {
  mongoose.connect(config.mongoUri)
    .then(async () => {
      await seedDatabase();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed connection failed:', err.message);
      process.exit(1);
    });
}
