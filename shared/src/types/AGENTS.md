# shared/src/types/

## Overview
- Source of truth for cross-service contracts (types/interfaces only).

## Where To Look
| Task | Location |
|------|----------|
| Response envelope types | `shared/src/types/index.ts` |
| User/JWT payload shapes | `shared/src/types/auth.ts` |
| Role/permission matrix | `shared/src/types/rbac.ts` |
| Election models | `shared/src/types/election.ts` |
| Voting models + receipts | `shared/src/types/vote.ts` |
| Geo models | `shared/src/types/geo.ts` |

## Gotchas
- Keep these types stable; many frontend/backend flows assume these shapes.
