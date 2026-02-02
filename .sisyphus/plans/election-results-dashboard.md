# Election Results Dashboard (Thailand Province Map)

## TL;DR

> **Quick Summary**: Add a constituency-based province aggregation API and rebuild the public `/results` page into a linked dashboard (map + charts + table + province detail) while keeping the existing Thai navy/gold UI.
>
> **Deliverables**:
> - Backend: `GET /results/:electionId/by-province` constituency aggregation.
> - Frontend: replace `frontend/src/app/(public)/results/page.tsx` with dashboard UI + new components.
> - Frontend libs: province name mapping + color scales for map view modes.
> - Dependencies: `react-simple-maps`, `topojson-client`, `d3-scale`, `recharts`.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES (3 waves)
> **Critical Path**: Backend by-province API → Frontend data wiring → Map/table/chart linking

---

## Context

### Original Request
Create an election results dashboard with:
- Interactive Thailand map showing data by province
- Clear visualization of election results
- Connected/linked data navigation

### Confirmed Decisions
- Aggregation basis: **constituency-only** (`Vote.ballotType='CONSTITUENCY'`).
- `seatsWon`: **district winners per province** (count of districts where top candidate’s party wins).
- TopoJSON: **remote URL** (GitHub raw) for simplicity.
- SSE: **not required for MVP** (phase 2).
- UI: keep **Thai language** and existing **navy/gold** visual direction.

### Key Repo References
- Backend aggregated results + district breakdown:
  - `backend/src/routes/results.ts` (existing `GET /results/:electionId` and `GET /results/:electionId/by-district`).
- Geo data:
  - `backend/src/routes/geo.ts` (regions/provinces/districts, includes region relation).
- Schema relationships:
  - `backend/prisma/schema.prisma` (Vote → Candidate → District → Province → Region).
- Existing frontend results page (to replace):
  - `frontend/src/app/(public)/results/page.tsx`.
- Frontend SSE hook (not used for MVP, but be aware):
  - `frontend/src/hooks/useSSE.ts`.
- External reference implementation to port from:
  - `/home/pobimgroup/thai-election-dashboard/components/ThailandMap.tsx`.
  - `/home/pobimgroup/thai-election-dashboard/lib/provinceMapping.ts`.

---

## Work Objectives

### Core Objective
Provide a province-centric, interactive results dashboard driven by a new backend constituency aggregation endpoint.

### Concrete Deliverables
- Backend endpoint implemented and reachable: `GET /results/:electionId/by-province`.
- `/results` page shows:
  - Thailand map with view modes: party / region / turnout.
  - Nationwide summary cards.
  - Party results chart (votes + seats won).
  - Province table.
  - Province detail modal/panel with district breakdown.

### Definition of Done (agent-verifiable)
- `npm run build` succeeds (root workspace build).
- `npm run lint` and `npm run typecheck` succeed.
- `curl -s http://localhost:3001/results/<ELECTION_ID>/by-province | jq '.success'` returns `true`.
- `curl -s "http://localhost:3001/results/<ELECTION_ID>/by-district?provinceId=<PROVINCE_ID>" | jq '.success'` returns `true`.
- Playwright verification (agent-executable): `/results` renders map and selecting a province updates detail panel.

### Must NOT Have (guardrails)
- Do not change database schema for MVP.
- Do not require SSE for correctness.
- Do not break existing `GET /results/:electionId` and `GET /results/:electionId/by-district` behaviors.
- Do not introduce new global styling direction; keep existing navy/gold header language.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO dedicated unit test framework detected (repo has `lint`/`typecheck`/`build`).
- **User wants tests**: Manual + automated command verification.
- **QA approach**: command-level verification + Playwright UI smoke.

### Automated Verification (agent-executable)
- Backend endpoint checks (curl + jq).
- Frontend rendering checks via Playwright (no user interaction required).
- Workspace quality gates: `npm run lint`, `npm run typecheck`, `npm run build`.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Add frontend dependencies.
- Task 2: Implement backend `by-province` aggregation endpoint.
- Task 3: Port mapping utilities (province mapping + color scales) into this repo.

Wave 2 (After Wave 1):
- Task 4: Replace `/results` page shell and data layer (fetch summary + by-province + by-district on demand).
- Task 5: Implement Thailand map component integrated with `by-province` response.

Wave 3 (After Wave 2):
- Task 6: Implement linked charts + province table + province detail panel; wire selection linking.
- Task 7: Verification + polish (mobile responsiveness, performance tweaks, quality gates).

Critical Path: Task 2 → Task 4 → Task 5 → Task 6 → Task 7

---

## TODOs

### 1) Install frontend visualization dependencies

