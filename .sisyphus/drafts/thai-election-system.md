# Draft: Thai Election System (Next.js + Express)

## Requirements (confirmed)
- Monorepo structure: `/frontend` (Next.js 14+ App Router) + `/backend` (Express) + `/shared` (TypeScript types)
- Ports: frontend `3000`, backend `3001`
- Styling/UI: Tailwind CSS + shadcn/ui
- Data source for seed: `/home/pobimgroup/thai-election-dashboard/data`
- Ballots per election instance:
  - Party list (national)
  - Constituency (400 districts)
  - Optional referendum questions (yes/no)
- Multi-election instances: each election has its own candidates, votes, results, referendums
- Auth: demo/mock ThaiD API, deterministic by `citizen_id`, returns {citizen_id, name, province, district, eligible_zone}
- RBAC roles: `super_admin`, `regional_admin`, `province_admin`, `district_official`
- Admin workflow: district officials can enter votes manually AND verify/approve uploaded data; full CRUD limited to assigned constituency
- Realtime results: SSE (server-sent events) for dashboard updates
- DB/ORM: SQLite + Prisma (portable demo)
- Vote privacy: demo-level only (store hashed voter identifier to prevent duplicates; no strong unlinkability)

## Technical Decisions (confirmed)
- Realtime transport: SSE (unidirectional)
- Persistence: SQLite + Prisma
- Vote dedupe: unique constraint on (election_id, ballot_type[, referendum_question_id], voter_hash)
- ThaiD determinism: stable mapping from `citizen_id` to eligibility attributes (no randomness)

## Scope Boundaries
- INCLUDE: full voting flow (verify -> vote party+constituency+optional referendums), admin RBAC CRUD, realtime results dashboard, data seeding from provided JSON
- EXCLUDE: production-grade crypto anonymization, integration with real ThaiD, production hardening (WAF, rate limiting beyond basic), full election law edge-cases

## Research Findings
- (pending) Repo conventions/structure discovery
- (pending) Best practices for Next.js + Express + RBAC + SSE

## Open Questions
- Test strategy: do you want automated tests (unit/integration/e2e) or manual-only verification for the demo?
