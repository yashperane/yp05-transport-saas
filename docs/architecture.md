# Architecture & System Design — Transport SaaS Project

## 1. System Overview & Multi-Tenant Philosophy

The Transport SaaS Project is an operations platform connecting:
1. **Transport Businesses (Tenants)**: Independent transport operators managing their own fleet of vehicles, drivers, billing agreements, and customer companies.
2. **Customer Companies**: Businesses, contractors, site managers, and supervisors who book freight trips and worker transports.
3. **Drivers**: Operators who accept trips, execute pickups/drop-offs, and report status/location.
4. **SaaS Super Admins**: Platform administrators maintaining platform availability, plans, and technical health without browsing private operational data.

```
       +-------------------------------------------------------------+
       |                     SaaS Super Admin                        |
       |             (Tenant onboarding, platform health)            |
       +-------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
+------------------------------------+   +------------------------------------+
|  Tenant A: Transport Business A    |   |  Tenant B: Transport Business B    |
|  - Users (Owner, Dispatchers)      |   |  - Users (Owner, Dispatchers)      |
|  - Vehicles & Drivers              |   |  - Vehicles & Drivers              |
|  - Pricing & Contracts             |   |  - Pricing & Contracts             |
+------------------------------------+   +------------------------------------+
         |                                                         |
   +-----+-------------------------+                         +-----+-----+
   |                               |                         |           |
+----------------------+ +----------------------+      +-----------+ +-----------+
| Company 1 (Customer) | | Company 2 (Customer) |      | Company X | | Company Y |
| - Company Admin      | | - Company Admin      |      +-----------+ +-----------+
| - Company Employees  | | - Company Employees  |
| - Company Orders     | | - Company Orders     |
+----------------------+ +----------------------+
```

---

## 2. Multi-Tenant Isolation Strategy

### The Golden Rule
> **Never trust a client-supplied `transportBusinessId` from the frontend query or request body.**

In a multi-tenant system:
1. When a user logs in, the backend issues an authentication token (JWT) containing their verified `userId`, `role`, `transportBusinessId`, and `companyId` (if applicable).
2. Every request middleware extracts the verified token payload.
3. Every database query in Express controllers/services **must** inject `{ transportBusinessId: req.user.transportBusinessId }`.
4. For company users (`company_admin`, `company_employee`), queries are further scoped: `{ transportBusinessId: req.user.transportBusinessId, companyId: req.user.companyId }`.
5. For drivers (`driver`), queries only show orders assigned to them, or orders with status `'available'` if the owner has enabled driver self-assignment in `transportBusiness.settings.driverVisibility`.

---

## 3. Recommended Folder Structure

The project maintains the existing `backend` and `frontend` folders:

```
transport-saas/
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/
│       │   ├── env.js                # Environment variable reader
│       │   └── database.js           # Mongoose connection
│       ├── models/
│       │   ├── index.js              # Central export for all models
│       │   ├── TransportBusiness.js  # Tenant account schema
│       │   ├── User.js               # Authentication & roles
│       │   ├── Company.js            # Client company accounts
│       │   ├── Driver.js             # Driver profiles & state
│       │   ├── Vehicle.js            # Vehicle registry & assignments
│       │   ├── PricingAgreement.js   # Per-company custom rates
│       │   ├── Order.js              # Trip orders & lifecycle
│       │   ├── OrderHistory.js       # Immutable audit log
│       │   └── VehicleLocationHistory.js # Future GPS ping telemetry
│       ├── routes/
│       │   └── health.js             # System status & DB ping
│       └── server.js                 # App entry & Socket.IO initialization
│
├── frontend/
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
├── docs/
│   ├── architecture.md               # System & tenant design (this document)
│   ├── database-design.md            # Schema fields & relationships
│   └── api-design.md                 # Proposed API routes & query specifications
└── README.md
```

---

## 4. Frontend & Backend Educational Walkthrough

### Why pure JavaScript with ES Modules (`type: "module"`)?
- Clean, standard syntax (`import express from 'express';`) supported natively by modern Node.js (`v18+`, `v20+`, `v26+`).
- Eliminates transpilation overhead, `.d.ts` type-checking compilation delays, and complex tsconfig toolchains.
- Accessible for developers learning full-stack concepts directly on runnable JavaScript code.

### Request Flow Pattern
1. **Client UI (React)** dispatches an API request with `credentials: 'include'` or an `Authorization: Bearer <token>` header.
2. **Express Server (`server.js`)** routes through global CORS, JSON body parsers, and custom rate limiters.
3. **Tenant Auth Middleware** decodes the token and attaches `req.user`.
4. **Controller / Service Layer** performs input validation (e.g., checking required pickup/destination strings, positive quantity), then constructs database queries strictly constrained to `req.user.transportBusinessId`.
5. **Mongoose Models** enforce types, schema constraints, pre-save hooks, and custom validators.
6. **Socket.IO** emits real-time events scoped to specific tenant rooms (e.g. `room:tenant_<transportBusinessId>`), ensuring real-time messages are not leaked across tenants.
