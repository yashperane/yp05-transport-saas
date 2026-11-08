/**
 * test-dispatch.js — Chapter 7 Automated Test Suite
 *
 * Tests:
 *  Manual Assignment (1–9)
 *  Driver Self-Claim (10–18)
 *  Concurrent Claim Race Condition (15–17)
 *  Reassignment (19–23)
 *  Order Workflow (24–28)
 *
 * Run: node src/test-dispatch.js
 * Requires: Backend server running on localhost:5000
 *           MongoDB populated with seed data OR fresh register calls below
 */

const BASE_URL = 'http://localhost:5000';

let passed = 0;
let failed = 0;

// ─── Helpers ────────────────────────────────────────────────
const assert = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
};

const api = async (method, path, body, token) => {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, body: data };
};

// ─── Setup: Register test accounts ─────────────────────────
let ownerToken, driver1Token, driver2Token;
let transportBusinessId;
let ownerDriverId, driver1Id, driver2Id;
let vehicle1Id;
let testOrderId1, testOrderId2;

const setupTestData = async () => {
  console.log('\n📋 Setting up test data...\n');

  // Register owner (creates a transport business)
  const ownerEmail = `dispatch-test-owner-${Date.now()}@test.com`;
  const ownerReg = await api('POST', '/api/auth/register', {
    name: 'Test Owner Dispatch',
    email: ownerEmail,
    password: 'OwnerPass@123',
    role: 'owner',
    businessName: `Dispatch Test Business ${Date.now()}`,
    phone: '9000000001',
  });

  assert('Owner registration succeeded', ownerReg.status === 201, JSON.stringify(ownerReg.body.error));
  ownerToken = ownerReg.body.data?.token;
  transportBusinessId = ownerReg.body.data?.user?.transportBusinessId;

  // Create Driver 1 (via fleet API)
  const d1email = `d1-${Date.now()}@test.com`;
  const d1 = await api('POST', '/api/fleet/drivers', {
    fullName: 'Driver One Test',
    phoneNumber: '9000000011',
    email: d1email,
    password: 'DriverPass@123',
    licenseNumber: 'DL-TEST-001',
    licenseType: 'LMV',
  }, ownerToken);

  assert('Driver 1 creation succeeded', d1.status === 201, JSON.stringify(d1.body.error));
  driver1Id = d1.body.data?.driver?._id;

  // Login as driver 1
  const d1Login = await api('POST', '/api/auth/login', { email: d1email, password: 'DriverPass@123' });
  assert('Driver 1 login succeeded', d1Login.status === 200);
  driver1Token = d1Login.body.data?.token;

  // Create Driver 2
  const d2email = `d2-${Date.now()}@test.com`;
  const d2 = await api('POST', '/api/fleet/drivers', {
    fullName: 'Driver Two Test',
    phoneNumber: '9000000022',
    email: d2email,
    password: 'DriverPass@123',
    licenseNumber: 'DL-TEST-002',
    licenseType: 'LMV',
  }, ownerToken);

  assert('Driver 2 creation succeeded', d2.status === 201, JSON.stringify(d2.body.error));
  driver2Id = d2.body.data?.driver?._id;

  const d2Login = await api('POST', '/api/auth/login', { email: d2email, password: 'DriverPass@123' });
  assert('Driver 2 login succeeded', d2Login.status === 200);
  driver2Token = d2Login.body.data?.token;

  // Create a vehicle
  const v1 = await api('POST', '/api/fleet/vehicles', {
    registrationNumber: `TEST-V-${Date.now()}`,
    vehicleType: 'pickup',
    vehicleNumber: 'V-TEST-01',
  }, ownerToken);
  assert('Vehicle creation succeeded', v1.status === 201);
  vehicle1Id = v1.body.data?.vehicle?._id;

  // Create test order 1
  const o1 = await api('POST', '/api/orders', {
    pickupAddress: '123 Test Street, Pune',
    destinationAddress: '456 Delivery Avenue, Mumbai',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Test goods for dispatch test',
    requiredVehicleType: 'pickup',
  }, ownerToken);
  assert('Test order 1 created', o1.status === 201, JSON.stringify(o1.body.error));
  testOrderId1 = o1.body.data?.order?._id;

  // Create test order 2 (for self-claim concurrent test)
  const o2 = await api('POST', '/api/orders', {
    pickupAddress: '789 Concurrent Street, Pune',
    destinationAddress: '101 Race Condition Road, Mumbai',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Concurrent claim test order',
    requiredVehicleType: 'pickup',
  }, ownerToken);
  assert('Test order 2 created', o2.status === 201);
  testOrderId2 = o2.body.data?.order?._id;

  console.log(`\n  Business ID: ${transportBusinessId}`);
  console.log(`  Driver1 ID: ${driver1Id}`);
  console.log(`  Driver2 ID: ${driver2Id}`);
  console.log(`  Vehicle1 ID: ${vehicle1Id}`);
  console.log(`  Order1 ID: ${testOrderId1}`);
  console.log(`  Order2 ID: ${testOrderId2}\n`);
};

