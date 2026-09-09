# HalaCoach Admin

Next.js operations console for HalaCoach. All modules **M0–M14** are implemented against a typed mock API until `halacoach-apis` exists.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Mock API adapter in `src/api/` (see [API_CONTRACT.md](./API_CONTRACT.md))

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (see `.env.example`).

Open [http://localhost:3000](http://localhost:3000).

If dev cache misbehaves after a production build:

```bash
npm run dev:reset
```

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Super admin | `admin@halacoach.local` | `Admin123!` |

Role-based nav: reviewers see verification + professionals; support sees clients, credits, support inbox, and messages (read-only).

## Modules (complete)

| # | Module | Route |
|---|---|---|
| M0 | Foundation | shell, routing, mock client |
| M1 | Auth & admins | `/login`, `/admins` |
| M2 | Settings & lookups | `/settings` |
| M3 | Services catalog | `/services` |
| M4 | Professionals | `/professionals` |
| M5 | Verification | `/verification` |
| M6 | Clients | `/clients` |
| M7 | Leads | `/leads` |
| M8 | Quote requests | `/requests` |
| M9 | Credits | `/credits` |
| M11 | Support inbox | `/support` |
| M12 | Messages (read-only) | `/messages` |
| M13 | Dashboard | `/` |
| M14 | Polish & API handoff | [API_CONTRACT.md](./API_CONTRACT.md) |

## Connect real API

When `halacoach-apis` is ready, set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (see `.env.example`).

## Project layout

```
src/
  api/           Mock store, seeds, client, types
  app/(admin)/   Pages per module
  components/    Screen components + shared UI
  lib/           Permissions, nav, domain utils
```