**What to do**:
- Add dependencies to `frontend/package.json` (via workspace install):
  - `react-simple-maps`, `topojson-client`, `d3-scale`, `recharts`.

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: mostly package installation and quick verification.
- **Skills**: (none required)
- **Skills Evaluated but Omitted**:
  - `git-master`: not needed unless user requests commits.

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3)
- **Blocks**: Tasks 4, 5, 6
- **Blocked By**: None

**References**:
- `frontend/package.json` - where dependencies live.
- `package.json` - workspace scripts for verification.

**Acceptance Criteria**:
- `npm install` completes without errors.
- `npm -w frontend run build` succeeds.

---

### 2) Backend: implement `GET /results/:electionId/by-province`

**What to do**:
- Add a new route in `backend/src/routes/results.ts` under the existing router:
  - Path: `/:electionId/by-province`.
- Query required base data:
  - Provinces with region + districts (for voter counts and district count).
  - Constituency vote counts grouped by `candidateId` for the election.
  - Candidates for the election with `party` and `districtId`.
- Compute per-district winner and totals:
  - For each district: gather candidates, attach vote counts, compute totalVotes, turnoutPercentage, winner.
- Aggregate by province:
  - totalVotes = sum of district totalVotes.
  - turnoutPercentage = totalVotes / sum(district.voterCount) * 100.
  - partyResults: per-party sum of candidate votes across the province.
  - seatsWon: count of districts in province where winner’s partyId == partyId.
  - winningParty: max by voteCount (or tie-breaking rule documented).
- Return shape per province:
  - `provinceId`, `provinceNameTh`, `provinceName`, `regionName` (use `Region.name`), `districtCount`, `totalVotes`, `turnoutPercentage`, `partyResults[]`, `winningParty`.

**Tie-breaking rule (define explicitly)**:
- If multiple parties tie for top voteCount in a province: prefer the one with more `seatsWon`; if still tie, prefer lower `partyNumber`; if still tie, stable sort by `partyId`.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
  - Reason: non-trivial aggregation and correctness edge cases.
- **Skills**: (none required)
- **Skills Evaluated but Omitted**:
  - `git-master`: only needed for commit workflows.

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3)
- **Blocks**: Tasks 4, 5, 6
- **Blocked By**: None

**References**:
- `backend/src/routes/results.ts` - existing patterns for results aggregation and response shape.
- `backend/src/routes/geo.ts` - how province/region relations are returned.
- `backend/prisma/schema.prisma` - join chain: Vote → Candidate → District → Province → Region.

**Acceptance Criteria**:
```bash
# agent runs with backend dev server started
curl -s http://localhost:3001/results/demo-election-2027/by-province | jq '.success'
# Assert: true

curl -s http://localhost:3001/results/demo-election-2027/by-province | jq '.data | length'
# Assert: 77

curl -s http://localhost:3001/results/demo-election-2027/by-province | jq '.data[0] | has("partyResults") and has("winningParty")'
# Assert: true
```

---

### 3) Frontend: add province mapping + color scale utilities

**What to do**:
- Create a small `lib` module under results route to handle:
  - Province name normalization and mapping between TopoJSON province names and DB province rows.
  - Region color mapping (for `region` view).
  - Turnout color scale (for `turnout` view) using `d3-scale`.
- Port and adapt from the reference dashboard:
  - `/home/pobimgroup/thai-election-dashboard/lib/provinceMapping.ts`.

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: mostly porting and adapting names/types.
- **Skills**: (none required)

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2)
- **Blocks**: Tasks 5, 6
- **Blocked By**: None

**References**:
- `/home/pobimgroup/thai-election-dashboard/lib/provinceMapping.ts` - proven province name mapping.
- `backend/src/routes/geo.ts` - DB fields available: `Province.code`, `Province.name`, `Province.nameTh`, `Province.region.name`.

**Acceptance Criteria**:
- Typecheck passes after adding the modules: `npm run typecheck`.

---

### 4) Frontend: replace `/results` page and implement data flow

**What to do**:
- Replace `frontend/src/app/(public)/results/page.tsx` content with a dashboard shell that:
  - Reads `electionId` from `searchParams` (keep current behavior), default `demo-election-2027`.
  - Fetches:
    - `GET /results/:electionId` for election name/status (and referendum if desired, but not required for MVP).
    - `GET /results/:electionId/by-province` for map/table/chart.
  - On province selection, fetches `GET /results/:electionId/by-district?provinceId=...` for detail panel.
- Maintain the existing header styling direction (navy strip header and Thai copy).

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: UI layout + data wiring + responsiveness.
- **Skills**: `frontend-ui-ux`
  - `frontend-ui-ux`: ensures the dashboard feels deliberate and consistent with existing theme.
- **Skills Evaluated but Omitted**:
  - `playwright`: used later for verification (Task 7).

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Tasks 6, 7
- **Blocked By**: Tasks 1, 2

**References**:
- `frontend/src/app/(public)/results/page.tsx` - existing electionId param handling and header theme.
- `frontend/src/lib/api.ts` - how `apiRequest` is done (base URL, headers).
- `backend/src/routes/results.ts` - REST response shape for `/results/:electionId`.

