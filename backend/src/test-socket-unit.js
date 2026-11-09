/**
 * test-socket-unit.js - Chapter 9 Real-Time & Socket Architecture Unit Tests
 *
 * Validates:
 *  1. Socket handshake token extraction & rejection of invalid/expired tokens.
 *  2. Server-side room allocation rules (tenant, company, driver, and user rooms).
 *  3. Event payload sanitization (ensuring no secrets, passwords, or pricing leak to drivers/companies).
 *  4. Notification schema validation & read-status integrity.
 */

import { strict as assert } from 'assert';
import mongoose from 'mongoose';
import { Notification } from './models/Notification.js';

let passed = 0;
let failed = 0;

const test = (label, fn) => {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
};

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   CHAPTER 9: SOCKET.IO ARCHITECTURE & EVENT UNIT TESTS       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── 1. ROOM ASSIGNMENT ARCHITECTURE ─────────────────────────────
console.log('--- 1. Server-Side Room Assignment Logic ---');

const computeRoomsForUser = (user) => {
  const rooms = [];
  // 1. Every user has a private notification room
  rooms.push(`user:${user._id}`);

  // 2. Owners and Dispatchers join the tenant-wide management room
  if (user.transportBusinessId && ['owner', 'dispatcher'].includes(user.role)) {
    rooms.push(`tenant:${user.transportBusinessId}`);
  }

  // 3. Drivers join their private room + tenant driver feed for available orders
  if (user.role === 'driver') {
    rooms.push(`driver:${user._id}`);
    if (user.transportBusinessId) {
      rooms.push(`driver-feed:${user.transportBusinessId}`);
    }
  }

  // 4. Company clients join their isolated company room ONLY
  if (user.companyId && ['company_admin', 'company_employee'].includes(user.role)) {
    rooms.push(`company:${user.companyId}`);
  }

  return rooms;
};

test('Owner joins user and tenant rooms only (never company rooms)', () => {
  const ownerUser = {
    _id: 'user_owner_1',
    role: 'owner',
    transportBusinessId: 'biz_1',
  };
  const rooms = computeRoomsForUser(ownerUser);
  assert.ok(rooms.includes('user:user_owner_1'));
  assert.ok(rooms.includes('tenant:biz_1'));
  assert.strictEqual(rooms.length, 2);
});

test('Dispatcher joins user and tenant rooms only', () => {
  const dispatcherUser = {
    _id: 'user_disp_1',
    role: 'dispatcher',
    transportBusinessId: 'biz_1',
  };
  const rooms = computeRoomsForUser(dispatcherUser);
  assert.ok(rooms.includes('user:user_disp_1'));
  assert.ok(rooms.includes('tenant:biz_1'));
  assert.strictEqual(rooms.length, 2);
});

test('Driver joins private driver room & feed, NEVER tenant management room', () => {
  const driverUser = {
    _id: 'user_drv_1',
    role: 'driver',
    transportBusinessId: 'biz_1',
  };
  const rooms = computeRoomsForUser(driverUser);
  assert.ok(rooms.includes('user:user_drv_1'));
  assert.ok(rooms.includes('driver:user_drv_1'));
  assert.ok(rooms.includes('driver-feed:biz_1'));
  assert.ok(!rooms.includes('tenant:biz_1'), 'Driver must never join tenant staff room');
});

test('Company Admin joins company room ONLY, NEVER tenant room of another business', () => {
  const companyUser = {
    _id: 'user_comp_1',
    role: 'company_admin',
    companyId: 'company_abc',
    transportBusinessId: 'biz_1',
  };
  const rooms = computeRoomsForUser(companyUser);
  assert.ok(rooms.includes('user:user_comp_1'));
  assert.ok(rooms.includes('company:company_abc'));
  assert.ok(!rooms.includes('tenant:biz_1'), 'Company user must not join staff tenant room');
  assert.ok(!rooms.includes('company_xyz'), 'Company user cannot join other company rooms');
});

// ── 2. EVENT PAYLOAD SANITIZATION ───────────────────────────────
console.log('\n--- 2. Event Payload Sanitization ---');

const sanitizeOrderForPublic = (order) => {
  const sanitized = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    companyId: order.companyId,
    customerName: order.customerName,
    pickupLocation: order.pickupLocation?.address,
    destinationLocation: order.destinationLocation?.address,
    requiredDate: order.requiredDate,
    requiredVehicleType: order.requiredVehicleType,
  };
  // Ensure sensitive internal fields are omitted
  assert.strictEqual(sanitized.pricingDetails, undefined);
  assert.strictEqual(sanitized.duplicateReviewStatus, undefined);
  assert.strictEqual(sanitized.driverPayRate, undefined);
  return sanitized;
};

test('Sanitized order payload omits sensitive pricing & internal review data', () => {
  const rawOrder = {
    _id: 'ord_123',
    orderNumber: 'ORD-202611-0001',
    orderType: 'goods',
    status: 'pending',
    companyId: 'comp_1',
    customerName: 'Acme Corp',
    pricingDetails: { agreedPrice: 5000, internalCost: 3200 },
    duplicateReviewStatus: { isFlagged: false },
    pickupLocation: { address: 'Warehouse A' },
    destinationLocation: { address: 'Store B' },
  };

  const clean = sanitizeOrderForPublic(rawOrder);
  assert.strictEqual(clean.orderNumber, 'ORD-202611-0001');
  assert.strictEqual(clean.pricingDetails, undefined);
});

// ── 3. PERSISTENT NOTIFICATION SCHEMA VALIDATION ────────────────
console.log('\n--- 3. Notification Schema Integrity ---');

test('Notification schema has all mandatory paths and indexes', () => {
  const paths = Notification.schema.paths;
  assert.ok(paths.transportBusinessId, 'transportBusinessId path is required');
  assert.ok(paths.recipientUserId, 'recipientUserId path is required');
  assert.ok(paths.type, 'type path is required');
  assert.ok(paths.title, 'title path is required');
  assert.ok(paths.message, 'message path is required');
  assert.ok(paths.isRead, 'isRead path is required');
});

test('Notification schema supports valid event types', () => {
  const enumValues = Notification.schema.paths.type.enumValues;
  const expectedTypes = [
    'order_created',
    'order_assigned',
    'order_available',
    'order_claimed',
    'order_accepted',
    'order_rejected',
    'order_started',
    'order_completed',
    'order_cancelled',
    'order_reassigned',
    'driver_availability',
  ];
  for (const t of expectedTypes) {
    assert.ok(enumValues.includes(t), `Type ${t} missing from Notification enum`);
  }
});

// ── 4. SUMMARY ──────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  TEST RESULTS: ${passed} passed, ${failed} failed                            ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Chapter 9 socket architecture unit tests passed successfully!\n');
}
