# backend/src/middleware/

## Overview
- Cross-cutting request middleware: JWT auth, RBAC, and error handling.

## Where To Look
| Task | Location |
|------|----------|
| JWT signing/verifying | `backend/src/middleware/auth.ts` |
| Attach `req.user` | `backend/src/middleware/auth.ts` |
| Role/permission gates | `backend/src/middleware/rbac.ts` |
| Express error handler | `backend/src/middleware/errorHandler.ts` |

## Conventions
- `authMiddleware` blocks unauthenticated requests; `optionalAuth` is permissive.
- RBAC uses shared permission matrix via `shared/src/types/rbac.ts`.

## Gotchas
- `backend/src/middleware/auth.ts` currently uses `(payload as any).citizenId`; avoid adding new type suppressions.
