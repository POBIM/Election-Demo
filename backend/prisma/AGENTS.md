# backend/prisma/

## Overview
- Prisma schema (SQLite) + seed script for demo data.

## Where To Look
| Task | Location |
|------|----------|
| DB schema | `backend/prisma/schema.prisma` |
| Seed data | `backend/prisma/seed.ts` |
| Prisma client singleton | `backend/src/db/index.ts` |

## Gotchas
- Seed uses an absolute `DATA_DIR` path in `backend/prisma/seed.ts`.
- Vote model has multiple uniques: referendum votes include `referendumQuestionId` in the uniqueness.
- `npm -w backend run db:reset` is destructive.
