# Election Results by Province (GET /results/:electionId/by-province) - Implementation Guide

**Analysis Date:** 2025-02-02  
**Project:** Thai Election Dashboard  
**Scope:** Backend results aggregation, geo endpoints, SSE streaming

---

## 📋 EXECUTIVE SUMMARY

### Current State
- ✅ **GET /results/:electionId** - National aggregate (party list, referendum)
- ✅ **GET /results/:electionId/by-district?provinceId=X** - District-level with province filter
- ✅ **GET /geo/provinces** - Province master data with region info
- ✅ **GET /geo/districts** - District master data with province/region info
- ✅ **GET /stream/elections/:electionId/results** - SSE national snapshot updates
- ❌ **GET /results/:electionId/by-province** - **MISSING**
- ❌ **GET /stream/elections/:electionId/results/by-province** - **MISSING (SSE variant)**

### Requirement
Implement `GET /results/:electionId/by-province` endpoint that aggregates votes at province level:
- Group party votes by province
- Include province metadata (name, region, district count, voter count)
- Sort by votes (descending)
- Optional: filter by region/province/ballot-type
- Return district breakdown within each province

---

## 🗂️ RELEVANT FILES WITH PATHS

### Backend Routes
| File | Purpose | Status |
|------|---------|--------|
| `backend/src/routes/results.ts` | Election results endpoints | ✅ Exists |
| `backend/src/routes/geo.ts` | Geography (province/district) endpoints | ✅ Exists |
| `backend/src/routes/stream.ts` | SSE streaming for real-time updates | ✅ Exists |
| `backend/src/routes/index.ts` | Route registration | ✅ Exists |
| `backend/src/routes/votes.ts` | Vote casting (for context) | ✅ Exists |
| `backend/src/routes/batches.ts` | Vote batch upload/approval | ✅ Exists |

### Database
| File | Content |
|------|---------|
| `backend/prisma/schema.prisma` | Complete data models (Region, Province, District, Vote, etc.) |
| `backend/src/db/index.ts` | Prisma client initialization |

### Shared Types
| File | Purpose |
|------|---------|
| `shared/src/types/geo.ts` | Region, Province, District interfaces |
| `shared/src/types/vote.ts` | Vote, PartyResult, DistrictResult interfaces |
| `shared/src/types/election.ts` | Election, Party, Candidate interfaces |
| `shared/src/types/index.ts` | Common types (ApiResponse, TimestampFields) |

### Frontend
| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/app/(public)/results/page.tsx` | Main results page (Party/Referendum tabs) | ✅ Exists |
| `frontend/src/hooks/useSSE.ts` | SSE client hook | ✅ Exists |
| `frontend/src/lib/api.ts` | API request utility | ✅ Exists |

---

## 🏗️ DATABASE SCHEMA OVERVIEW

### Core Geo Hierarchy
```
Region (5 rows: Bangkok, Central, North, Northeast, South)
  ↓ (1:N via regionId)
Province (77 rows)
  ↓ (1:N via provinceId)
