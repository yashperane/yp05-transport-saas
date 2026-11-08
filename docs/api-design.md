# API Design & Route Specifications — Transport SaaS Project

## 1. RESTful Conventions

- All API endpoints are prefixed with `/api`.
- Responses return standard JSON wrappers:
```json
{
  "success": true,
  "data": {},
  "message": "Optional descriptive message"
}
```
Or for errors:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pickup location address is required"
  }
}
```

---

## 2. Core Endpoint Specifications

### A. Health & Diagnostics
- `GET /api/health` — Public endpoint verifying Node.js uptime and MongoDB readiness.

### B. Authentication (Planned Chapter 3)
- `POST /api/auth/login` — Verifies email/phone and password, returns JWT token with `transportBusinessId`, `role`, and `companyId`.
- `POST /api/auth/register` — Onboards a new transport business or user with validated roles.
- `GET /api/auth/me` — Returns current authenticated session profile.

### C. Fleet & Driver Management
- `GET /api/vehicles` — List vehicles under current tenant.
- `POST /api/vehicles` — Create vehicle with registration number and type.
- `GET /api/drivers` — List drivers, current vehicle assignments, and availability status.
- `PATCH /api/drivers/:id/status` — Driver updates availability (`available`, `busy`, `offline`).

### D. Orders & Dispatch
- `GET /api/orders` — Paginated list of orders filtered by tenant and role permissions.
- `POST /api/orders` — Create order (includes duplicate detection check).
- `GET /api/orders/:id` — View detailed order and history timeline.
- `PATCH /api/orders/:id/claim` — **Atomic** driver self-assignment using MongoDB conditional update.
- `PATCH /api/orders/:id/status` — Update order status (`accepted`, `in_progress`, `completed`, `cancelled`).
- `GET /api/orders/duplicate-check` — Pre-flight check query comparing company, locations, date, and items.

### E. Companies & Contracts
- `GET /api/companies` — List customer companies under the authenticated transport business.
- `POST /api/companies` — Add customer company account.
- `GET /api/companies/:id/pricing` — Retrieve active pricing agreement.