// ═════════════════════════════════════════════════════════════
// SUITE 1: MANUAL ASSIGNMENT TESTS
// ═════════════════════════════════════════════════════════════
const testManualAssignment = async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUITE 1: Manual Assignment Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Owner can dispatch an eligible order
  const dispatch1 = await api('POST', `/api/orders/${testOrderId1}/dispatch`, {
    driverId: driver1Id,
    vehicleId: vehicle1Id,
    notes: 'First test dispatch',
  }, ownerToken);
  assert('Test 1: Owner dispatches eligible order', dispatch1.status === 200,
    JSON.stringify(dispatch1.body.error));
  assert('Test 1b: Order status is now assigned',
    dispatch1.body.data?.order?.status === 'assigned');

  // Test 2: Cannot reassign directly (order now 'assigned', must use reassign endpoint)
  const dispatch2 = await api('POST', `/api/orders/${testOrderId1}/dispatch`, {
    driverId: driver2Id,
  }, ownerToken);
  assert('Test 2: Cannot dispatch already-assigned order without reassign', dispatch2.status === 400,
    JSON.stringify(dispatch2.body.error));

  // Test 3: Unauthorized role (driver) cannot manually dispatch
  const dispatch3 = await api('POST', `/api/orders/${testOrderId1}/dispatch`, {
    driverId: driver1Id,
  }, driver1Token);
  assert('Test 3: Driver cannot manually dispatch', dispatch3.status === 403);

  // Test 4: Get eligible drivers
  // Create a fresh order for this
  const freshOrder = await api('POST', '/api/orders', {
    pickupAddress: 'Fresh pickup',
    destinationAddress: 'Fresh destination',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Fresh order material',
  }, ownerToken);
  const freshOrderId = freshOrder.body.data?.order?._id;
  const eligibleDrivers = await api('GET', `/api/orders/${freshOrderId}/eligible-drivers`, null, ownerToken);
  assert('Test 4: Get eligible drivers returns list', eligibleDrivers.status === 200 &&
    Array.isArray(eligibleDrivers.body.data?.drivers));

  // Test 5: Dispatch with inactive driver
  // Set driver 2 to inactive
  await api('PATCH', `/api/fleet/drivers/${driver2Id}/status`, {
    employmentStatus: 'inactive',
  }, ownerToken);

  const dispatch5 = await api('POST', `/api/orders/${freshOrderId}/dispatch`, {
    driverId: driver2Id,
  }, ownerToken);
  assert('Test 5: Inactive driver rejected from assignment', dispatch5.status === 400 &&
    dispatch5.body.error?.code === 'DRIVER_INELIGIBLE');

  // Restore driver 2 status
  await api('PATCH', `/api/fleet/drivers/${driver2Id}/status`, {
    employmentStatus: 'active',
  }, ownerToken);
};

