# Province Results Aggregation - Quick Reference Guide

## ⚡ TL;DR - Key Information

### Missing Endpoint
```
GET /results/:electionId/by-province?regionId=X

Returns: Province-level vote aggregation with:
- Province metadata (name, region, district count, voter count)
- Party vote counts & percentages per province
- Turnout percentage
- Sorted by total votes (descending)
```

### Relevant Files

**Backend:**
- `backend/src/routes/results.ts` - Add new GET handler
- `backend/src/routes/geo.ts` - Reference geo endpoints
- `backend/src/routes/stream.ts` - Reference SSE pattern
- `backend/prisma/schema.prisma` - Database structure

**Frontend:**
- `frontend/src/app/(public)/results/page.tsx` - Add province tab
- `frontend/src/hooks/useSSE.ts` - SSE client hook
- `frontend/src/lib/api.ts` - API utilities

**Shared Types:**
- `shared/src/types/geo.ts` - Province/Region/District types
- `shared/src/types/vote.ts` - Vote/Result types

---

## 🗺️ Database Hierarchy

```
Region (5 rows)
  ↓ (regionId FK)
Province (77 rows, e.g., "Bangkok", "Chiang Mai")
  ↓ (provinceId FK)
District (400 rows, ~5 per province)
  ↓ (districtId FK)
Candidate (2000 rows, ~5 per district)
  ↓ (candidateId FK in votes table)
Vote (4M+ rows)
```

**Key Fields for Province Aggregation:**
- `votes.ballotType` ∈ {'PARTY_LIST', 'CONSTITUENCY', 'REFERENDUM'}
- `votes.partyId` → parties (PARTY_LIST votes)
- `votes.candidateId` → candidates.districtId → districts.provinceId (CONSTITUENCY votes)
- `districts.voterCount` → used for turnout % calculation

---

## 🎯 Critical Gotchas

### 1. PARTY_LIST votes are NATIONAL, not provincial
```
❌ votes table: partyId field doesn't link to district/province
   → PARTY_LIST votes have NO geographic context in votes table

✅ Solution: Use CONSTITUENCY votes to infer party strength by province
   votes → candidates → districts → provinces → map back to parties
```

### 2. Province naming conventions
```
provinces.name   = "Bangkok" (English)
provinces.nameTh = "กรุงเทพมหานคร" (Thai)
→ ALWAYS display nameTh in frontend for Thai users
→ Use .toLocaleString('th-TH') for number formatting
```

### 3. District zone numbers are per-province
```
UNIQUE(provinceId, zoneNumber)
→ Bangkok districts: 1-50
→ Samut Prakan districts: 1-3
→ Use full name "กรุงเทพมหานคร เขต 1" not just "เขต 1"
```

### 4. 5 fixed regions (no custom regions)
```
Bangkok, Central (ภาคกลาง), North (ภาคเหนือ), 
Northeast (ภาคอีสาน), South (ภาคใต้)
```

---

## 📊 Response Format Reference

### Current National Endpoint Response
```typescript
GET /results/:electionId
{
  "success": true,
  "data": {
    "electionId": "string",
    "electionName": "ผลการเลือกตั้ง 2569",
    "status": "OPEN|CLOSED",
    "lastUpdated": "2025-02-02T14:50:00Z",
    "totalEligibleVoters": number,
    "totalVotesCast": number,
    "turnoutPercentage": number,
    "partyListResults": [
      {
        "partyId": "id",
        "partyName": "string",
        "partyNameTh": "string",
        "partyColor": "#XXXXXX",
        "voteCount": number,
        "percentage": number
      }
    ],
    "referendumResults": [...]
  }
}
```

### Proposed Province Endpoint Response
```typescript
GET /results/:electionId/by-province?regionId=X
{
  "success": true,
  "data": {
    "electionId": "string",
    "electionName": "string",
    "lastUpdated": "ISO8601",
    "totalProvinces": 77,
    "provincesWithVotes": number,
    "provinces": [
      {
        "provinceId": "string",
        "provinceName": "Bangkok",
        "provinceNameTh": "กรุงเทพมหานคร",
        "provinceCode": 10,
        "regionId": "string",
        "regionName": "Bangkok",
        "regionNameTh": "กรุงเทพมหานคร",
        "districtCount": 50,
        "totalEligibleVoters": number,
        "totalVotesCast": number,
        "turnoutPercentage": number,
        "partyResults": [
          {
            "partyId": "string",
            "partyName": "string",
            "partyNameTh": "string",
            "partyColor": "#XXXXXX",
            "voteCount": number,
            "percentage": number
          }
        ]
      }
    ]
  }
}
```

---

## 🚀 Implementation Steps

### Backend (2-3 hours)
1. Add route handler `router.get('/:electionId/by-province')` to `backend/src/routes/results.ts`
2. Implement aggregation logic:
   - Query all provinces with optional `regionId` filter
   - Get candidates with district→province mapping
   - Get constituency votes (grouped by candidateId)
   - Map votes back to provinces via candidates
   - Aggregate party votes by province
   - Calculate turnout percentages
3. Return JSON response with sorted results
4. Test with 4M+ vote dataset

### Frontend (4-6 hours)
1. Add "Province" tab to `frontend/src/app/(public)/results/page.tsx`
2. Create `ProvinceTab` component with:
   - Province selector dropdown/menu
   - KPI cards (region, districts, turnout, etc.)
   - Party results table/cards per province
3. Call `apiRequest('/results/:electionId/by-province')`
4. Format numbers with `.toLocaleString('th-TH')`
5. Style with Tailwind CSS