District (400 rows, ~5 per province)
```

### Vote Flow to Province
```
votes table
├─ electionId (FK → elections)
├─ ballotType ('PARTY_LIST' | 'CONSTITUENCY' | 'REFERENDUM')
├─ partyId (FK → parties) [for PARTY_LIST votes]
├─ candidateId (FK → candidates) [for CONSTITUENCY votes]
│  └─ candidate.districtId (FK → districts.id)
│     └─ district.provinceId (FK → provinces.id) ◄── KEY PATH
└─ referendumQuestionId (FK → referendum_questions) [for REFERENDUM votes]
```

### Key Tables for Aggregation

#### `votes` Table
- **Columns:** id, electionId, ballotType, voterHash, partyId, candidateId, referendumQuestionId, referendumAnswer, createdAt
- **Indexes:** (electionId, ballotType), (partyId), (candidateId), (referendumQuestionId)
- **Volume:** 4M+ mock rows in seed data
- **Use Case:** GROUP BY partyId, COUNT(*) for party vote aggregation

#### `candidates` Table
- **Columns:** id, electionId, districtId, partyId, candidateNumber, titleTh, firstNameTh, lastNameTh, ...
- **Foreign Keys:** districtId → districts.id
- **Use Case:** JOIN votes → candidates → districts to get provinceId

#### `districts` Table
- **Columns:** id, provinceId, zoneNumber, name, nameTh, zoneDescription, amphoeList, voterCount, ...
- **Foreign Keys:** provinceId → provinces.id
- **Use Case:** provides voterCount for turnout calculation

#### `provinces` Table
- **Columns:** id, code, name, nameTh, regionId, createdAt, updatedAt
- **Foreign Keys:** regionId → regions.id
- **Indexes:** (regionId)
- **Use Case:** province metadata (name, region)

#### `regions` Table
- **Columns:** id, name, nameTh
- **Use Case:** region aggregation (optional)

---

## 📊 CURRENT ENDPOINT ANALYSIS

### 1. GET /results/:electionId (National Aggregate)

**File:** `backend/src/routes/results.ts` (lines 5-87)

**Implementation:**
```typescript
router.get('/:electionId', async (req, res) => {
  // 1. Validate election exists
  // 2. GROUP BY partyId, count votes
  // 3. GROUP BY (referendumQuestionId, referendumAnswer), count votes
  // 4. AGGREGATE voterCount from all districts
  // 5. Return partyResults[], referendumResults[]
});
```

**Key Patterns:**
```typescript
// Party votes aggregation
const partyVotes = await prisma.vote.groupBy({
  by: ['partyId'],
  where: { electionId: req.params.electionId, ballotType: 'PARTY_LIST', partyId: { not: null } },
  _count: { id: true },
});

// Get all parties
const parties = await prisma.party.findMany({
  where: { electionId: req.params.electionId },
  orderBy: { partyNumber: 'asc' },
});

// Map votes to parties with percentages
const partyResults = parties.map(party => {
  const votes = partyVotes.find(pv => pv.partyId === party.id)?._count.id || 0;
  return {
    partyId: party.id,
    partyName: party.name,
    partyNameTh: party.nameTh,
    partyColor: party.color,
    voteCount: votes,
    percentage: totalPartyVotes > 0 ? (votes / totalPartyVotes) * 100 : 0,
  };
}).sort((a, b) => b.voteCount - a.voteCount);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "electionId": "string",
    "electionName": "string",
    "status": "string",
    "lastUpdated": "ISO8601",
    "totalEligibleVoters": number,
    "totalVotesCast": number,
    "turnoutPercentage": number,
    "partyListResults": [
      {
        "partyId": "string",
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

---

### 2. GET /results/:electionId/by-district?provinceId=X (District-Level)

**File:** `backend/src/routes/results.ts` (lines 89-162)

**Implementation:**
```typescript
router.get('/:electionId/by-district', async (req, res) => {
  const { provinceId } = req.query;

  // 1. Get districts (optionally filtered by provinceId)
  const districts = await prisma.district.findMany({
    where: provinceId ? { provinceId: provinceId as string } : undefined,
    include: { province: true },
    orderBy: [{ province: { nameTh: 'asc' } }, { zoneNumber: 'asc' }],
  });

  // 2. Get all candidates
  const candidates = await prisma.candidate.findMany({
    where: { electionId: req.params.electionId },
    include: { party: true },
  });

  // 3. GROUP votes by candidateId
  const votes = await prisma.vote.groupBy({
    by: ['candidateId'],
    where: { electionId: req.params.electionId, ballotType: 'CONSTITUENCY' },
    _count: { id: true },
  });

  // 4. BUILD district results with candidate breakdown
  const districtResults = districts.map(district => {
    // filter candidates for this district
    // calculate percentages
    // find winner
    return {
      districtId: district.id,
      districtName: district.nameTh,
      provinceName: district.province.nameTh,
      voterCount: district.voterCount,
      totalVotes: candidateResults.reduce((sum, c) => sum + c.voteCount, 0),
      turnoutPercentage: ...,
      candidates: candidateResults,
      winner: candidateResults[0],
    };
  });

  res.json({ success: true, data: districtResults });
});
```

**Response Structure:**
```typescript
interface DistrictResultResponse {
  districtId: string;
  districtName: string;
  provinceName: string;
  voterCount: number;
  totalVotes: number;
  turnoutPercentage: number;
  candidates: {
    candidateId: string;
    candidateName: string;
    partyName: string;
    partyColor: string;
    voteCount: number;
    percentage: number;
    isWinner: boolean;
  }[];
  winner: CandidateResult | null;
}[]
```

**Key Insight:** Uses `by-district` for CONSTITUENCY votes, not party list!

---

### 3. GET /geo/provinces (Geography Master Data)

**File:** `backend/src/routes/geo.ts` (lines 8-28)

**Implementation:**
```typescript
router.get('/provinces', async (req, res) => {
  const { regionId } = req.query;

  const provinces = await prisma.province.findMany({
    where: regionId ? { regionId: regionId as string } : undefined,
    include: {
      region: true,
      _count: { select: { districts: true } },
    },
    orderBy: { nameTh: 'asc' },
  });

  res.json({
    success: true,
    data: provinces.map(p => ({
      ...p,
      districtCount: p._count.districts,
    })),
  });
});
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "province-id",
      "code": 10,
      "name": "Bangkok",
      "nameTh": "กรุงเทพมหานคร",
      "regionId": "region-id",
      "region": {
        "id": "region-id",
        "name": "Bangkok",
        "nameTh": "กรุงเทพมหานคร"
      },
      "districtCount": 50,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

---

### 4. GET /geo/districts (District Master Data)

**File:** `backend/src/routes/geo.ts` (lines 60-79)

**Implementation:**
```typescript
router.get('/districts', async (req, res) => {
  const { provinceId, regionId } = req.query;

  const districts = await prisma.district.findMany({
    where: {
      ...(provinceId ? { provinceId: provinceId as string } : {}),
      ...(regionId ? { province: { regionId: regionId as string } } : {}),
    },
    include: {
      province: { include: { region: true } },
    },
    orderBy: [{ province: { nameTh: 'asc' } }, { zoneNumber: 'asc' }],
  });

  res.json({ success: true, data: districts });
});
```

**Key Fields:**
- `id`, `provinceId`, `zoneNumber`, `name`, `nameTh`
- `zoneDescription`, `amphoeList` (JSON array of sub-districts)
- `voterCount` (critical for turnout calculation)

---

### 5. GET /stream/elections/:electionId/results (SSE - Real-time)

**File:** `backend/src/routes/stream.ts`

**Implementation:**
```typescript
router.get('/elections/:electionId/results', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Add client to subscribers list
  const clientId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  clients.push({ id: clientId, res, electionId });

  // Send initial snapshot
  const snapshot = await getElectionSnapshot(electionId);
  res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);

  // Keep-alive heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // On client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    // remove client from subscribers
  });
});

