# backend/src/routes/

## Overview
- Express routers, mounted from `backend/src/routes/index.ts`.

## Where To Look
| Task | Location |
|------|----------|
| Router registry | `backend/src/routes/index.ts` |
| Auth (voter/official/me/logout) | `backend/src/routes/auth.ts` |
| Elections CRUD + status | `backend/src/routes/elections.ts` |
| Parties CRUD/list | `backend/src/routes/parties.ts` |
| Candidates CRUD/list | `backend/src/routes/candidates.ts` |
| Vote cast + status | `backend/src/routes/votes.ts` |
| Aggregated results | `backend/src/routes/results.ts` |
| SSE stream router | `backend/src/routes/stream.ts` |
| Batch submission/approval | `backend/src/routes/batches.ts` |
| Geo endpoints | `backend/src/routes/geo.ts` |

## Conventions
- Prefer early returns with `res.status(...).json({ success: false, error: ... })`.
- Auth-required routes should use `authMiddleware` consistently and avoid re-parsing tokens.

## Gotchas
- Response shape differs between explicit handlers (`success`) and the global error handler (`ok`).
- SSE paths are easy to drift: verify frontend and backend endpoints match before changing either side.
