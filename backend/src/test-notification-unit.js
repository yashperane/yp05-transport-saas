import assert from 'assert';
import mongoose from 'mongoose';
import { notificationTemplateService } from './services/notificationTemplateService.js';
import { emailService } from './services/emailService.js';
import { Notification } from './models/Notification.js';
import { NotificationPreference } from './models/NotificationPreference.js';
import { NotificationDeliveryLog } from './models/NotificationDeliveryLog.js';

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   CHAPTER 12: NOTIFICATIONS & COMMUNICATION UNIT TESTS       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}:`, err.message);
    failed++;
  }
}

async function runAsyncTests() {
  console.log('--- 1. Notification Template Service ---');
  it('Produces correct order_created template with orderNumber and cities', () => {
    const t = notificationTemplateService.getTemplate('order_created', {
      orderNumber: 'ORD-2026-001',
      pickupCity: 'Pune',
      deliveryCity: 'Mumbai',
    });
    assert.strictEqual(t.category, 'order');
    assert.ok(t.title.includes('ORD-2026-001'));
    assert.ok(t.message.includes('Pune to Mumbai'));
  });

  it('Produces billing templates with currency formatting', () => {
    const t = notificationTemplateService.getTemplate('invoice_issued', {
      invoiceNumber: 'INV-202603-0001',
      amount: 45000,
      companyName: 'Acme Logistics',
    });
    assert.strictEqual(t.category, 'billing');
    assert.ok(t.title.includes('INV-202603-0001'));
    assert.ok(t.message.includes('₹45000'));
  });

  it('Produces driver availability templates', () => {
    const t = notificationTemplateService.getTemplate('driver_availability', {
      driverName: 'Ramesh Pawar',
      status: 'available',
    });
    assert.strictEqual(t.category, 'driver');
    assert.ok(t.message.includes('Ramesh Pawar'));
  });

  console.log('\n--- 2. Email Service Architecture ---');
  it('Gracefully falls back to dev mock when SMTP is not configured', async () => {
    const res = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Order Confirmation',
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'dev_mock');
    assert.strictEqual(res.status, 'sent');
  });

  it('Builds compliant transactional HTML without private branding', () => {
    const html = emailService.buildTemplate({
      title: 'Invoice Issued',
      message: 'Your monthly invoice is available.',
      details: [{ label: 'Invoice No', value: 'INV-101' }],
    });
    assert.ok(html.includes('Transport Management System'));
    assert.ok(html.includes('INV-101'));
    assert.ok(html.includes('<!DOCTYPE html>'));
  });

  console.log('\n--- 3. Schema & Path Validation ---');
  it('Notification schema contains category, relatedInvoiceId, and deliveryChannels', () => {
    const paths = Object.keys(Notification.schema.paths);
    assert.ok(paths.includes('category'), 'Notification missing category path');
    assert.ok(paths.includes('relatedInvoiceId'), 'Notification missing relatedInvoiceId path');
    assert.ok(paths.includes('deliveryChannels'), 'Notification missing deliveryChannels path');
  });

  it('NotificationPreference schema has channel and category toggles', () => {
    const paths = Object.keys(NotificationPreference.schema.paths);
    assert.ok(paths.includes('inAppEnabled'), 'Missing inAppEnabled');
    assert.ok(paths.includes('emailEnabled'), 'Missing emailEnabled');
    assert.ok(paths.includes('categories.orders'), 'Missing categories.orders');
    assert.ok(paths.includes('categories.billing'), 'Missing categories.billing');
  });

  it('NotificationDeliveryLog schema tracks channel and delivery status', () => {
    const paths = Object.keys(NotificationDeliveryLog.schema.paths);
    assert.ok(paths.includes('channel'), 'Missing channel');
    assert.ok(paths.includes('status'), 'Missing status');
    assert.ok(paths.includes('attemptCount'), 'Missing attemptCount');
  });

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  TEST RESULTS: ${passed} passed, ${failed} failed                            ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAsyncTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
