# backend/

## Overview
- Express API (port 3001) + Prisma (SQLite) + JWT auth + RBAC.

## Where To Look
| Task | Location |
|------|----------|
| Server entry | `backend/src/index.ts` |
| Express app config | `backend/src/app.ts` |
| Route mounting | `backend/src/routes/index.ts` |
| Auth routes | `backend/src/routes/auth.ts` |
| Vote routes | `backend/src/routes/votes.ts` |
| Results + SSE | `backend/src/routes/results.ts`, `backend/src/routes/stream.ts` |
| RBAC middleware | `backend/src/middleware/rbac.ts` |
| JWT middleware/helpers | `backend/src/middleware/auth.ts` |
| Prisma client | `backend/src/db/index.ts` |
| Schema/seed | `backend/prisma/schema.prisma`, `backend/prisma/seed.ts` |

## Commands
```bash
npm -w backend run dev
npm -w backend run build
npm -w backend run start

npm -w backend run db:migrate
npm -w backend run db:seed
npm -w backend run db:studio
```

## Conventions
- Auth token extraction: cookie `token` first, then `Authorization: Bearer ...` (see `backend/src/middleware/auth.ts`).
- RBAC guards typically wrap handlers as `authMiddleware` then `requireRole(...)`.

## Anti-Patterns / Gotchas
- Password hashing in `backend/src/routes/auth.ts` uses SHA256 (demo). Prefer `bcryptjs` if you make this real.
- `backend/src/app.ts` hardcodes CORS origin to `http://localhost:3000`.
