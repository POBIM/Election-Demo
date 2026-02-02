# frontend/

## Overview
- Next.js App Router UI (dev server on :3000), Tailwind v4, Thai/Latin font (Prompt).

## Where To Look
| Task | Location |
|------|----------|
| Route groups + pages | `frontend/src/app` |
| Global layout + providers | `frontend/src/app/layout.tsx` |
| Admin layout | `frontend/src/app/(admin)/admin/layout.tsx` |
| Auth gating middleware | `frontend/src/middleware.ts` |
| Auth context (client) | `frontend/src/lib/auth-context.tsx` |
| API helper | `frontend/src/lib/api.ts` |
| SSE hook | `frontend/src/hooks/useSSE.ts` |
| Vote flow (largest) | `frontend/src/app/(public)/vote/page.tsx` |
| Results flow (SSE) | `frontend/src/app/(public)/results/page.tsx` |

## Commands
```bash
npm -w frontend run dev
npm -w frontend run build
npm -w frontend run start
npm -w frontend run lint
```

## Gotchas
- Frontend stores token in `localStorage` and also sets an `auth_token` cookie; backend sets a `token` cookie.
- `frontend/.next/` is generated and should not be edited or committed.
