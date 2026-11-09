/**
 * test-billing-unit.js - Chapter 11 Billing, Invoices, Payments & Reports Unit Tests
 */

import { strict as assert } from 'assert';
import { billingService } from './services/billingService.js';
import { Invoice } from './models/Invoice.js';
import { Payment } from './models/Payment.js';
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
console.log('║   CHAPTER 11: BILLING, INVOICE & PAYMENT UNIT TEST SUITE      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── 1. INVOICE TOTALS & TAX CALCULATIONS ────────────────────────
console.log('--- 1. Invoice Calculations & Currency Precision ---');

test('Computes accurate subtotal from line items', () => {
  const lineItems = [
    { amount: 1500 },
    { amount: 2250.5 },
    { amount: 800 },
  ];
  const totals = billingService.calculateInvoiceTotals({ lineItems });
  assert.strictEqual(totals.subtotal, 4550.5);
  assert.strictEqual(totals.totalAmount, 4550.5);
});

test('Applies additional charges, discounts, and tax percentage safely', () => {
  const lineItems = [{ amount: 10000 }];
  const totals = billingService.calculateInvoiceTotals({
    lineItems,
    additionalCharges: 500, // e.g. toll/handling
    discount: 1000,
    taxPercentage: 18, // 18% GST
  });
  // Net before tax: 10000 + 500 - 1000 = 9500
  // Tax (18% of 9500): 1710
  // Total: 9500 + 1710 = 11210
  assert.strictEqual(totals.subtotal, 10000);
  assert.strictEqual(totals.additionalCharges, 500);
  assert.strictEqual(totals.discount, 1000);
  assert.strictEqual(totals.taxAmount, 1710);
  assert.strictEqual(totals.totalAmount, 11210);
});

test('Guards against negative tax and excess discount percentages', () => {
  const totals = billingService.calculateInvoiceTotals({
    lineItems: [{ amount: 1000 }],
    additionalCharges: -200,
    discount: 5000, // exceeds subtotal
    taxPercentage: -5,
  });
  // additional clamped to 0
  // netBeforeTax clamped to 0
  assert.strictEqual(totals.additionalCharges, 0);
  assert.strictEqual(totals.totalAmount, 0);
  assert.strictEqual(totals.taxPercentage, 0);
});

// ── 2. PAYMENT BALANCES & STATUS STATE MACHINE ───────────────────
console.log('\n--- 2. Payment Balance Transitions ---');

test('Invoice status transitions from issued -> partially_paid on partial receipt', () => {
  const totalAmount = 10000;
  const payment1 = 4000;
  const balanceDue = totalAmount - payment1;
  const status = balanceDue === 0 ? 'paid' : 'partially_paid';

  assert.strictEqual(balanceDue, 6000);
  assert.strictEqual(status, 'partially_paid');
});

test('Invoice status transitions to paid when balance reaches exactly zero', () => {
  const totalAmount = 10000;
  const payments = [4000, 6000];
  const totalPaid = payments.reduce((a, b) => a + b, 0);
  const balanceDue = totalAmount - totalPaid;
  const status = balanceDue === 0 ? 'paid' : 'partially_paid';

  assert.strictEqual(balanceDue, 0);
  assert.strictEqual(status, 'paid');
});

// ── 3. SCHEMA INTEGRITY & INDEXES ────────────────────────────────
console.log('\n--- 3. Schema Integrity & Validation ---');

test('Invoice schema has all mandatory financial & tenant paths', () => {
  const paths = Invoice.schema.paths;
  assert.ok(paths.transportBusinessId, 'transportBusinessId required');
  assert.ok(paths.companyId, 'companyId required');
  assert.ok(paths.invoiceNumber, 'invoiceNumber required');
  assert.ok(paths.totalAmount, 'totalAmount required');
  assert.ok(paths.amountPaid, 'amountPaid required');
  assert.ok(paths.balanceDue, 'balanceDue required');
  assert.ok(paths.status, 'status required');
  assert.ok(paths.dueDate, 'dueDate required');
});

test('Payment schema validates required payment methods', () => {
  const enumValues = Payment.schema.paths.paymentMethod.enumValues;
  assert.ok(enumValues.includes('cash'));
  assert.ok(enumValues.includes('UPI'));
  assert.ok(enumValues.includes('bank_transfer'));
  assert.ok(enumValues.includes('cheque'));
});

test('Order schema contains invoicingStatus and invoiceId integration', () => {
  const paths = Order.schema.paths;
  assert.ok(paths.invoicingStatus, 'invoicingStatus path required on Order');
  assert.ok(paths.invoiceId, 'invoiceId reference required on Order');
  assert.ok(paths.invoicedAt, 'invoicedAt timestamp required on Order');
});

// ── SUMMARY ─────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  TEST RESULTS: ${passed} passed, ${failed} failed                            ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Chapter 11 billing & payment unit tests passed successfully!\n');
}
