/**
 * Debug script — run with: cd backend && node src/debug-check.js
 * Checks Owner vs Driver transportBusinessId match and VehicleLocation records.
 * DELETE this file after debugging.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transport-saas';

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB\n');
  } catch (err) {
    console.error('❌ Cannot connect to MongoDB:', err.message);
    process.exit(1);
  }

  const db = mongoose.connection.db;

  // 1. Find all users with role owner or driver
  const users = await db.collection('users').find(
    { role: { $in: ['owner', 'driver'] } },
    { projection: { name: 1, email: 1, role: 1, transportBusinessId: 1, status: 1 } }
  ).toArray();

  console.log('═══ USERS (owner/driver) ═══');
  users.forEach((u) => {
    console.log(`  ${u.role.toUpperCase()} | ${u.name} (${u.email}) | transportBusinessId: ${u.transportBusinessId} | status: ${u.status}`);
  });

  // 2. Check if Owner and Driver share the same transportBusinessId
  const owners = users.filter((u) => u.role === 'owner');
  const drivers = users.filter((u) => u.role === 'driver');
  if (owners.length > 0 && drivers.length > 0) {
    const ownerTenantStr = owners[0].transportBusinessId?.toString();
    drivers.forEach((d) => {
      const driverTenantStr = d.transportBusinessId?.toString();
      const match = ownerTenantStr === driverTenantStr;
      console.log(`\n  🔗 Owner "${owners[0].name}" tenant: ${ownerTenantStr}`);
      console.log(`     Driver "${d.name}" tenant: ${driverTenantStr}`);
      console.log(`     Match: ${match ? '✅ YES' : '❌ NO — THIS IS THE BUG!'}`);
    });
  }

  // 3. Check Driver documents
  console.log('\n═══ DRIVER DOCUMENTS ═══');
  const driverDocs = await db.collection('drivers').find({}).toArray();
  if (driverDocs.length === 0) {
    console.log('  ⚠️ No Driver documents found! The driver may not have been registered via fleet management.');
  }
  driverDocs.forEach((d) => {
    console.log(`  Driver: ${d.fullName} | userId: ${d.userId} | transportBusinessId: ${d.transportBusinessId} | vehicle: ${d.currentVehicleId || 'none'}`);
  });

  // 4. Check VehicleLocation documents
  console.log('\n═══ VEHICLE LOCATIONS (Latest Snapshots) ═══');
  const locations = await db.collection('vehiclelocations').find({}).toArray();
  if (locations.length === 0) {
    console.log('  ⚠️ No VehicleLocation records! Driver GPS update never saved successfully.');
  }
  locations.forEach((loc) => {
    console.log(`  Location ID: ${loc._id}`);
    console.log(`    transportBusinessId: ${loc.transportBusinessId}`);
    console.log(`    driverId: ${loc.driverId} | vehicleId: ${loc.vehicleId || 'null'}`);
    console.log(`    coords: ${loc.latitude}, ${loc.longitude}`);
    console.log(`    address: "${loc.address || ''}"`);
    console.log(`    isSharing: ${loc.isSharing} | recordedAt: ${loc.recordedAt}`);
  });

  // 5. Check TransportBusiness
  console.log('\n═══ TRANSPORT BUSINESSES ═══');
  const businesses = await db.collection('transportbusinesses').find({}, { projection: { businessName: 1, ownerId: 1 } }).toArray();
  businesses.forEach((b) => {
    console.log(`  ${b.businessName} | _id: ${b._id} | ownerId: ${b.ownerId}`);
  });

  console.log('\n✅ Debug check complete. Delete this script after use.');
  await mongoose.disconnect();
}

run().catch(console.error);
