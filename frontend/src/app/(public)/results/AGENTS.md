# frontend/src/app/(public)/results/

## Overview
- Election results UI, including a Server-Sent Events (SSE) live feed.

## Where To Look
| Task | Location |
|------|----------|
| Results page | `frontend/src/app/(public)/results/page.tsx` |
| SSE hook | `frontend/src/hooks/useSSE.ts` |
| Backend SSE router | `backend/src/routes/stream.ts` |
| Backend results API | `backend/src/routes/results.ts` |

## Gotchas
- Frontend currently subscribes to `/stream/results/:electionId`; backend currently exposes `/stream/elections/:electionId/results`.