// Called by votes.ts after every vote.create()
export function notifyVoteUpdate(electionId: string): void {
  getElectionSnapshot(electionId).then(snapshot => {
    sendToClients(electionId, { event: 'vote_update', ...snapshot });
  });
}
```

**SSE Snapshot Structure:**
```typescript
interface SSESnapshot {
  timestamp: string;           // ISO8601
  totalVotes: number;          // Sum of all party votes
  partyResults: {
    partyId: string;
    partyName: string;          // Thai name
    partyColor: string;         // Hex color
    voteCount: number;
  }[];
}
```

**Current Limitation:** Only sends PARTY_LIST aggregates, not district/province breakdowns.

---

## 🎯 IMPLEMENTATION PLAN: GET /results/:electionId/by-province

### A. Backend Endpoint Structure

**Location:** Add to `backend/src/routes/results.ts`

**Signature:**
```typescript
router.get('/:electionId/by-province', async (req, res) => {
  const { regionId } = req.query;
  // Implementation
});
```

**Query Parameters:**
- `regionId` (optional): Filter to single region
- Could add: `sortBy` (votes|name), `limit` (for top N provinces)

### B. Aggregation Logic - Two Approaches

#### Approach 1: GROUP BY + JOIN (Recommended - Better Performance)

```typescript
// Get all votes with province info
const votesByProvince = await prisma.vote.groupBy({
  by: ['partyId'],
  where: { 
    electionId: req.params.electionId, 
    ballotType: 'PARTY_LIST',
    partyId: { not: null },
    // Can we filter by province here? We need a subquery...
  },
  _count: { id: true },
});

// This approach has a problem: votes table doesn't have direct provinceId link!
// Need to use JOIN through candidates → districts
```

#### Approach 2: Aggregate in Memory (Simpler, Works)

```typescript
// 1. Get all party votes with candidate district info
const votes = await prisma.vote.findMany({
  where: {
    electionId: req.params.electionId,
    ballotType: 'PARTY_LIST',
    partyId: { not: null },
  },
  include: {
    party: true,
    candidate: { // This won't work for PARTY_LIST votes (candidateId is null)
      include: { district: true },
    },
  },
});

