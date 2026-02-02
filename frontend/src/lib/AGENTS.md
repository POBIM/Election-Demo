# frontend/src/lib/

## Overview
- Client-side integration layer: auth context and API wrapper.

## Where To Look
| Task | Location |
|------|----------|
| Fetch wrapper | `frontend/src/lib/api.ts` |
| Auth state + login/logout | `frontend/src/lib/auth-context.tsx` |

## Conventions
- `apiRequest()` infers method: POST when `options.data` is present, GET otherwise.
- `apiRequest()` always uses `credentials: "include"` and adds `Authorization` from `localStorage` when present.

## Gotchas
- Keep token storage consistent with middleware expectations (`auth_token` cookie vs backend `token` cookie).
