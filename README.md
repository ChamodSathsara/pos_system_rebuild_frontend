# Vantage POS — Frontend

A modern, responsive Point-of-Sale frontend built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**, built strictly against the `PosApi` ASP.NET Core backend's controllers and DTOs.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4** with a hand-built design system (shadcn-style primitives, authored locally since this environment couldn't reach the shadcn component registry — same output, just vendored directly into `src/components/ui`)
- **TanStack Query** for server-state (caching, mutations, invalidation)
- **TanStack Table** for data tables (search, sort, pagination)
- **React Hook Form + Zod** for forms
- **Zustand** for auth/session state
- **Recharts** for charts
- **Axios** for HTTP

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Connecting to the backend

Set the API base URL in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5080
```

**Important — CORS**: the backend's `Cors:AllowedOrigins` config must include this frontend's origin (e.g. `http://localhost:3000`) or the browser will block every request. Add it to the backend's `appsettings.json` before testing.

### Logging in

Use credentials seeded in your `PosApi` database (e.g. an `Admin` user). There is no self-registration screen — accounts are created via **Admin → Users**.

## Architecture

```
src/
  app/
    login/                 Public login page
    (app)/                 Authenticated app shell (sidebar + topbar), one folder per module
  components/
    ui/                    Hand-built shadcn-style primitives (button, dialog, table, form, ...)
    layout/                Sidebar, topbar, auth guard
    shared/                Reusable app widgets: DataTable, PageHeader, StatCard, ConfirmDialog,
                            BranchFilter, StatusBadge, FormDialog, empty/error/skeleton states
  lib/
    api/                   Axios client + one typed module per backend controller group
    permissions.ts         Role -> capability helpers (branch scoping, admin-only, etc.)
    format.ts              Money/date/number formatting
  hooks/                   TanStack Query hooks, one file per backend controller group
  store/                   Zustand auth store (login/logout/hydration)
  types/                   TypeScript types mirroring every backend DTO and enum exactly
  config/
    nav.ts                 Sidebar navigation, filtered by role
```

## Role-based access

| Role | Scope |
|---|---|
| **Admin** | Full access to every module, including Admin (Users, Roles & Permissions, Organization, Warehouses) |
| **Manager** | Company-wide data across Sales, Inventory, Purchasing, Cash, Reports (no Admin section) |
| **Branch_Manager** | Same modules as Manager, but every list/dashboard is **locked to their own branch** -- the branch filter is replaced with a read-only badge |
| **Cashier** | POS terminal, their own cashier shift, and sales -- Reports and back-office screens are hidden (the backend also 403s Reports for this role) |

Branch scoping for **Branch_Manager**/**Cashier** is enforced client-side wherever the backend itself doesn't enforce it (Sales, Inventory, Cash Management), by always passing their `branchCode` from the JWT and hiding the branch picker. **Reports** additionally enforce this server-side.

## Notes on backend fidelity

- Every request/response type in `src/types/` and every endpoint in `src/lib/api/` was written directly from the `PosApi` source (`Controllers/`, `DTOs/`, `Models/Enums/`) -- no invented fields or endpoints.
- The Discounts form's required/optional/hidden fields per `discountType` mirror the exact validation comment in `DiscountsController` (note: `Special` requires `ItemCode + StartDate + EndDate`, which differs from a shorthand summary you may have seen elsewhere -- the source code was treated as ground truth).
- "Who did this" fields (`createdBy`, `paidBy`, `reportedBy`, etc.) are never sent by the client -- they're always server-derived, per the backend's design.