// Problem: PARTY_LIST votes don't have candidateId!
// We need a different approach...
```

#### Approach 3: Query by District, Aggregate to Province (CORRECT)

```typescript
// 1. Get districts with their provinces
const districts = await prisma.district.findMany({
  where: regionId ? { province: { regionId: regionId as string } } : undefined,
  include: {
    province: { include: { region: true } },
    _count: { select: { voteBatches: true } },
  },
});

// 2. For EACH district, get votes (from votes table grouped by partyId)
const districtPartyVotes = await Promise.all(
  districts.map(async (district) => {
    const candidates = await prisma.candidate.findMany({
      where: { 
        electionId: req.params.electionId,
        districtId: district.id,
      },
    });

    const votes = await prisma.vote.groupBy({
      by: ['partyId'],
      where: {
        electionId: req.params.electionId,
        ballotType: 'PARTY_LIST',
        // Can't directly filter by district for PARTY_LIST
        // Because PARTY_LIST votes don't link to candidates/districts!
      },
      _count: { id: true },
    });

    return { district, votes };
  })
);

// Problem: PARTY_LIST votes are NATIONAL, not per-district!
// We need to think differently...
```

#### Approach 4: GROUP votes by VoteBatch → District → Province (BEST)

**Key Insight:** Vote data comes from:
1. **Direct votes.* table** - individual votes (don't have geo info for PARTY_LIST)
2. **vote_batches.* table** - aggregated votes per district from officials

**VoteBatch structure:**
```
VoteBatch
├─ districtId (FK → districts)
├─ partyVotes: VoteBatchParty[]
│  ├─ partyId
│  └─ voteCount
└─ constituencyVotes: VoteBatchCandidate[]
   ├─ candidateId
   └─ voteCount
```

**Implementation:**
```typescript
// 1. Get provinces (with optional region filter)
const provinces = await prisma.province.findMany({
  where: regionId ? { regionId: regionId as string } : undefined,
  include: {
    region: true,
    districts: {
      include: {
        _count: { select: { voteBatches: true } },
      },
    },
  },
  orderBy: { nameTh: 'asc' },
});

// 2. Get all party data
const parties = await prisma.party.findMany({
  where: { electionId: req.params.electionId },
});

// 3. Get vote batches for this province
const voteBatches = await prisma.voteBatch.findMany({
  where: {
    electionId: req.params.electionId,
    status: 'APPROVED', // Only count approved batches
    district: {
      provinceId: { in: provinces.map(p => p.id) },
    },
  },
  include: {
    partyVotes: true,
    constituencyVotes: true,
  },
});

// 4. Aggregate batches by province
const provinceAggregates = provinces.map(province => {
  const provinceBatches = voteBatches.filter(
    b => province.districts.some(d => d.id === b.districtId)
  );

  const partyVotesByProvince = new Map<string, number>();
  const totalVotes = provinceBatches.reduce((sum, batch) => {
    batch.partyVotes.forEach(pv => {
      partyVotesByProvince.set(
        pv.partyId,
        (partyVotesByProvince.get(pv.partyId) || 0) + pv.voteCount
      );
    });
    return sum + batch.totalVotes;
  }, 0);

  const partyResults = parties
    .map(party => {
      const votes = partyVotesByProvince.get(party.id) || 0;
      return {
        partyId: party.id,
        partyName: party.name,
        partyNameTh: party.nameTh,
        partyColor: party.color,
        voteCount: votes,
        percentage: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
      };
    })
    .filter(p => p.voteCount > 0)
    .sort((a, b) => b.voteCount - a.voteCount);

  const totalVoters = province.districts.reduce((sum, d) => sum + d.voterCount, 0);

  return {
    provinceId: province.id,
    provinceName: province.name,
    provinceNameTh: province.nameTh,
    provinceCode: province.code,
    regionId: province.region.id,
    regionName: province.region.name,
    regionNameTh: province.region.nameTh,
    districtCount: province.districts.length,
    totalEligibleVoters: totalVoters,
    totalVotesCast: totalVotes,
    turnoutPercentage: totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0,
    partyResults,
  };
});