// ═════════════════════════════════════════════════════════════
// SUITE 2: DRIVER SELF-CLAIM TESTS
// ═════════════════════════════════════════════════════════════
const testSelfClaim = async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUITE 2: Driver Self-Claim Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create a fresh order for self-claim tests
  const scOrder = await api('POST', '/api/orders', {
    pickupAddress: 'Self-claim Pickup',
    destinationAddress: 'Self-claim Destination',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Self-claim test material',
  }, ownerToken);
  const scOrderId = scOrder.body.data?.order?._id;

  // Test 6: Driver cannot claim a pending order (not yet made available)
  const claim6 = await api('POST', `/api/orders/${scOrderId}/claim`, {}, driver2Token);
  assert('Test 6: Driver cannot claim a pending order',
    claim6.status === 409 || claim6.status === 400 || claim6.status === 404,
    JSON.stringify(claim6.body.error));

  // Make order available
  const makeAvail = await api('POST', `/api/orders/${scOrderId}/make-available`, {}, ownerToken);
  assert('Test 6b: Owner publishes order for self-claim', makeAvail.status === 200);

  // Test 7: Check available orders visible to driver 2
  const availOrders = await api('GET', '/api/driver/orders/available', null, driver2Token);
  assert('Test 7: Driver 2 can view available orders', availOrders.status === 200 &&
    Array.isArray(availOrders.body.data?.orders));

  // Test 8: Driver 2 claims the order
  const claim8 = await api('POST', `/api/orders/${scOrderId}/claim`, {}, driver2Token);
  assert('Test 8: Driver 2 successfully claims available order', claim8.status === 200,
    JSON.stringify(claim8.body.error));
  assert('Test 8b: Order status is now assigned',
    claim8.body.data?.order?.status === 'assigned');

  // Test 9: Driver 1 attempts to claim the ALREADY CLAIMED order (must fail)
  const claim9 = await api('POST', `/api/orders/${scOrderId}/claim`, {}, driver1Token);
  assert('Test 9: Second claim returns 409 Conflict',
    claim9.status === 409,
    `Got ${claim9.status}: ${JSON.stringify(claim9.body)}`);
  assert('Test 9b: Error code is ORDER_ALREADY_CLAIMED',
    claim9.body.error?.code === 'ORDER_ALREADY_CLAIMED');
};

// ═════════════════════════════════════════════════════════════
// SUITE 3: CONCURRENT RACE CONDITION TEST
// ═════════════════════════════════════════════════════════════
const testConcurrentClaim = async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUITE 3: Concurrent Claim Race Condition');
  console.log('  (Both drivers press Accept simultaneously)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create a fresh order
  const raceOrder = await api('POST', '/api/orders', {
    pickupAddress: 'Race Condition Pickup',
    destinationAddress: 'Race Condition Destination',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Race condition test material',
  }, ownerToken);
  const raceOrderId = raceOrder.body.data?.order?._id;

  // Make available
  await api('POST', `/api/orders/${raceOrderId}/make-available`, {}, ownerToken);

  // Set both drivers as available (driver 2 might be busy from previous test)
  await api('PATCH', `/api/fleet/drivers/${driver2Id}/status`, {
    availabilityStatus: 'available',
  }, ownerToken);
  await api('PATCH', `/api/fleet/drivers/${driver1Id}/status`, {
    availabilityStatus: 'available',
  }, ownerToken);

  console.log('  🏁 Both drivers simultaneously send claim requests...');

  // Send BOTH requests simultaneously using Promise.all — true concurrent HTTP requests
  const [result1, result2] = await Promise.all([
    api('POST', `/api/orders/${raceOrderId}/claim`, {}, driver1Token),
    api('POST', `/api/orders/${raceOrderId}/claim`, {}, driver2Token),
  ]);

  const statuses = [result1.status, result2.status];
  const successCount = statuses.filter((s) => s === 200).length;
  const conflictCount = statuses.filter((s) => s === 409).length;

  console.log(`  Driver 1 response: HTTP ${result1.status}`);
  console.log(`  Driver 2 response: HTTP ${result2.status}`);

  // Test 10: Exactly ONE driver succeeds
  assert('Test 10: Exactly one claim succeeds (200)',
    successCount === 1,
    `Success count: ${successCount}`);

  // Test 11: Exactly ONE driver gets 409 Conflict
  assert('Test 11: Exactly one claim gets 409 Conflict',
    conflictCount === 1,
    `Conflict count: ${conflictCount}`);

  // Test 12: Verify database has only ONE driver assigned
  const finalOrder = await api('GET', `/api/orders/${raceOrderId}`, null, ownerToken);
  const assignedDriverCount = finalOrder.body.data?.order?.assignedDriverId ? 1 : 0;
  assert('Test 12: Database has exactly one driver assigned',
    assignedDriverCount === 1,
    `Assigned driver: ${finalOrder.body.data?.order?.assignedDriverId}`);
  assert('Test 12b: Order status is assigned (not still available)',
    finalOrder.body.data?.order?.status === 'assigned');

  // Test 13: Assignment history has exactly ONE active record
  const history = await api('GET', `/api/orders/${raceOrderId}/assignments`, null, ownerToken);
  const activeAssignments = history.body.data?.assignments?.filter(a => a.status === 'active') || [];
  assert('Test 13: Assignment history has exactly one active record',
    activeAssignments.length === 1,
    `Active records: ${activeAssignments.length}`);
};

