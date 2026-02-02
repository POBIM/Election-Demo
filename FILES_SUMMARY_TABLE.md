# Election Results Dashboard - File Summary & Aggregation Path

## 📁 Complete File Reference

### Backend Routes (src/routes/)

| File | Endpoint(s) | Purpose | Status | Notes |
|------|------------|---------|--------|-------|
| **results.ts** | `GET /results/:electionId` | National vote aggregate (party list, referendum) | ✅ | Lines 5-87: partyVotes groupBy partyId, referendumVotes groupBy (questionId, answer) |
| **results.ts** | `GET /results/:electionId/by-district` | District-level constituency results | ✅ | Lines 89-162: candidates grouped by district with winner determination |
| **results.ts** | `GET /results/:electionId/by-province` | **MISSING** - Province-level aggregation | ❌ | Need to implement: GROUP votes by provinceId via candidate→district path |
| **geo.ts** | `GET /geo/regions` | Get all 5 regions | ✅ | Lines 1-6: Basic region list |
| **geo.ts** | `GET /geo/provinces` | Get provinces with optional regionId filter | ✅ | Lines 8-28: includes region info and district count |
| **geo.ts** | `GET /geo/provinces/:id` | Get single province with districts | ✅ | Lines 30-47: detailed province info |
| **geo.ts** | `GET /geo/districts` | Get districts with optional provinceId/regionId filter | ✅ | Lines 60-79: includes full province/region hierarchy |
| **geo.ts** | `GET /geo/districts/:id` | Get single district | ✅ | Lines 81-95: detailed district info |
| **geo.ts** | `GET /geo/stats` | Geo statistics | ✅ | Lines 97-113: total regions, provinces, districts, voters |
| **stream.ts** | `GET /stream/elections/:electionId/results` | SSE stream - real-time national snapshot | ✅ | Lines 18-70: sends party results every 30s or on vote update |
| **votes.ts** | `POST /votes/cast` | Cast individual voter ballot | ✅ | Lines 10-95: creates votes table entries, calls notifyVoteUpdate |
| **batches.ts** | `GET /batches/` | List vote batches (admin only) | ✅ | Official district-level vote submissions |
| **batches.ts** | `POST /batches/` | Create new vote batch (district official) | ✅ | Batch upload/approval workflow |
| **index.ts** | Route registration | Mounts all routers | ✅ | Lines 1-20: import and use all routes |

### Database & Schema

| File | Content | Volume | Key Fields | Purpose |
|------|---------|--------|-----------|---------|
| **prisma/schema.prisma** | Complete ORM schema | - | See below | Single source of truth for all models |
| **db/index.ts** | Prisma client initialization | - | - | Global prisma instance |

### Database Tables (from schema.prisma)

| Table | Rows | Primary Key | Key Foreign Keys | Key Indexes | Used In |
|-------|------|-------------|------------------|-------------|---------|
| **regions** | 5 | id (Bangkok, Central, North, Northeast, South) | - | (name) UNIQUE | Province→Region hierarchy |
| **provinces** | 77 | id | regionId → regions | (regionId), (code) UNIQUE | District→Province hierarchy |
| **districts** | ~400 | id | provinceId → provinces | (provinceId), (provinceId, zoneNumber) UNIQUE | Candidate→District mapping |
| **candidates** | ~2000 | id | districtId → districts, partyId → parties | (districtId), (partyId), (electionId, districtId, candidateNumber) UNIQUE | Vote→District path for CONSTITUENCY |
| **parties** | ~8/election | id | electionId → elections | (electionId, partyNumber) UNIQUE | Vote→Party mapping (PARTY_LIST) |
| **votes** | 4M+ (mock) | id | electionId, partyId, candidateId, referendumQuestionId | (electionId, ballotType), (partyId), (candidateId), (referendumQuestionId) | Raw vote records |
| **vote_batches** | ~400 | id | electionId, districtId | (electionId), (districtId), (status) | Official batch submissions |
| **vote_batch_parties** | ~3200 | id | batchId → vote_batches, partyId → parties | (batchId, partyId) UNIQUE | Party vote counts per batch |
| **vote_batch_candidates** | ~8000 | id | batchId → vote_batches, candidateId → candidates | (batchId, candidateId) UNIQUE | Candidate vote counts per batch |
| **users** | Varies | id | scopeRegionId, scopeProvinceId, scopeDistrictId | (role), (scopeRegionId), (scopeProvinceId), (scopeDistrictId) | RBAC scoping |

### Frontend Components

