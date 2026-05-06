# Architecture Context

## Stack

| Layer     | Technology                  | Role   |
| --------- | --------------------------- | ------ |
| Framework | React 18 + Vite (TS)        | Frontend Application |
| UI        | Tailwind CSS + Lucide       | Styling & Icons |
| Auth      | Firebase Authentication     | Identity Management (Google) |
| Database  | Cloud Firestore             | NoSQL Real-time Database |
| Storage   | Firebase Storage            | Media Asset Hosting |

## System Boundaries

- `src/pages` — Routable views (Home, Auth, Admin, etc.)
- `src/components` — Reusable UI primitives and complex sections
- `src/services` — Data fetching, Firebase interactions, and business logic
- `src/lib` — Configuration (Firebase init, shared utilities)
- `src/types` — TypeScript interfaces and enums

## Storage Model

- **Cloud Firestore**: Stores semi-structured data: Users, Packages, Bookings, and Admin markers.
- **Firebase Storage**: Stores binary assets: Travel package covers, gallery images, and travel documents.

## Auth and Access Model

- **Google Auth**: All users sign in via Google.
- **RBAC**: Roles defined in user profile documents (`user` | `admin`).
- **Super Admin**: `almalikaewan@gmail.com` is the root admin with global write access.
- **Security Rules**: Enforced via `firestore.rules` preventing unauthorized cross-document access.

## Invariants

1. Every booking MUST refer to a valid package ID.
2. Admins MUST exist in the `admins` collection to perform sensitive writes.
3. Financial totals in bookings are snapshots to prevent price manipulation after booking.
4. UI must be responsive down to 320px width.
