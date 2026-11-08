# Database Design & Schemas — Transport SaaS Project

## 1. Overview & Principles

MongoDB with Mongoose ODM is used.

### Golden Schema Principles:
1. **Embedding vs. Referencing**:
   - **Referencing (`ObjectId ref`)**: Used for primary independent entities (`TransportBusiness`, `User`, `Company`, `Driver`, `Vehicle`, `Order`, `PricingAgreement`). This prevents unbounded document growth, enables independent updates, and avoids locking issues.
   - **Embedding (Subdocuments)**: Used for strictly bounded data that has no life outside the parent document, such as:
     - Geocoding location details inside an `Order` (`address`, `coordinates`, `landmark`).
     - Configuration settings inside `TransportBusiness` (`driverVisibility`, `trackingVisibility`).
     - State change details in `OrderHistory`.
2. **Audit Trail**: Operational state changes are mirrored into an append-only collection (`OrderHistory`).
3. **Atomic Operations**: Critical actions like driver order claiming use Mongoose conditional updates (`findOneAndUpdate({ _id: orderId, status: 'available' }, { status: 'claimed', assignedDriverId: driverId })`) rather than read-then-write, guaranteeing no race conditions between drivers.

---

## 2. Collections & Schema Definitions

### 1. `TransportBusinesses`
The root tenant account on the platform.
- `_id`: ObjectId
- `name`: String, required, trimmed
- `businessCode`: String, unique index, uppercase, alphanumeric code (e.g. `SHERKAR-TRP`)
- `contactName`: String, required
- `phone`: String, required
- `email`: String, required, lowercase
- `address`: String
- `status`: String, enum: `['active', 'suspended', 'trial']`, default: `'active'`
- `settings`: Subdocument:
  - `driverVisibility`: enum `['assigned_only', 'available_only', 'assigned_and_available']`, default: `'assigned_and_available'`
  - `companyTrackingVisibility`: enum `['status_only', 'status_and_eta', 'full_tracking']`, default: `'status_only'`
  - `allowDriverSelfAssignment`: Boolean, default: `true`
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### 2. `Users`
Authentication and role-based access.
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required (null only for `super_admin`)
- `companyId`: ObjectId, ref: `'Company'`, optional (populated for company-level users)
- `name`: String, required
- `email`: String, required, lowercase, trimmed
- `phone`: String, required
- `passwordHash`: String, required (bcrypt hash, never plain-text)
- `role`: String, enum: `['super_admin', 'owner', 'dispatcher', 'driver', 'company_admin', 'company_employee']`, required
- `status`: String, enum: `['active', 'inactive', 'suspended']`, default: `'active'`
- `permissions`: [String] (optional granular overrides)
- `lastLoginAt`: Date
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- **Indexes**:
  - `{ email: 1 }` (unique)
  - `{ transportBusinessId: 1, role: 1 }`

### 3. `Companies`
Client companies, contractors, or individual customers.
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required, indexed
- `companyName`: String, required, trimmed
- `companyCode`: String, uppercase
- `contactPerson`: String, required
- `phone`: String, required
- `email`: String, lowercase
- `address`: String
- `billingAddress`: String
- `status`: String, enum: `['active', 'inactive', 'blocked']`, default: `'active'`
- `pricingAgreementId`: ObjectId, ref: `'PricingAgreement'`
- `settings`: Subdocument:
  - `requireOrderApproval`: Boolean, default: `false`
  - `trackingVisibilityOverride`: enum `['inherit', 'status_only', 'status_and_eta', 'full_tracking']`, default: `'inherit'`
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- **Indexes**:
  - `{ transportBusinessId: 1, companyName: 1 }`
  - `{ transportBusinessId: 1, companyCode: 1 }`

### 4. `Drivers`
Driver profile & operational state.
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required, indexed
- `userId`: ObjectId, ref: `'User'`, required, unique (links to login credentials)
- `driverName`: String, required
- `phone`: String, required
- `licenseDetails`:
  - `licenseNumber`: String
  - `expiryDate`: Date
- `availabilityStatus`: String, enum: `['available', 'busy', 'offline', 'on_leave']`, default: `'available'`
- `currentVehicleId`: ObjectId, ref: `'Vehicle'`, optional
- `trackingConsentStatus`: enum `['granted', 'denied', 'pending']`, default: `'pending'`
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### 5. `Vehicles`
Vehicle fleet registry.
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required, indexed
- `registrationNumber`: String, required, uppercase, trimmed
- `vehicleType`: String, enum: `['pickup', 'tempo', 'truck', 'trailer', 'other']`, default: `'pickup'`
- `capacity`:
  - `weightKg`: Number
  - `workerSeats`: Number
- `assignedDriverId`: ObjectId, ref: `'Driver'`
- `availabilityStatus`: String, enum: `['available', 'assigned', 'on_trip', 'unavailable', 'maintenance']`, default: `'available'`
- `notes`: String
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- **Indexes**:
  - `{ transportBusinessId: 1, registrationNumber: 1 }` (unique compound index)

