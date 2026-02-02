# PROJECT KNOWLEDGE BASE

Generated: 2026-02-02
Branch: main
Commit: 7a9d9fa

## Overview
- Thai Election System demo: voter flow (party-list/constituency/referendum) + admin backoffice with RBAC.
- Monorepo (npm workspaces): `frontend/` (Next.js), `backend/` (Express + Prisma/SQLite), `shared/` (TS contracts).

## Structure
```
./
  backend/        Express API + Prisma
  frontend/       Next.js App Router UI
  shared/         Shared TS types/contracts
  scripts/        Repo scripts (currently mostly empty)
  node_modules/   Installed deps (do not edit)
```

## Where To Look
| Task | Location |
|------|----------|
| Start dev servers | `package.json` (root `dev` script) |
| Backend entrypoint | `backend/src/index.ts` |
| Express wiring (CORS/middleware) | `backend/src/app.ts` |
| API router registry | `backend/src/routes/index.ts` |
| Auth + JWT helpers | `backend/src/middleware/auth.ts`, `backend/src/routes/auth.ts` |
| RBAC + scope checks | `backend/src/middleware/rbac.ts`, `shared/src/types/rbac.ts` |
| Vote casting + dedupe | `backend/src/routes/votes.ts` |
| Results + by-district | `backend/src/routes/results.ts` |
| SSE streaming | `backend/src/routes/stream.ts`, `frontend/src/hooks/useSSE.ts` |
| Frontend auth state | `frontend/src/lib/auth-context.tsx` |
| Frontend API helper | `frontend/src/lib/api.ts` |
| Frontend route protection | `frontend/src/middleware.ts` |
| Voter UI (largest file) | `frontend/src/app/(public)/vote/page.tsx` |
| Results UI (SSE consumer) | `frontend/src/app/(public)/results/page.tsx` |
| DB schema + seed | `backend/prisma/schema.prisma`, `backend/prisma/seed.ts` |

## Commands
```bash
# install
npm install

# dev (frontend :3000, backend :3001)
npm run dev

# build (ordered: shared -> backend -> frontend)
npm run build

# quality
npm run lint
npm run typecheck

# database
npm run db:seed
npm run db:migrate
npm run db:studio
```

## Conventions (Repo-Specific)
- API responses are mostly `{ success: boolean, data?, error?, message? }`; `backend/src/middleware/errorHandler.ts` returns `{ ok: false, error }`.
- Backend token cookie name is `token` (see `backend/src/routes/auth.ts`); frontend middleware checks `auth_token` (see `frontend/src/middleware.ts`) and also stores token in `localStorage`.
- TypeScript: strict; base config in `tsconfig.base.json`. Backend/shared are ESM (`"type": "module"`) with `NodeNext`.
- Ignore generated output: `frontend/.next/`, `**/dist/`, `node_modules/`.

## Anti-Patterns / Gotchas
- Do not use `backend/.env` / `.env.local` values as "safe defaults" for production; secrets are hardcoded for demo.
- Avoid relying on fallback secrets: `JWT_SECRET` falls back to `dev-secret`, and vote dedupe salt falls back to `default-salt`.
- Do not run `npm run db:reset` unless you explicitly want destructive reset.
- `npm run smoke` currently points at `scripts/smoke/run-all.sh`, but `scripts/smoke/` is empty.
- SSE endpoint mismatch exists: frontend uses `/stream/results/:electionId` while backend currently serves `/stream/elections/:electionId/results`.