// ═════════════════════════════════════════════════════════════
// SUITE 4: REASSIGNMENT TESTS
// ═════════════════════════════════════════════════════════════
const testReassignment = async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUITE 4: Reassignment Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create and assign a fresh order
  const rOrder = await api('POST', '/api/orders', {
    pickupAddress: 'Reassign Pickup',
    destinationAddress: 'Reassign Destination',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Reassign test material',
  }, ownerToken);
  const rOrderId = rOrder.body.data?.order?._id;

  // Set driver 1 as available
  await api('PATCH', `/api/fleet/drivers/${driver1Id}/status`, {
    availabilityStatus: 'available',
  }, ownerToken);
  await api('PATCH', `/api/fleet/drivers/${driver2Id}/status`, {
    availabilityStatus: 'available',
    employmentStatus: 'active',
  }, ownerToken);

  // Assign driver 1
  await api('POST', `/api/orders/${rOrderId}/dispatch`, {
    driverId: driver1Id,
  }, ownerToken);

  // Test 14: Reassign to driver 2
  const reassign14 = await api('POST', `/api/orders/${rOrderId}/reassign`, {
    driverId: driver2Id,
    reason: 'Driver 1 called in sick',
  }, ownerToken);
  assert('Test 14: Owner can reassign an assigned order', reassign14.status === 200,
    JSON.stringify(reassign14.body.error));
  assert('Test 14b: New driver is assigned',
    reassign14.body.data?.order?.assignedDriverId !== null);

  // Test 15: Previous assignment history is preserved
  const history15 = await api('GET', `/api/orders/${rOrderId}/assignments`, null, ownerToken);
  const allAssignments = history15.body.data?.assignments || [];
  const reassignedRecord = allAssignments.find(a => a.status === 'reassigned');
  assert('Test 15: Previous assignment preserved as "reassigned"',
    reassignedRecord !== undefined,
    `All assignments: ${JSON.stringify(allAssignments.map(a => a.status))}`);

  // Test 16: Cannot reassign without a reason
  const reassign16 = await api('POST', `/api/orders/${rOrderId}/reassign`, {
    driverId: driver1Id,
  }, ownerToken);
  assert('Test 16: Reassignment without reason is rejected', reassign16.status === 400);

  // Test 17: Unauthorized user cannot reassign
  const reassign17 = await api('POST', `/api/orders/${rOrderId}/reassign`, {
    driverId: driver1Id,
    reason: 'Unauthorized attempt',
  }, driver2Token);
  assert('Test 17: Driver cannot reassign orders', reassign17.status === 403);
};