### 6. `PricingAgreements`
Custom pricing contracts per company.
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required, indexed
- `companyId`: ObjectId, ref: `'Company'`, required, indexed
- `pricingType`: String, enum: `['fixed_per_trip', 'per_kilometre', 'monthly_contract', 'custom']`, required
- `fixedTripRate`: Number (default: 0)
- `perKilometreRate`: Number (default: 0)
- `monthlyContractAmount`: Number (default: 0)
- `customRules`: String
- `effectiveFrom`: Date, default: `Date.now`
- `effectiveUntil`: Date
- `status`: String, enum: `['active', 'expired', 'terminated']`, default: `'active'`
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

### 7. `Orders`
Central order lifecycle record.
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required, indexed
- `companyId`: ObjectId, ref: `'Company'`, optional (optional for walk-in private individual customers)
- `createdByUserId`: ObjectId, ref: `'User'`, required
- `orderNumber`: String, required, uppercase (e.g. `ORD-20261108-001`)
- `pickupLocation`:
  - `address`: String, required
  - `latitude`: Number
  - `longitude`: Number
  - `placeId`: String
  - `contactPerson`: String
  - `contactPhone`: String
- `destinationLocation`:
  - `address`: String, required
  - `latitude`: Number
  - `longitude`: Number
  - `placeId`: String
  - `contactPerson`: String
  - `contactPhone`: String
- `requiredDate`: Date, required
- `requiredTime`: String (e.g. `08:30 AM`)
- `materialDescription`: String, required
- `quantity`: Number, default: 1, min: 0
- `labourCount`: Number, default: 0, min: 0
- `requiredVehicleType`: String, default: `'pickup'`
- `specialInstructions`: String
- `pricingDetails`:
  - `pricingType`: String, enum: `['fixed_per_trip', 'per_kilometre', 'monthly_contract', 'custom', 'manual']`
  - `estimatedPrice`: Number
  - `finalPrice`: Number
- `assignedDriverId`: ObjectId, ref: `'Driver'`
- `assignedVehicleId`: ObjectId, ref: `'Vehicle'`
- `assignmentMode`: String, enum: `['admin_assignment', 'driver_self_assignment', 'unassigned']`, default: `'unassigned'`
- `status`: String, enum: `['pending', 'available', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled', 'failed']`, default: `'pending'`, indexed
- `duplicateReviewStatus`:
  - `isFlagged`: Boolean, default: false
  - `potentialDuplicateOrderId`: ObjectId, ref: `'Order'`
  - `reviewedByUserId`: ObjectId, ref: `'User'`
  - `reviewedAt`: Date
- `completedAt`: Date
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- **Compound Indexes**:
  - `{ transportBusinessId: 1, orderNumber: 1 }` (unique)
  - `{ transportBusinessId: 1, status: 1 }`
  - `{ transportBusinessId: 1, requiredDate: 1 }`
  - `{ transportBusinessId: 1, companyId: 1 }`
  - `{ transportBusinessId: 1, assignedDriverId: 1, status: 1 }`

### 8. `OrderHistory`
Append-only immutable audit log.
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required, indexed
- `orderId`: ObjectId, ref: `'Order'`, required, indexed
- `performedByUserId`: ObjectId, ref: `'User'`, required
- `action`: String, required (e.g. `ORDER_CREATED`, `STATUS_CHANGED`, `DRIVER_ASSIGNED`, `DRIVER_CLAIMED`, `TRIP_STARTED`, `TRIP_COMPLETED`)
- `previousValue`: Mongoose.Schema.Types.Mixed
- `newValue`: Mongoose.Schema.Types.Mixed
- `description`: String
- `createdAt`: Timestamp (immutable)
- **Compound Indexes**:
  - `{ orderId: 1, createdAt: -1 }`

### 9. `VehicleLocationHistory` (Future Module Schema)
Telemetry and GPS pings (for Phase 4 / Maps).
- `_id`: ObjectId
- `transportBusinessId`: ObjectId, ref: `'TransportBusiness'`, required, indexed
- `vehicleId`: ObjectId, ref: `'Vehicle'`, required, indexed
- `driverId`: ObjectId, ref: `'Driver'`, required
- `orderId`: ObjectId, ref: `'Order'`
- `latitude`: Number, required
- `longitude`: Number, required
- `accuracy`: Number
- `speed`: Number
- `recordedAt`: Date, default: `Date.now`, indexed
- `source`: String, enum: `['driver_mobile_browser', 'driver_app', 'hardware_gps']`, default: `'driver_mobile_browser'`
- **Index**:
  - `{ vehicleId: 1, recordedAt: -1 }`
  - Retention TTL Index: `{ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }` (auto-expire telemetry after 30 days)

---

## 3. Relationships Diagram

```
+--------------------------------------------------------------+
|                    TransportBusiness                         |
|                           (1)                                |
+--------------------------------------------------------------+
    |         |               |              |           |
   (N)       (N)             (N)            (N)         (N)
    v         v               v              v           v
+-------+ +---------+    +---------+    +---------+  +-------------------+
| User  | | Company |    | Driver  |    | Vehicle |  | PricingAgreement  |
+-------+ +---------+    +---------+    +---------+  +-------------------+
             |               |              |           ^
            (N)              |              |           | (1)
             v               |              |           |
      +---------------+      |              |           |
      |     Order     |<-----+--------------+-----------+
      +---------------+
             |
            (N)
             v
      +---------------+
      | OrderHistory  |
      +---------------+
```