### Testing (2-3 hours)
1. Unit test: aggregation logic
2. Integration test: verify national totals match by-province totals
3. E2E test: load and display province page
4. Performance: ensure query < 1s for all 77 provinces

---

## 📝 Current Endpoint Patterns (Reference)

### GET /results/:electionId (National - lines 5-87)
```typescript
// Pattern: GROUP BY partyId, COUNT votes
const partyVotes = await prisma.vote.groupBy({
  by: ['partyId'],
  where: { electionId, ballotType: 'PARTY_LIST', partyId: { not: null } },
  _count: { id: true },
});

const parties = await prisma.party.findMany({...});

const partyResults = parties.map(party => ({
  partyId: party.id,
  partyNameTh: party.nameTh,
  voteCount: partyVotes.find(pv => pv.partyId === party.id)?._count.id || 0,
  percentage: ...,
})).sort((a, b) => b.voteCount - a.voteCount);
```

### GET /results/:electionId/by-district (District - lines 89-162)
```typescript
// Pattern: INCLUDE candidates with parties, then BUILD district results
const districts = await prisma.district.findMany({
  where: provinceId ? { provinceId } : undefined,
  include: { province: true },
});

const candidates = await prisma.candidate.findMany({
  where: { electionId },
  include: { party: true },
});

const votes = await prisma.vote.groupBy({
  by: ['candidateId'],
  where: { electionId, ballotType: 'CONSTITUENCY' },
  _count: { id: true },
});

const districtResults = districts.map(district => ({
  districtId: district.id,
  districtName: district.nameTh,
  provinceName: district.province.nameTh,
  candidates: districtCandidates.map(c => ({
    candidateName: `${c.titleTh}${c.firstNameTh} ${c.lastNameTh}`,
    partyName: c.party?.nameTh,
    voteCount: votes.find(v => v.candidateId === c.id)?._count.id || 0,
  })).sort((a, b) => b.voteCount - a.voteCount),
}));
```

### GET /geo/provinces (Geo Master - lines 8-28)
```typescript
// Pattern: GET provinces with region INCLUDE, count districts
const provinces = await prisma.province.findMany({
  where: regionId ? { regionId } : undefined,
  include: {
    region: true,
    _count: { select: { districts: true } },
  },
  orderBy: { nameTh: 'asc' },
});

res.json({ success: true, data: provinces.map(p => ({
  ...p,
  districtCount: p._count.districts,
})) });
```

---

## 🔗 Related API Endpoints (for Reference)

```
GET /geo/regions
  → Get all 5 regions with province counts

GET /geo/provinces?regionId=X
  → Get provinces filtered by region

GET /geo/provinces/:id
  → Get province with districts

GET /geo/districts?provinceId=X&regionId=Y
  → Get districts with optional filters

GET /geo/stats
  → Aggregate stats: total regions, provinces, districts, voters

GET /results/:electionId
  → National aggregate (ALL provinces)

GET /results/:electionId/by-district?provinceId=X
  → District-level results (constituency votes)

GET /stream/elections/:electionId/results
  → SSE stream: real-time national snapshot updates
```

---

## 💡 Design Decisions

### Why CONSTITUENCY votes for party strength by province?
- **PARTY_LIST votes** are cast nationally, not by district
- Can't determine where a PARTY_LIST vote came from
- **CONSTITUENCY votes** ARE district-specific via candidates
- Can map candidates → districts → provinces → parties

### Why filter provinces with votes > 0?
- Some provinces might have no data yet
- Cleaner response, matches user expectations
- Can be made configurable if needed

### Why include regionNameTh in response?
- Allows frontend to group by region
- Useful for regional comparisons
- Helps with RBAC (regional admins see their region)

---

## 📚 Documentation Files in Repo

- **RESULTS_ARCHITECTURE_DIAGRAM.md** (30KB) - System overview, data flow
- **THAI_DASHBOARD_ANALYSIS.md** (28KB) - Frontend structure & components
- **API_ENDPOINTS_COMPLETE.md** (33KB) - All endpoints documented
- **PROVINCE_AGGREGATION_ANALYSIS.md** (31KB) - **← THIS DOCUMENT (full version)**
- **API_QUICK_REFERENCE.md** (10KB) - Brief API overview
- **ANALYSIS_SUMMARY.md** (12KB) - Codebase analysis

---

## 🎬 Quick Start Commands

### Backend Testing
```bash
# Test endpoint exists (will 404 initially)
curl http://localhost:3001/results/demo-election-2027/by-province

# Test with region filter
curl http://localhost:3001/results/demo-election-2027/by-province?regionId=region-central
```

### Frontend Testing
```bash
# Check results page loads
curl http://localhost:3000/results?electionId=demo-election-2027

# Check API is reachable
curl http://localhost:3001/geo/provinces
```

---

## ❓ FAQ

**Q: Why not use VoteBatch?**
A: VoteBatch is for official district-level submissions. Individual voters use the votes table. We aggregate both, but focus on votes table first since that's the source of truth for individual votes.

**Q: Should province-level SSE stream exist too?**
A: Yes, but it's optional. Would need `GET /stream/elections/:electionId/results/by-province?provinceId=X`. Low priority.

**Q: What about referendum votes by province?**
A: Referendum votes are also national (no geographic context). Would need similar mapping to CONSTITUENCY votes.

**Q: How to handle tie-breaking/rounding?**
A: Use consistent rounding (e.g., Math.floor or toFixed(2)) and document it.

**Q: Performance concerns with 4M votes?**
A: Queries should be < 1s with proper indexes. Prisma groupBy is efficient. Main bottleneck is mapping candidates to provinces in memory (fixable with raw query if needed).

---

**Last Updated:** 2025-02-02  
**Next Action:** Start backend implementation with test endpoint
