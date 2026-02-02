# Draft: Election Results Dashboard (Province Map)

## Requirements (confirmed)
- Replace the current public results page with a new dashboard at `frontend/src/app/(public)/results/page.tsx`.
- Interactive Thailand map by province:
  - Provinces colored by winning party (constituency).
  - View toggle: party / region / turnout.
  - Hover tooltip with province stats.
  - Click province to open a province detail panel/modal.
- Clear results visualization:
  - Summary stats cards (total eligible voters, turnout %, total votes cast, leading party nationwide).
  - Party results chart (votes + seats won) based on constituency aggregation.
  - Province table sortable by province/votes/turnout; clicking selects province.
- Linked navigation: selection state shared between map, table, and charts.

## Technical Decisions
- Aggregation semantics: constituency-only (based on `Vote` rows with `ballotType='CONSTITUENCY'`).
- `seatsWon`: count of district winners per province for that party.
- TopoJSON: load remotely (same approach as reference dashboard).
- Real-time SSE: not required for MVP (phase 2).
- Theme: keep existing Thai language UI and existing navy/gold visual direction.

## Research Findings
- Backend has:
  - `GET /results/:electionId` in `backend/src/routes/results.ts` (party-list + referendum summary).
  - `GET /results/:electionId/by-district?provinceId=...` in `backend/src/routes/results.ts` (constituency votes grouped by candidate).
  - Geo endpoints in `backend/src/routes/geo.ts` for provinces/districts with region relations.
- Data model supports required joins:
  - `Vote.candidateId -> Candidate.districtId -> District.provinceId -> Province.regionId -> Region` (`backend/prisma/schema.prisma`).
- Frontend results currently:
  - Uses REST `GET /results/:electionId` and an SSE subscription (not needed for MVP).

## Open Questions
- None for MVP (all key product decisions confirmed).

## Scope Boundaries
- INCLUDE: new backend endpoint `GET /results/:electionId/by-province` + new dashboard UI replacing `/results`.
- EXCLUDE (MVP): SSE updates for province results; hosting TopoJSON locally; admin/backoffice features.
