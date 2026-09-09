# HalaCoach Admin API Contract

This document lists **every HTTP route** the admin UI calls today via `src/api/index.ts`.
Implemented in `halacoach-apis` under `/api/admin` (paths below are relative to `NEXT_PUBLIC_API_BASE_URL`).

---

## Configuration

| Env var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Admin API origin, e.g. `https://api.halacoach.com/api/admin` |

Session cookie (client): `hc_admin_session` — JSON `{ id, name, email, role }`.

---

## Conventions

- **Content-Type:** `application/json` on POST/PATCH bodies
- **Success:** `2xx` with JSON body (or empty for future deletes)
- **Errors:** HTTP `4xx` / `5xx` with a plain-text or JSON `message` the UI can show
- **IDs:** string or numeric IDs as returned by the API
- **Timestamps:** ISO 8601 UTC strings
- **Roles:** `super` \| `reviewer` \| `support` — enforce server-side; UI also gates nav

### Role matrix (minimum)

| Permission | Super | Reviewer | Support |
|---|---|---|---|
| Full module access | ✓ | verification, professionals | clients, support, credits (read/adjust) |
| Settings / admins / content / leads / requests | ✓ | — | — |

---

## Health

### `GET /v1/health`

**Response**

```json
{ "ok": true, "source": "api", "app": "halacoach-admin" }
```

---

## Auth (M1)

### `POST /v1/auth/login`

**Body**

```json
{ "email": "admin@halacoach.local", "password": "Admin123!" }
```

**Response `200`**

```json
{
  "user": {
    "id": "admin-super",
    "name": "HalaCoach Admin",
    "email": "admin@halacoach.local",
    "role": "super",
    "active": true,
    "lastLogin": "2026-08-18T12:00:00.000Z",
    "createdAt": "2026-08-18T00:00:00.000Z"
  }
}
```

**Errors:** `401` wrong credentials · `403` disabled account

Sign-out is client-only (clears session cookie). No logout endpoint required for v1.

---

## Dashboard (M13)

### `GET /admin/dashboard`

**Response**

```json
{
  "counts": {
    "pendingVerifications": 1,
    "openLeads": 5,
    "unlocksToday": 3,
    "clients": 6,
    "professionals": 5,
    "newClientsWeek": 2,
    "newProsWeek": 1,
    "creditsSoldAed": 1515.51,
    "openSupportTickets": 4
  },
  "recentActivity": [
    {
      "id": "unlock-u-l1024-amina",
      "kind": "lead_unlock",
      "title": "Amina Haddad unlocked a lead",
      "subtitle": "Weight loss · Dubai Marina · 3 credits",
      "at": "2026-08-18T13:05:00.000Z",
      "href": "/leads/l-1024"
    }
  ]
}
```

`recentActivity.kind`: `client_signup` \| `pro_signup` \| `verification_pending` \| `lead_unlock` \| `credit_purchase` \| `support_ticket`

---

## Admin users (M1)

### `GET /v1/admins`

List operators. **Super only.**

### `POST /v1/admins`

Invite admin. **Body:** `{ name, email, role, password }` · **Super only.**

### `PATCH /v1/admins/:id`

**Body:** `{ name?, role?, active?, actorId }` — cannot disable self or last active super.

---

## Settings & lookups (M2)

### `GET /admin/settings`

**Response**

```json
{
  "settings": {
    "otpLength": 4,
    "otpResendSeconds": 30,
    "defaultPhonePrefix": "+971",
    "vatRate": 0.05,
    "maxGoals": 2,
    "defaultLeadUnlockCost": 3
  },
  "lookups": [{ "id", "groupId", "value", "label", "sortOrder", "active", "system" }],
  "groups": [{ "id", "title", "hint", "locked" }]
}
```

### `PATCH /admin/settings`

Partial `AppSettings`. **Super only.**

### `POST /admin/lookups`

Add option to unlocked group. **Body:** `{ groupId, label, value? }`

### `PATCH /admin/lookups/:id`

**Body:** `{ label?, active? }`

---

## Services catalog (M3)

### `GET /v1/services`

Alphabetical by name. Admin returns all; public returns active only.

**Response item:** `{ id, name, active }`

### `POST /v1/services`

**Body:** `{ name }`

### `PATCH /v1/services/:id`

**Body:** `{ name?, active? }`

---

## Professionals (M4)

### `GET /admin/professionals`

Summary list with `profileCompletion`, verification, credits, etc.

