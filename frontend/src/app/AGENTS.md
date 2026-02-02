# frontend/src/app/

## Overview
- Next.js App Router using route groups: `(public)`, `(auth)`, `(admin)`.

## Where To Look
| Task | Location |
|------|----------|
| Public voter pages | `frontend/src/app/(public)` |
| Admin login | `frontend/src/app/(auth)/login/page.tsx` |
| Admin dashboard + management | `frontend/src/app/(admin)/admin` |
| Root landing page | `frontend/src/app/page.tsx` |
| Global layout | `frontend/src/app/layout.tsx` |

## Conventions
- Server-side route gating is done in `frontend/src/middleware.ts` (matcher: `/admin/*` and `/login`).
