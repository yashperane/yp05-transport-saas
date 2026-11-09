/**
 * test-pricing-unit.js - Chapter 10 Pricing Engine & Rate Calculation Unit Tests
 */

import { strict as assert } from 'assert';
import { pricingEngine, roundMoney } from './services/pricingService.js';
import { PricingAgreement } from './models/PricingAgreement.js';
import { Order } from './models/Order.js';

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
console.log('║   CHAPTER 10: PRICING ENGINE & RATE CALCULATION UNIT TESTS   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── 1. FIXED PER-TRIP CALCULATIONS ──────────────────────────────
console.log('--- 1. Fixed Per-Trip Pricing Model ---');

test('Standard fixed trip calculates correctly', () => {
  const result = pricingEngine.calculate({
    pricingType: 'fixed_per_trip',
    agreedRate: 1500,
  });
  assert.strictEqual(result.subtotal, 1500);
  assert.strictEqual(result.finalAmount, 1500);
  assert.ok(result.calculationBreakdown.includes('Fixed per-trip rate: ₹1500'));
});

test('Fixed trip with vehicle multiplier & surcharge', () => {
  const result = pricingEngine.calculate({
    pricingType: 'fixed_per_trip',
    agreedRate: 1000,
    vehicleMultiplier: 1.5,
    vehicleSurcharge: 200,
  });
  // 1000 * 1.5 + 200 = 1700
  assert.strictEqual(result.subtotal, 1700);
  assert.strictEqual(result.finalAmount, 1700);
});

test('Fixed trip with discount and adjustment', () => {
  const result = pricingEngine.calculate({
    pricingType: 'fixed_per_trip',
    agreedRate: 1500,
    discount: 200,
    adjustment: 50, // e.g. toll/extra labour
  });
  // 1500 - 200 + 50 = 1350
  assert.strictEqual(result.finalAmount, 1350);
});

// ── 2. PER-KILOMETRE CALCULATIONS ───────────────────────────────
console.log('\n--- 2. Per-Kilometre Pricing Model ---');

test('Per-KM calculation with positive distance', () => {
  const result = pricingEngine.calculate({
    pricingType: 'per_kilometre',
    agreedRate: 18,
    billableDistance: 25,
  });
  // 25 * 18 = 450
  assert.strictEqual(result.subtotal, 450);
  assert.strictEqual(result.finalAmount, 450);
  assert.ok(result.calculationBreakdown.includes('25 KM @ ₹18/KM = ₹450'));
});

test('Per-KM calculation handles zero distance safely', () => {
  const result = pricingEngine.calculate({
    pricingType: 'per_kilometre',
    agreedRate: 20,
    billableDistance: 0,
  });
  assert.strictEqual(result.subtotal, 0);
  assert.strictEqual(result.finalAmount, 0);
});

test('Per-KM calculation rejects negative distance safely (clamps to 0)', () => {
  const result = pricingEngine.calculate({
    pricingType: 'per_kilometre',
    agreedRate: 20,
    billableDistance: -15,
  });
  assert.strictEqual(result.subtotal, 0);
  assert.strictEqual(result.finalAmount, 0);
});

test('Currency precision avoids floating-point errors (e.g. 18.33 * 3)', () => {
  const result = pricingEngine.calculate({
    pricingType: 'per_kilometre',
    agreedRate: 18.33,
    billableDistance: 3,
  });
  // 18.33 * 3 = 54.99 (not 54.990000000000005)
  assert.strictEqual(result.finalAmount, 54.99);
});

// ── 3. MONTHLY CONTRACT & CUSTOM PRICING ────────────────────────
console.log('\n--- 3. Monthly Contract & Custom Models ---');

test('Monthly contract individual trip subtotal is logged without immediate order charge', () => {
  const result = pricingEngine.calculate({
    pricingType: 'monthly_contract',
    agreedRate: 35000,
  });
  assert.strictEqual(result.subtotal, 0);
  assert.strictEqual(result.finalAmount, 0);
  assert.ok(result.calculationBreakdown.includes('Covered under Monthly Contract retainer'));
});

test('Custom negotiated pricing model computes accurate amount', () => {
  const result = pricingEngine.calculate({
    pricingType: 'custom',
    customAmount: 2750,
  });
  assert.strictEqual(result.subtotal, 2750);
  assert.strictEqual(result.finalAmount, 2750);
});

// ── 4. HISTORICAL INTEGRITY & SCHEMA SNAPSHOTS ───────────────────
console.log('\n--- 4. Historical Snapshot & Schema Validation ---');

test('Order model schema contains all required pricing snapshot paths', () => {
  const paths = Order.schema.paths;
  assert.ok(paths['pricingDetails.pricingAgreementId'], 'pricingAgreementId path required');
  assert.ok(paths['pricingDetails.pricingType'], 'pricingType path required');
  assert.ok(paths['pricingDetails.agreedRate'], 'agreedRate path required');
  assert.ok(paths['pricingDetails.billableDistance'], 'billableDistance path required');
  assert.ok(paths['pricingDetails.calculationBreakdown'], 'calculationBreakdown path required');
  assert.ok(paths['pricingDetails.finalAmount'], 'finalAmount path required');
  assert.ok(paths['pricingDetails.pricingStatus'], 'pricingStatus path required');
});

test('PricingAgreement model has all rate configurations and rule paths', () => {
  const paths = PricingAgreement.schema.paths;
  assert.ok(paths.transportBusinessId, 'transportBusinessId required');
  assert.ok(paths.companyId, 'companyId required');
  assert.ok(paths.agreementName, 'agreementName required');
  assert.ok(paths.pricingType, 'pricingType required');
  assert.ok(paths.fixedTripRate, 'fixedTripRate required');
  assert.ok(paths.perKilometreRate, 'perKilometreRate required');
  assert.ok(paths.monthlyAmount, 'monthlyAmount required');
});

// ── SUMMARY ─────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  TEST RESULTS: ${passed} passed, ${failed} failed                            ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Chapter 10 pricing engine & rate calculation unit tests passed!\n');
}