res.json({
  success: true,
  data: {
    electionId: req.params.electionId,
    lastUpdated: new Date().toISOString(),
    provinces: provinceAggregates
      .filter(p => p.totalVotesCast > 0) // Only provinces with votes
      .sort((a, b) => b.totalVotesCast - a.totalVotesCast),
  },
});
```

---

## 🏆 RECOMMENDED IMPLEMENTATION

### Full Code for backend/src/routes/results.ts (addition)

```typescript
router.get('/:electionId/by-province', async (req, res) => {
  const { regionId } = req.query;

  try {
    const election = await prisma.election.findUnique({
      where: { id: req.params.electionId },
    });

    if (!election) {
      res.status(404).json({ success: false, error: 'Election not found' });
      return;
    }

    // 1. Get provinces with optional region filter
    const provinces = await prisma.province.findMany({
      where: regionId ? { regionId: regionId as string } : undefined,
      include: {
        region: true,
        districts: { select: { id: true, voterCount: true } },
        _count: { select: { districts: true } },
      },
      orderBy: { nameTh: 'asc' },
    });

    // 2. Get all parties for this election
    const parties = await prisma.party.findMany({
      where: { electionId: req.params.electionId },
      orderBy: { partyNumber: 'asc' },
    });

    // 3. For PARTY_LIST: Get votes aggregated by province via candidates
    const candidatesByDistrict = await prisma.candidate.findMany({
      where: { electionId: req.params.electionId },
      select: {
        id: true,
        partyId: true,
        districtId: true,
        district: { select: { provinceId: true } },
      },
    });

    // Build map: candidateId → provinceId
    const candidateToProvince = new Map(
      candidatesByDistrict.map(c => [c.id, c.district.provinceId])
    );

    // Get CONSTITUENCY votes
    const constituencyVotes = await prisma.vote.groupBy({
      by: ['candidateId'],
      where: {
        electionId: req.params.electionId,
        ballotType: 'CONSTITUENCY',
      },
      _count: { id: true },
    });

    // 4. For PARTY_LIST: Get votes (PARTY_LIST is national, no district info in votes)
    const partyListVotes = await prisma.vote.groupBy({
      by: ['partyId'],
      where: {
        electionId: req.params.electionId,
        ballotType: 'PARTY_LIST',
        partyId: { not: null },
      },
      _count: { id: true },
    });

    // Build partyVotes by province from CONSTITUENCY votes
    // (Map candidates to provinces, sum by party)
    const partyVotesByProvince = new Map<string, Map<string, number>>();
    for (const province of provinces) {
      partyVotesByProvince.set(province.id, new Map());
    }

    for (const candidate of candidatesByDistrict) {
      const provinceId = candidate.district.provinceId;
      const candidateVoteCount =
        constituencyVotes.find(v => v.candidateId === candidate.id)?._count.id || 0;

      if (candidateVoteCount > 0 && candidate.partyId) {
        const provinceMap = partyVotesByProvince.get(provinceId)!;
        provinceMap.set(
          candidate.partyId,
          (provinceMap.get(candidate.partyId) || 0) + candidateVoteCount
        );
      }
    }

    // 5. Build province results
    const provinceResults = provinces
      .map(province => {
        const provPartyVotes = partyVotesByProvince.get(province.id) || new Map();
        const totalVotes = Array.from(provPartyVotes.values()).reduce((a, b) => a + b, 0);
        const totalEligibleVoters = province.districts.reduce((sum, d) => sum + d.voterCount, 0);

        const partyResults = parties
          .map(party => {
            const votes = provPartyVotes.get(party.id) || 0;
            return {
              partyId: party.id,
              partyName: party.name,
              partyNameTh: party.nameTh,
              partyColor: party.color,
              voteCount: votes,
              percentage: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
            };
          })
          .filter(p => p.voteCount > 0)
          .sort((a, b) => b.voteCount - a.voteCount);

        return {
          provinceId: province.id,
          provinceName: province.name,
          provinceNameTh: province.nameTh,
          provinceCode: province.code,
          regionId: province.region.id,
          regionName: province.region.name,
          regionNameTh: province.region.nameTh,
          districtCount: province._count.districts,
          totalEligibleVoters,
          totalVotesCast: totalVotes,
          turnoutPercentage: totalEligibleVoters > 0 
            ? (totalVotes / totalEligibleVoters) * 100 
            : 0,
          partyResults,
        };
      })
      .filter(p => p.totalVotesCast > 0) // Only provinces with votes
      .sort((a, b) => b.totalVotesCast - a.totalVotesCast);

    res.json({
      success: true,
      data: {
        electionId: election.id,
        electionName: election.nameTh,
        lastUpdated: new Date().toISOString(),
        totalProvinces: provinces.length,
        provincesWithVotes: provinceResults.length,
        provinces: provinceResults,
      },
    });
  } catch (error) {
    console.error('Error fetching province results:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
```

---

## ⚠️ IMPORTANT GOTCHAS & NAMING ISSUES

### 1. **PARTY_LIST votes don't have district/province info**
- **Issue:** `votes.partyId` field for PARTY_LIST ballots doesn't link to candidates/districts
- **Why:** Party list voting is national, voters don't vote for a specific candidate
- **Solution:** Need to aggregate PARTY_LIST from vote batches (if available) OR note that party votes are national-only in results by province
- **Current Code Assumption:** We use CONSTITUENCY votes (which DO link to districts via candidates) to determine party votes by province

### 2. **Province naming: name vs. nameTh**
- `provinces.name` = English name (e.g., "Bangkok")
- `provinces.nameTh` = Thai name (e.g., "กรุงเทพมหานคร")
- **Frontend usage:** Always display `nameTh` for Thai users
- **Frontend code:** Shows "ผลการเลือกตั้ง 2569" (tha-TH locale formatting)

### 3. **Region definitions (5 fixed regions)**
```
{
  "id": "region-bangkok",
  "name": "Bangkok",
  "nameTh": "กรุงเทพมหานคร"
}
{
  "id": "region-central",
  "name": "Central",
  "nameTh": "ภาคกลาง"
}
{
  "id": "region-north",
  "name": "North",
  "nameTh": "ภาคเหนือ"
}
{
  "id": "region-northeast",
  "name": "Northeast",
  "nameTh": "ภาคอีสาน"
}
{
  "id": "region-south",
  "name": "South",
  "nameTh": "ภาคใต้"
}
```

### 4. **Province code (Thai administrative code)**
- `provinces.code` = Integer (e.g., 10 for Bangkok)
- Thai province codes: 10-96 (standard administrative numbering)
- Not used much in frontend, but valuable for data validation

### 5. **District zone numbers are per-province**
- District uniqueness: `UNIQUE(provinceId, zoneNumber)`
- `districts.zoneNumber` = 1, 2, 3... per province (NOT globally unique)
- Example: Bangkok has zones 1-50, Samut Prakan has zones 1-3
- **Frontend mapping:** Use full `districts.nameTh` (e.g., "กรุงเทพมหานคร เขต 1")

### 6. **Vote aggregation sources (multiple streams)**
- **Individual votes.* table** - Direct voter submissions (anonymous, no geo)
- **Vote batches** - Official district-level aggregates (has district context)
- **Issue:** Individual votes from `votes` table have no way to associate PARTY_LIST votes to provinces
- **Solution:** Use VoteBatch for aggregation when available, or note that PARTY_LIST is national-level

---

## 📱 FRONTEND INTEGRATION

### New Tab Structure (Proposed)

```typescript
interface ResultsPageTabs {
  'party': PartyListTab,        // National aggregate
  'constituency': DistrictTab,  // District breakdown (existing)
  'province': ProvinceTab,      // NEW - Province breakdown
  'region': RegionTab,          // Optional - Region aggregate
  'referendum': ReferendumTab,  // National aggregate
}
```

### Frontend API Call

```typescript
// In frontend/src/app/(public)/results/page.tsx

const [provinceResults, setProvinceResults] = useState<ProvinceResultData[] | null>(null);

useEffect(() => {
  apiRequest<{ success: boolean; data: ProvinceResultResponse }>(
    `/results/${electionId}/by-province`
  )
    .then((response) => {
      if (response.success && response.data) {
        setProvinceResults(response.data.provinces);
      }
    })
    .catch((err) => {
      console.error('Failed to fetch province results', err);
    });
}, [electionId]);
```

### Component Structure

```typescript
const ProvinceTab = ({ data }: { data: ProvinceResultData[] }) => {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(data[0]?.provinceId || '');
  const selectedProvince = data.find(p => p.provinceId === selectedProvinceId);

  return (
    <div className="space-y-6">
      {/* Province selector (or map) */}
      <select value={selectedProvinceId} onChange={(e) => setSelectedProvinceId(e.target.value)}>
        {data.map(p => (
          <option key={p.provinceId} value={p.provinceId}>
            {p.provinceNameTh} ({p.totalVotesCast.toLocaleString('th-TH')} votes)
          </option>
        ))}
      </select>

      {/* Selected province details */}
      {selectedProvince && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <KPICard label="จังหวัด" value={selectedProvince.provinceNameTh} />
            <KPICard label="ภาค" value={selectedProvince.regionNameTh} />
            <KPICard label="เขตเลือกตั้ง" value={selectedProvince.districtCount} />
            <KPICard label="ผู้มีสิทธิ์" value={selectedProvince.totalEligibleVoters} />
            <KPICard label="ผู้ออกเสียง" value={selectedProvince.totalVotesCast} />
            <KPICard label="ร้อยละการลงคะแนน" value={`${selectedProvince.turnoutPercentage.toFixed(1)}%`} />
          </div>

          {/* Party results for this province */}
          <PartyListTab data={selectedProvince.partyResults} />
        </div>
      )}

      {/* Or table view of all provinces */}
      <ProvinceComparisonTable data={data} />
    </div>
  );
};
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend
- [ ] Add `router.get('/:electionId/by-province')` to `backend/src/routes/results.ts`
- [ ] Implement province aggregation logic (Approach 4 above)
- [ ] Add error handling for missing election
- [ ] Test with mock data (4M+ votes)
- [ ] Performance test: query time < 1000ms for 77 provinces
- [ ] Add TypeScript types in `shared/src/types/vote.ts`

### Frontend
- [ ] Add "Province" tab to results page
- [ ] Create `ProvinceTab` component
- [ ] Add `useEffect` to call new endpoint
- [ ] Create province selector/table
- [ ] Format Thai numbers with `toLocaleString('th-TH')`
- [ ] Display region metadata
- [ ] Add province-level turnout visualization

### Testing
- [ ] Unit test: aggregation logic with mock data
- [ ] Integration test: results/:electionId vs results/:electionId/by-province totals match
- [ ] E2E test: frontend loads province tab, displays all provinces
- [ ] Performance: check query time under load

### Documentation
- [ ] Update API_ENDPOINTS_COMPLETE.md with new endpoint
- [ ] Document province-level vs district-level differences
- [ ] Add example curl/fetch requests
- [ ] Document PARTY_LIST national-only limitation

---

## 📚 REFERENCE DOCUMENTS

### Existing Analysis Docs in Repo
- `RESULTS_ARCHITECTURE_DIAGRAM.md` - Overall system architecture
- `THAI_DASHBOARD_ANALYSIS.md` - Frontend structure & components
- `API_ENDPOINTS_COMPLETE.md` - API documentation
- `ANALYSIS_SUMMARY.md` - General codebase analysis

### File Summary
```
KEY_FILES = {
  "Prisma Schema": "backend/prisma/schema.prisma",
  "Results Routes": "backend/src/routes/results.ts",
  "Geo Routes": "backend/src/routes/geo.ts",
  "SSE Routes": "backend/src/routes/stream.ts",
  "Vote Types": "shared/src/types/vote.ts",
  "Geo Types": "shared/src/types/geo.ts",
  "Results Page": "frontend/src/app/(public)/results/page.tsx",
  "SSE Hook": "frontend/src/hooks/useSSE.ts",
  "API Client": "frontend/src/lib/api.ts",
}
```

---

## 🚀 NEXT STEPS

1. **Implement Backend Endpoint** (2-3 hours)
   - Add route to results.ts
   - Test aggregation logic
   - Validate response format

2. **Update Shared Types** (30 min)
   - Add ProvinceResultResponse interface
   - Export from shared/src/types/vote.ts

3. **Build Frontend Component** (4-6 hours)
   - Create ProvinceTab component
   - Add province selector/table
   - Integrate SSE updates (optional)
   - Style with Tailwind

4. **Testing & Optimization** (2-3 hours)
   - Performance profile large datasets
   - Test with actual Prisma queries
   - Edge cases (zero votes, single province)

5. **Documentation** (1 hour)
   - Update API docs
   - Add frontend integration guide
   - Document limitations

**Estimated Total:** 10-15 hours (backend 2-3h, frontend 4-6h, testing 2-3h, docs 1h)