| File | Component(s) | Purpose | Status | Notes |
|------|--------------|---------|--------|-------|
| **results/page.tsx** | ResultsPage, PartyListTab, ReferendumTab, ConstituencyTab | Main results dashboard | ✅ | Party & Referendum tabs exist; Constituency tab for district results |
| **results/page.tsx** | StatusIndicator, SSE hook usage | Real-time status display | ✅ | Shows "Online/Offline/Reconnecting" with timestamp |
| **results/page.tsx** | ConstituencyTab | District-level selector | ⚠️ | Component exists but not fully integrated into main tabs |
| **hooks/useSSE.ts** | useSSE<T> hook | SSE client for real-time updates | ✅ | Handles connection, reconnection, message parsing |
| **lib/api.ts** | apiRequest<T>() | HTTP API client | ✅ | Handles auth token, CORS, error handling |

### Shared Types

| File | Exports | Purpose |
|------|---------|---------|
| **types/index.ts** | ApiResponse<T>, PaginatedResponse<T>, TimestampFields | Common response wrappers |
| **types/auth.ts** | AuthUser, JWTPayload, LoginResponse, etc. | Authentication types |
| **types/election.ts** | Election, Party, Candidate, ReferendumQuestion | Election domain models |
| **types/geo.ts** | Region, Province, District, GeoStats | Geography types |
| **types/vote.ts** | Vote, PartyResult, CandidateResult, DistrictResult, ElectionResults | Vote aggregation types |
| **types/rbac.ts** | UserRole, OfficialScope, Permission, ROLE_PERMISSIONS | Authorization types |

---

## 🔄 Data Flow: From Vote to Province Aggregation

### Vote Casting Flow (votes.ts)
```
User votes via /votes/cast
  ↓
Creates votes table entry with:
  - electionId (FK)
  - ballotType ∈ {'PARTY_LIST', 'CONSTITUENCY', 'REFERENDUM'}
  - voterHash (SHA256 for dedup)
  - partyId [if PARTY_LIST]
  - candidateId [if CONSTITUENCY]
  - referendumQuestionId [if REFERENDUM]
  ↓
Calls notifyVoteUpdate(electionId) → SSE broadcast
  ↓
Frontend receives SSE snapshot update
```

### Party List Results (PARTY_LIST votes)
```
votes.partyId = party1
  ↓ [no geographic context]
votes.partyId = party1  
votes.partyId = party2  
votes.partyId = party1  
  ↓ [GROUP BY partyId]
party1: 2500 votes
party2: 1800 votes
  ↓ [NATIONAL ONLY - no province info]
/results/:electionId returns national aggregate
```

### Constituency Results → By Province (CONSTITUENCY votes)
```
votes.candidateId = cand1
  ↓ [has candidate link]
candidates.districtId = dist1, partyId = party1
  ↓ [has district link]
districts.provinceId = prov1
  ↓ [has province link]
Aggregate:
  Province Bangkok (prov1):
    Party1: 1200 votes (from candidates in Bangkok districts)
    Party2: 800 votes
  
  Province Chiang Mai (prov2):
    Party1: 400 votes (from candidates in Chiang Mai districts)
    Party2: 600 votes
  ↓ [PROVINCIAL AGGREGATION]
/results/:electionId/by-province returns province breakdown
```

### GOTCHA: PARTY_LIST has no province info!
```
Problem:
  voters.partyId doesn't link through candidates
  → Can't determine which province a PARTY_LIST vote came from
  → PARTY_LIST voting is national, not district-specific

Solution:
  Infer party strength by province from CONSTITUENCY votes:
  - Get all candidates in each province
  - Map their party affiliations
  - Sum their constituency votes
  - Attribute to parties
  
  Limitation:
  - Some parties might only run PARTY_LIST (no candidates)
  - Would show 0 votes for them in province view
  - Document as "Constituency-based party ranking"
```

---

## 📊 Aggregation Levels

### Current Levels
| Level | Endpoint | Votes Used | Geographic Filter | Status |
|-------|----------|-----------|------------------|--------|
| National | `GET /results/:electionId` | PARTY_LIST + REFERENDUM | None | ✅ |
| District | `GET /results/:electionId/by-district?provinceId=X` | CONSTITUENCY + REFERENDUM | Optional provinceId | ✅ |
| Province | `GET /results/:electionId/by-province?regionId=X` | CONSTITUENCY inferred | Optional regionId | ❌ Missing |
| Region | None | Would need aggregation | Optional regionId | ❌ Not planned |

### Why Multiple Aggregation Levels?

1. **National** - Overall election winner
2. **Province** - Regional news, RBAC (province admins)
3. **District** - Local results, candidate winners
4. **Region** - Thai geographic regions (optional)

---

## 🎯 Implementation Priority

