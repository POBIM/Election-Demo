# Draft: Incomplete Pages Fix (Thai Election System)

## Requirements (confirmed)
- Fix incomplete/mismatched frontend pages so the app loads without errors and shows real backend data.
- Preserve existing UI design language (Thai text, Navy/Gold colors); no redesign.
- Prefer fixing frontend; avoid backend changes unless absolutely necessary.

## Issues To Address (from user)
- Admin elections list page: `title` vs backend `name`/`nameTh`; status casing mismatch (`open/closed` vs `OPEN/CLOSED`); create button should link to `/admin/elections/new`.
- Results page: REST path mismatch (`/results?electionId=` vs `/results/:electionId`); SSE path mismatch (`/stream/results/:id` vs `/stream/elections/:id/results`); response wrapper `{ success, data }` not extracted; data shape mismatches (UUID ids, turnout fields, no `constituencyResults`); SSE event types mismatch (`result_update` vs `snapshot` + `vote_update`).
- SSE hook: listen for both `snapshot` and `vote_update`.

## Technical Decisions (proposed defaults)
- Results UI: hide/remove constituency tab/section when backend does not provide constituency results.
- Name display: prefer Thai name (`nameTh`) as primary label when present.
- Keep backend contracts as-is; adapt frontend types and parsing.

## Research Findings
- (pending) Codebase scan for exact file locations and current implementations.
- (pending) SSE/EventSource best practices for custom event names and reconnect.

## Open Questions
- Are there additional “incomplete pages” beyond the three issues listed (admin elections list, results page, SSE hook), or should the plan scope be limited to these?

## Scope Boundaries
- INCLUDE: Fix type mismatches, routing paths, SSE wiring/event handling, UI conditional rendering so pages load.
- EXCLUDE (unless required): Backend route/schema changes; new features; UI redesign.
