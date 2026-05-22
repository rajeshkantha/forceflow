# ForceFlow

Multi-tenant Salesforce automation platform that compresses the Salesforce SDLC from weeks to hours using AI agents, automated CI/CD pipelines, and intelligent quality gates.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/forceflow run dev` — run the React frontend (port 26164, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + wouter + TanStack Query
- API: Express 5 + Clerk auth (@clerk/express)
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (provisioned app: app_3E5VB94szIdiVz2dyd2xRCjfTaN)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/api-client-react/src/generated/api.ts` — generated TanStack Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas for server validation
- `lib/db/src/schema/` — all Drizzle ORM table schemas
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/middlewares/requireAuth.ts` — Clerk auth middleware
- `artifacts/forceflow/src/pages/` — all React page components
- `artifacts/forceflow/src/components/app-layout.tsx` — authenticated app sidebar layout
- `artifacts/forceflow/src/App.tsx` — root router with Clerk provider
- `artifacts/forceflow/src/index.css` — Tailwind v4 theme (dark indigo/cyan palette)
- `artifacts/forceflow/public/logo.svg` — ForceFlow SVG logo

## Architecture decisions

- Contract-first API design: OpenAPI spec drives both server Zod validation and client React Query hooks via Orval codegen
- Cookie-based auth for web (Clerk session cookies) — no bearer tokens in browser code
- Multi-tenant: every DB table has `tenant_id`; `requireAuth` middleware attaches tenantId/role to every request
- Agent roles (Frontier, Developer, Sales, Support, SME) are first-class: stored in DB, used for RBAC and chat thread routing
- Sensitive values (API keys, Salesforce tokens) stored as base64-encoded strings in DB (swap for AES-256-GCM in production)

## Product

ForceFlow gives Salesforce teams a mission-control console with:
- **Onboarding wizard**: 6-step setup flow (company profile → org connection → AI model → team invite)
- **AI Agents**: role-based chat agents (Frontier/Developer/Sales/Support/SME) with tool-call approval gates
- **Org Management**: connect multiple Salesforce orgs (production, sandbox, developer, scratch)
- **Team Management**: invite members with role-based access control
- **CI/CD Pipelines**: track pipeline runs, stage-by-stage breakdown, Frontier-only gate approval
- **Agent Analyses**: structured plan generation with human-in-the-loop approval flow
- **Quality Reports**: code coverage and violation tracking
- **Dashboard**: real-time tenant overview with activity feed and stats

## User preferences

- No emojis in the UI
- JetBrains Mono for code snippets, IDs, commit SHAs
- Dark theme only (no light mode toggle)
- Role badge colors: frontier=indigo, developer=cyan, sales=emerald, support=amber, sme=violet

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after changing schema files in `lib/db/src/schema/`
- Tailwind v4 requires `@layer theme, base, clerk, components, utilities;` BEFORE `@import 'tailwindcss'` in index.css
- Pass `tailwindcss({ optimize: false })` in vite.config.ts to prevent @clerk/themes CSS from being reordered in prod
- DB tables use UUID primary keys generated server-side (not client)
- `requireFrontier` middleware only checks role; combine with `requireTenant` for full protection

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
- Clerk app dashboard: console.clerk.com (app_3E5VB94szIdiVz2dyd2xRCjfTaN)
