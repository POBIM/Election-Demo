# frontend/src/app/(public)/vote/

## Overview
- 7-step voter flow: login (citizen id) -> select election -> cast ballots -> review -> receipt.

## Where To Look
| Task | Location |
|------|----------|
| Vote page implementation | `frontend/src/app/(public)/vote/page.tsx` |
| Auth calls used by vote | `frontend/src/lib/auth-context.tsx` |
| API helper | `frontend/src/lib/api.ts` |
| Backend vote endpoint | `backend/src/routes/votes.ts` |

## Gotchas
- This file is a hotspot (large, many states). Avoid refactors while fixing bugs.
- Vote casting depends on backend `req.user.citizenId` being present.