### `GET /admin/professionals/:id`

Full profile including wallet `txns`, documents, public fields, `notificationPrefs`.

### `PATCH /admin/professionals/:id`

**Body:** contact, services, locations, radius, activation, suspend, public profile fields.

---

## Verification (M5)

### `GET /admin/verification`

Pending queue items (newest submission first).

### `POST /admin/verification/:id/approve`

Sets `verification: verified`, `activated: true`.

### `POST /admin/verification/:id/reject`

**Body:** `{ reason?: string }` — sets `verification: rejected`, `activated: false`.

---

## Clients (M6)

### `GET /admin/clients`

### `GET /admin/clients/:id`

Includes `matchPrefs`, personal `profile`, `consents`, `savedCoachIds`, `notificationPrefs`.

### `PATCH /admin/clients/:id`

**Body:** `{ name?, email?, phone?, suspended? }`

---

## Leads (M7)

### `GET /admin/leads`

### `GET /admin/leads/:id`

Includes client snapshot, unlock history, contact visibility rules.

### `PATCH /admin/leads/:id`

**Body:** `{ status?, creditCost? }` — **Super only.**

---

## Quote requests (M8)

### `GET /admin/requests`

### `GET /admin/requests/:id`

### `PATCH /admin/requests/:id`

**Body:** `{ status?, quoteMessage?, quoteAmount? }` — mark quoted/closed.

---

## Credits (M9)

### `GET /admin/credit-packs`

### `POST /admin/credit-packs`

**Body:** `{ name, credits, price, badge? }` — `badge` is `popular` \| `value` \| omitted. **Super only.**

Creates a pack (slug from name). Catalog is not limited to starter / growth / scale.

### `PATCH /admin/credit-packs/:id`

**Body:** `{ name?, credits?, price?, badge?, active? }` — set `badge: null` to clear. **Super only.**

### `GET /admin/credits`

Overview: packs, promos, VAT rate, ledger `transactions`, wallet stats.

### `POST /admin/promo-codes`

**Body:** `{ code, discountRate }` — rate 0–0.5

### `PATCH /admin/promo-codes/:id`

**Body:** `{ code?, discountRate?, active? }`

### `POST /admin/credit-adjustments`

**Body:** `{ professionalId, credits, label? }` — non-zero integer; creates `adjustment` txn. **Super + support.**

---

## Support (M11)

### `GET /admin/support`

Contact-us inbox summaries.

### `GET /admin/support/:id`

Ticket + user contact + `notificationPrefs`.

### `PATCH /admin/support/:id`

**Body:** `{ status?, replyNote?, actorName? }` — `new` \| `replied` \| `closed`.

---

## Messages (M12, read-only)

### `GET /admin/messages`

Conversation list (client ↔ professional).

### `GET /admin/messages/:id`

Thread with `messages[]`: `{ id, author: client|professional|system, body, sentAt }`.

No write endpoints in v1.

---

## Shared types (reference)

Key enums used across modules:

| Domain | Values |
|---|---|
| Verification | `none`, `pending`, `verified`, `rejected` |
| Quote request | `pending`, `quoted`, `closed` |
| Lead status | `open`, `closed` |
| Credit txn | `purchase`, `spend`, `adjustment` |
| Support ticket | `new`, `replied`, `closed` |
| Payment method | `card`, `applepay` |

TypeScript source of truth: `src/api/types.ts`, `src/api/lookups.ts`.

---

## Admin module map

| Module | Routes prefix | UI path |
|---|---|---|
| M0 Foundation | — | shell, shared UI |
| M1 Auth | `/v1/auth`, `/v1/admins` | `/login`, `/admins` |
| M2 Settings | `/admin/settings`, `/admin/lookups` | `/settings` |
| M3 Services | `/admin/services` | `/services` |
| M4 Professionals | `/admin/professionals` | `/professionals` |
| M5 Verification | `/admin/verification` | `/verification` |
| M6 Clients | `/admin/clients` | `/clients` |
| M7 Leads | `/admin/leads` | `/leads` |
| M8 Requests | `/admin/requests` | `/requests` |
| M9 Credits | `/admin/credits`, packs, promos, adjustments | `/credits` |
| M11 Support | `/admin/support` | `/support` |
| M12 Messages | `/admin/messages` | `/messages` |
| M13 Dashboard | `/admin/dashboard` | `/` |
| M14 Polish | this document | — |

---

*Update this file when adding new admin screens.*