**Acceptance Criteria**:
- `npm -w frontend run build` succeeds.
- Loading states render without runtime errors.

---

### 5) Frontend: implement `ThailandMap` component integrated with province results

**What to do**:
- Add new components under `frontend/src/app/(public)/results/components/`:
  - `ThailandMap.tsx`: port the reference component and adapt:
    - `viewMode`: `party | region | turnout`.
    - Color fill:
      - party: use `winningParty.partyColor`.
      - region: use mapping by `regionName`.
      - turnout: use `d3-scale` to map 0–100 to a color ramp.
    - Tooltips show provinceNameTh + totals + turnout + top party.
    - Click sets selectedProvinceId.
- Use remote TopoJSON URL (same as reference).
- Ensure map is client-rendered (`'use client'`) and does not SSR-crash.

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: interactive SVG map + performance considerations.
- **Skills**: `frontend-ui-ux`
  - `frontend-ui-ux`: keeps UI polished and consistent.
- **Skills Evaluated but Omitted**:
  - `playwright`: reserved for Task 7 verification.

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 6
- **Blocked By**: Tasks 1, 2, 3, 4

**References**:
- `/home/pobimgroup/thai-election-dashboard/components/ThailandMap.tsx` - baseline interaction model and map setup.
- `frontend/src/app/(public)/results/page.tsx` - existing theme primitives and layout constraints.

**Acceptance Criteria**:
- With dev servers running, `/results?electionId=demo-election-2027` renders an SVG map without console errors.
- Hovering a province shows tooltip; clicking a province updates selected state.

---

### 6) Frontend: linked charts, stats cards, province table, and province detail panel

**What to do**:
- Add components under `frontend/src/app/(public)/results/components/`:
  - `StatsCards.tsx`: compute nationwide totals from by-province data:
    - totalEligibleVoters = sum over provinces of sum(district voterCount) (provided by API via district voterCount sum, or computed from district counts if included).
    - totalVotes = sum(province.totalVotes).
    - turnout = totalVotes / totalEligibleVoters.
    - leading party = max of aggregated party vote totals.
  - `PartyResultsChart.tsx`: Recharts bar chart with votes and seats (stacked or two bars per party).
  - `ProvinceTable.tsx` (or combined in page): sortable table; clicking selects province.
  - `ProvinceDetail.tsx`: panel/modal; fetch by-district endpoint on selection; show district winner list + party distribution.
- Ensure shared selection state drives:
  - map highlight
  - table active row
  - chart filtering (optional MVP: keep chart nationwide, but highlight selected province’s distribution in detail panel).

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: multiple linked components + interaction state management.
- **Skills**: `frontend-ui-ux`

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3
- **Blocks**: Task 7
- **Blocked By**: Task 5

**References**:
- `backend/src/routes/results.ts` (by-district endpoint) - province detail data source.
- `frontend/src/lib/api.ts` - fetch helper.
- Reference charts patterns in `/home/pobimgroup/thai-election-dashboard/components/Charts.tsx` (optional guidance).

**Acceptance Criteria**:
- Province selection triggers exactly one fetch to by-district endpoint (cache results per provinceId).
- Changing selection updates map/table/detail consistently.

---

### 7) End-to-end verification + responsiveness/performance polish

**What to do**:
- Verify backend endpoints with curl.
- Verify dashboard rendering and interactions with Playwright.
- Run quality gates: lint/typecheck/build.
- Mobile responsiveness pass:
  - map height constraints
  - table becomes scrollable
  - detail panel uses bottom sheet or full-screen modal on small screens.

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: UI verification + layout fixes.
- **Skills**: `playwright`
  - `playwright`: agent-executable UI smoke and evidence capture.

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3 (final)
- **Blocks**: none
- **Blocked By**: Task 6

**References**:
- `package.json` - verification commands.
- `frontend/src/app/(public)/results/page.tsx` - final page entrypoint.

**Acceptance Criteria**:
```bash
npm run lint
npm run typecheck
npm run build
```

Playwright (agent executes):
1. Start `npm run dev` (frontend :3000, backend :3001).
2. Navigate to `http://localhost:3000/results?electionId=demo-election-2027`.
3. Wait for map SVG to appear.
4. Hover a province path → tooltip visible.
5. Click a province → province detail panel appears with district list.
6. Screenshot: `.sisyphus/evidence/results-dashboard.png`.

---

## Commit Strategy (optional)
- Commit 1: `feat(results): add province-level constituency aggregation endpoint`
- Commit 2: `feat(results): replace results page with province map dashboard`

---

## Phase 2 (Not in MVP)
- Add SSE-driven updates for by-province results (requires aligning/adding SSE events beyond party-list).
- Consider hosting TopoJSON locally for reliability and faster initial render.
