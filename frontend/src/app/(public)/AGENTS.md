# frontend/src/app/(public)/

## Overview
- Voter-facing flows (vote + results).

## Where To Look
| Task | Location |
|------|----------|
| Multi-step vote UI | `frontend/src/app/(public)/vote/page.tsx` |
| Results UI (SSE consumer) | `frontend/src/app/(public)/results/page.tsx` |

## Gotchas
- These pages are large and stateful; prefer small, targeted edits.