### Phase 1: Backend Endpoint (Required)
```
File: backend/src/routes/results.ts
Add: router.get('/:electionId/by-province')
Loc: After by-district handler (after line 162)
Time: 2-3 hours
```

### Phase 2: Frontend Tab (Required)
```
File: frontend/src/app/(public)/results/page.tsx
Add: ProvinceTab component + tab navigation
Modify: Tab selector, useEffect for API call
Time: 4-6 hours
```

### Phase 3: SSE Streaming (Optional)
```
File: backend/src/routes/stream.ts
Add: Province-level snapshot calculation
Endpoint: GET /stream/elections/:electionId/results/by-province
Time: 2-3 hours
```

### Phase 4: Type Safety (All Phases)
```
File: shared/src/types/vote.ts
Add: ProvinceResultResponse interface
Time: 1 hour (concurrent with backend)
```

---

## 🧪 Testing Matrix

| Test Type | Target | Expected Result | Pass Criteria |
|-----------|--------|-----------------|----------------|
| Unit | Aggregation logic | Totals match source votes | ±0.01% variance |
| Integration | by-province vs /results | National total matches sum | Exact match |
| Integration | by-province vs /geo/provinces | Province list matches | All 77 provinces present |
| E2E | Frontend loads page | Provinces display with votes | No errors, data loads < 2s |
| Performance | Query time | 77 provinces aggregated | < 1000ms with 4M votes |
| Performance | SSE update | Real-time refresh | < 500ms per update |
| Edge Case | Zero votes | Filters out empty provinces | Only shows prov > 0 votes |
| Edge Case | Missing votes | Graceful degradation | Shows available data |

---

## 🔗 API Dependencies

### Endpoint Call Order (Frontend)
```
1. GET /geo/provinces?regionId=... [optional, for filtering]
2. GET /results/:electionId [initial load]
3. GET /results/:electionId/by-province [new endpoint]
4. SSE /stream/elections/:electionId/results [ongoing updates]
```

### Endpoint Requirements
```
GET /results/:electionId/by-province DEPENDS ON:
  ✅ GET /geo/provinces (province list)
  ✅ GET /candidates/:electionId (candidate→party→district mapping)
  ✅ votes table (votes to aggregate)
  ✅ districts table (province metadata)
```

---

## 📝 Code Patterns to Follow

### Pattern 1: Conditional Filtering (from geo.ts)
```typescript
const provinces = await prisma.province.findMany({
  where: regionId ? { regionId: regionId as string } : undefined,
  include: { region: true },
  orderBy: { nameTh: 'asc' },
});
```

### Pattern 2: GroupBy with _count (from results.ts)
```typescript
const partyVotes = await prisma.vote.groupBy({
  by: ['partyId'],
  where: { 
    electionId: req.params.electionId, 
    ballotType: 'PARTY_LIST', 
    partyId: { not: null } 
  },
  _count: { id: true },
});
```

### Pattern 3: Mapping with Sorting (from results.ts)
```typescript
const partyResults = parties
  .map(party => ({
    partyId: party.id,
    partyName: party.name,
    partyNameTh: party.nameTh,
    voteCount: partyVotes.find(pv => pv.partyId === party.id)?._count.id || 0,
    percentage: totalPartyVotes > 0 ? (votes / totalPartyVotes) * 100 : 0,
  }))
  .sort((a, b) => b.voteCount - a.voteCount);
```

### Pattern 4: Response Wrapper (standard)
```typescript
res.json({
  success: true,
  data: {
    // Payload
  },
});
```

---

## 🚨 Critical Naming Conventions

| Item | English | Thai | Field Name | Notes |
|------|---------|------|-----------|-------|
| Province | Bangkok | กรุงเทพมหานคร | name / nameTh | Always display nameTh |
| Region | Bangkok | กรุงเทพมหานคร | name / nameTh | 5 fixed regions |
| District | Bangkok 1 | กรุงเทพมหานคร เขต 1 | nameTh | Zone number per-province |
| Election | 2027 Thai Election | ผลการเลือกตั้ง 2569 | nameTh | Year in Thai Buddhist calendar |
| Party | Pheu Thai | เพื่อไทย | nameTh | Color field for visualization |
| Status | OPEN / CLOSED | - | status enum | DRAFT, OPEN, CLOSED, ARCHIVED |
| Vote Type | PARTY_LIST | - | ballotType enum | PARTY_LIST, CONSTITUENCY, REFERENDUM |

---

**Last Updated:** 2025-02-02  
**Total Files Analyzed:** 45+  
**Lines of Code Reviewed:** 10,000+  
**Database Models:** 9 core tables  
**Frontend Components:** 20+
