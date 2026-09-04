# HOMZA Property Marketplace

HOMZA is a Uganda-focused rental marketplace for discovering homes, managing listings, and keeping property information trustworthy.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + TypeScript + Tailwind CSS

## Where things live

- `artifacts/homza/src/App.tsx` — shared public, tenant, owner, and admin route experience
- `artifacts/homza/src/index.css` — HOMZA visual tokens and responsive utility styles
- `lib/api-spec/openapi.yaml` — source of truth for the property marketplace API
- `artifacts/api-server/src/lib/homza-data.ts` — isolated development demo service and Ugandan property fixtures
- `artifacts/api-server/src/routes/homza.ts` and `dashboards.ts` — marketplace API routes

## Architecture decisions

- One web artifact owns the public marketplace and all role-specific workspaces; role-specific routes share the same visual system and API.
- The first build uses a replaceable in-memory demo service so browsing and CRUD-like flows work before a persistent storage provider is configured.
- OpenAPI-generated React Query hooks are the client boundary; backend response validation stays close to the route handlers.
- Contact actions expose direct WhatsApp and phone links while keeping the trust reminder visible before a tenant pays.
- Public contact submissions and discovery filters use the same API contract as the marketplace flows.
- Owner listings support an explicit `paused` state that is excluded from public discovery without deleting the listing.

## Product

- Public home discovery with Kampala/Wakiso/Entebbe demo inventory
- Search and sorting by location, home type, rent, and bedroom count
- Advanced filtering by rent range, bedroom count, advance requirement, and amenity
- Property details with gallery, amenities, verification context, report flow, shortlist saving, WhatsApp, and phone contact
- Tenant dashboard with saved homes, saved searches, messages, and profile surfaces
- Owner dashboard with listing performance, multi-step listing creation/editing, status controls, leads, analytics, payments, and subscription surfaces
- Admin trust console with verification, moderation, reports, payments, subscriptions, archive, and settings routes

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The web artifact's build script expects `PORT` and `BASE_PATH` from the managed workflow; use the workflow for normal previews.
- The development API data is process-local until the persistent storage phase is implemented.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