// ═════════════════════════════════════════════════════════════
// SUITE 5: ORDER WORKFLOW TESTS (accept → start → complete)
// ═════════════════════════════════════════════════════════════
const testOrderWorkflow = async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUITE 5: Order Workflow Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create order and assign to driver 1
  const wOrder = await api('POST', '/api/orders', {
    pickupAddress: 'Workflow Pickup',
    destinationAddress: 'Workflow Destination',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Workflow test material',
  }, ownerToken);
  const wOrderId = wOrder.body.data?.order?._id;

  await api('PATCH', `/api/fleet/drivers/${driver1Id}/status`, {
    availabilityStatus: 'available',
  }, ownerToken);

  await api('POST', `/api/orders/${wOrderId}/dispatch`, {
    driverId: driver1Id,
  }, ownerToken);

  // Test 18: Driver 1 accepts the order
  const accept18 = await api('POST', `/api/orders/${wOrderId}/accept`, {}, driver1Token);
  assert('Test 18: Driver can accept assigned order', accept18.status === 200,
    JSON.stringify(accept18.body.error));
  assert('Test 18b: Status becomes accepted', accept18.body.data?.order?.status === 'accepted');

  // Test 19: Driver 1 starts the job
  const start19 = await api('POST', `/api/orders/${wOrderId}/start`, {}, driver1Token);
  assert('Test 19: Driver can start accepted order', start19.status === 200,
    JSON.stringify(start19.body.error));
  assert('Test 19b: Status becomes in_progress', start19.body.data?.order?.status === 'in_progress');

  // Test 20: Driver 2 cannot interfere with driver 1's order
  const interfere20 = await api('POST', `/api/orders/${wOrderId}/complete`, {}, driver2Token);
  assert('Test 20: Driver 2 cannot complete driver 1 order', interfere20.status === 404);

  // Test 21: Driver 1 completes the job
  const complete21 = await api('POST', `/api/orders/${wOrderId}/complete`, {}, driver1Token);
  assert('Test 21: Driver can complete in-progress order', complete21.status === 200,
    JSON.stringify(complete21.body.error));
  assert('Test 21b: Status becomes completed', complete21.body.data?.order?.status === 'completed');

  // Test 22: Cannot dispatch a completed order
  const dispatch22 = await api('POST', `/api/orders/${wOrderId}/dispatch`, {
    driverId: driver2Id,
  }, ownerToken);
  assert('Test 22: Cannot dispatch completed order', dispatch22.status === 400);

  // Test 23: Driver rejects an assigned order
  const rejectOrder = await api('POST', '/api/orders', {
    pickupAddress: 'Reject Pickup',
    destinationAddress: 'Reject Destination',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'Reject test',
  }, ownerToken);
  const rejectOrderId = rejectOrder.body.data?.order?._id;
  await api('PATCH', `/api/fleet/drivers/${driver1Id}/status`, { availabilityStatus: 'available' }, ownerToken);
  await api('POST', `/api/orders/${rejectOrderId}/dispatch`, { driverId: driver1Id }, ownerToken);

  const reject23 = await api('POST', `/api/orders/${rejectOrderId}/reject`, {
    reason: 'Vehicle not suitable for load',
  }, driver1Token);
  assert('Test 23: Driver can reject assigned order with reason', reject23.status === 200,
    JSON.stringify(reject23.body.error));
  assert('Test 23b: Order returns to pending', reject23.body.data?.order?.status === 'pending');

  // Test 24: Reject without reason fails
  const freshForReject = await api('POST', '/api/orders', {
    pickupAddress: 'No Reason Pickup',
    destinationAddress: 'No Reason Destination',
    requiredDate: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'goods',
    materialDescription: 'No reason reject test',
  }, ownerToken);
  const noReasonId = freshForReject.body.data?.order?._id;
  await api('PATCH', `/api/fleet/drivers/${driver1Id}/status`, { availabilityStatus: 'available' }, ownerToken);
  await api('POST', `/api/orders/${noReasonId}/dispatch`, { driverId: driver1Id }, ownerToken);
  const reject24 = await api('POST', `/api/orders/${noReasonId}/reject`, {}, driver1Token);
  assert('Test 24: Reject without reason fails validation', reject24.status === 400);
};

// ═════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═════════════════════════════════════════════════════════════
const run = async () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Chapter 7 — Dispatch System Test Suite     ║');
  console.log('╚══════════════════════════════════════════════╝');

  try {
    await setupTestData();
    await testManualAssignment();
    await testSelfClaim();
    await testConcurrentClaim();
    await testReassignment();
    await testOrderWorkflow();
  } catch (err) {
    console.error('\n💥 Test suite crashed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed                 ║`);
  console.log('╚══════════════════════════════════════════════╝\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All dispatch tests passed!\n');
    process.exit(0);
  }
};

run();
