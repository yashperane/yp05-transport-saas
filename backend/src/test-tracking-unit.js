import assert from 'assert';
import mongoose from 'mongoose';
import { VehicleLocation } from './models/VehicleLocation.js';
import { VehicleLocationHistory } from './models/VehicleLocationHistory.js';
import { trackingService } from './services/trackingService.js';

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   CHAPTER 13: GPS TELEMETRY & LIVE TRACKING UNIT TESTS       ║');
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
  console.log('--- 1. Coordinate Validation & Staleness Logic ---');
  it('Correctly flags timestamps older than 5 minutes as stale', () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    assert.strictEqual(trackingService.isStale(sixMinutesAgo), true);
    assert.strictEqual(trackingService.isStale(twoMinutesAgo), false);
    assert.strictEqual(trackingService.isStale(null), true);
  });

  it('Rejects invalid latitude and longitude ranges', async () => {
    await assert.rejects(
      async () => {
        await trackingService.updateDriverLocation({
          driverUserId: new mongoose.Types.ObjectId(),
          transportBusinessId: new mongoose.Types.ObjectId(),
          latitude: 95.0, // Invalid: > 90
          longitude: 73.8567,
        });
      },
      /Invalid latitude coordinates/
    );

    await assert.rejects(
      async () => {
        await trackingService.updateDriverLocation({
          driverUserId: new mongoose.Types.ObjectId(),
          transportBusinessId: new mongoose.Types.ObjectId(),
          latitude: 18.5204,
          longitude: 195.0, // Invalid: > 180
        });
      },
      /Invalid longitude coordinates/
    );
  });

  console.log('\n--- 2. Schema Integrity & Index Validation ---');
  it('VehicleLocation schema contains required telemetry paths', () => {
    const paths = Object.keys(VehicleLocation.schema.paths);
    assert.ok(paths.includes('latitude'), 'Missing latitude');
    assert.ok(paths.includes('longitude'), 'Missing longitude');
    assert.ok(paths.includes('heading'), 'Missing heading');
    assert.ok(paths.includes('speed'), 'Missing speed');
    assert.ok(paths.includes('accuracy'), 'Missing accuracy');
    assert.ok(paths.includes('isSharing'), 'Missing isSharing');
    assert.ok(paths.includes('recordedAt'), 'Missing recordedAt');
  });

  it('VehicleLocationHistory schema contains 30-day TTL index', () => {
    const indexes = VehicleLocationHistory.schema.indexes();
    const ttlIndex = indexes.find(
      (idx) => idx[0] && idx[0].recordedAt === 1 && idx[1] && idx[1].expireAfterSeconds
    );
    assert.ok(ttlIndex, 'Missing TTL index on recordedAt in VehicleLocationHistory');
    assert.strictEqual(ttlIndex[1].expireAfterSeconds, 60 * 60 * 24 * 30);
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
