# shared/

## Overview
- Shared TypeScript contracts exported as `@election/shared`.

## Where To Look
| Task | Location |
|------|----------|
| Package entry/barrel | `shared/src/index.ts` |
| Common API response types | `shared/src/types/index.ts` |
| Auth types | `shared/src/types/auth.ts` |
| RBAC roles/permissions | `shared/src/types/rbac.ts` |
| Election domain types | `shared/src/types/election.ts` |
| Vote domain types | `shared/src/types/vote.ts` |
| Geography types | `shared/src/types/geo.ts` |

## Conventions
- Intended to be imported via `@election/shared` from backend; frontend currently imports some types via relative path.

## Commands
```bash
npm -w shared run build
npm -w shared run typecheck
```
