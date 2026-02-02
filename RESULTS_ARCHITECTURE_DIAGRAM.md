# Thai Election System - Results Architecture Diagram

## Current System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (results/page.tsx)                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────┬──────────────────┬──────────────────────────────┐   │
│  │  Party List Tab  │ Referendum Tab   │  Constituency Tab (District) │   │
│  │  (NATIONAL)      │  (NATIONAL)      │  (DISTRICT-LEVEL)           │   │
│  └──────────────────┴──────────────────┴──────────────────────────────┘   │
│                                                                            │
│                    ❌ NO PROVINCE TAB (MISSING!)                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
         │                                       │
         │ HTTP GET /results/:electionId        │ HTTP GET /results/:electionId/by-district
         │ SSE /stream/elections/.../results    │ SSE /stream/elections/.../results
         │                                       │
         ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API LAYER                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ✅ GET /results/:electionId                                             │
│     └─ Returns: {partyListResults[], referendumResults[]}                │
│     └─ Aggregation: SUM votes by partyId (ALL districts)                │
│     └─ Geography: NONE (pure national)                                   │
│                                                                            │
│  ✅ GET /results/:electionId/by-district?provinceId=X                   │
│     └─ Returns: {districtId, districtName, provinceName, candidates[]}  │
│     └─ Aggregation: GROUP BY districtId                                 │
│     └─ Geography: YES (includes provinceName, can filter)               │
│                                                                            │
│  ❌ GET /results/:electionId/by-province (MISSING!)                      │
│     └─ Would return: province[], with partyResults per province          │
│     └─ Aggregation: GROUP BY provinceId                                  │
│     └─ Geography: YES (province-level)                                   │
│                                                                            │
│  ❌ GET /results/:electionId/by-region (MISSING!)                        │
│     └─ Would return: region[], with partyResults per region              │
│     └─ Aggregation: GROUP BY regionId                                    │
│     └─ Geography: YES (region-level)                                     │
│                                                                            │
│  ✅ GET /stream/elections/:electionId/results (SSE)                      │
│     └─ Streams: {timestamp, totalVotes, partyResults[]}                 │
│     └─ Updates every vote cast (real-time)                              │
│     └─ Geography: NONE (pure national snapshots)                         │
│                                                                            │
│  ✅ GET /geo/provinces (?regionId=X)                                     │
│  ✅ GET /geo/districts (?provinceId=X, ?regionId=X)                      │
│  ✅ GET /geo/stats                                                        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
         │
         │ Prisma Queries (ORM)
         │
         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER (SQLite)                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Core Tables:                                                            │
│  ─────────────                                                           │
│                                                                            │
│  votes (4M+ rows with seed data)                                         │
│    ├─ electionId (FK → elections)                                        │
│    ├─ ballotType (PARTY_LIST | CONSTITUENCY | REFERENDUM)              │
│    ├─ partyId (FK → parties) [nullable]                                 │
│    ├─ candidateId (FK → candidates) [nullable]                          │
│    ├─ referendumQuestionId (FK → referendum_questions) [nullable]       │
│    ├─ referendumAnswer (APPROVE | DISAPPROVE | ABSTAIN) [nullable]     │
│    └─ voterHash (for uniqueness check)                                  │
│    Indexes: (electionId, ballotType), (partyId), (candidateId), etc.   │
│                                                                            │
│  candidates (2000 rows)                                                  │
│    ├─ electionId (FK)                                                    │
│    ├─ districtId (FK) ◄── KEY: links to geography!                      │
│    ├─ partyId (FK)                                                       │
│    └─ details (name, title, photo, etc.)                                │
│                                                                            │
│  districts (400 rows)                                                    │
│    ├─ provinceId (FK) ◄── PATH TO PROVINCE DATA                         │
│    ├─ zoneNumber, name, voterCount                                       │
│    └─ amphoeList (sub-district mapping)                                 │
│                                                                            │
│  provinces (77 rows)                                                     │
│    ├─ regionId (FK) ◄── PATH TO REGION DATA                             │
│    ├─ code, name, nameTh                                                │
│    └─ officials (RBAC)                                                   │
│                                                                            │
│  regions (5 rows)                                                        │
│    ├─ name, nameTh                                                       │
│    └─ provinces (1:N)                                                    │
│                                                                            │
│  parties (8 rows per election)                                           │
│    ├─ electionId, partyNumber                                            │
│    └─ details (name, color, logo)                                       │
│                                                                            │
│  referendum_questions (1-3 rows per election)                            │
│    └─ questionNumber, questionTh, questionEn                             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Path: Vote to Province

```
VOTE RECORD (in votes table)
    │
    ├─ ballotType = "PARTY_LIST"
    │   └─ partyId → parties.id
    │       └─ parties.nameTh → Display "เพื่อไทย"
    │
    └─ ballotType = "CONSTITUENCY"
        └─ candidateId → candidates.id
            ├─ candidates.districtId → districts.id
            │   ├─ districts.nameTh → Display district name
            │   ├─ districts.provinceId → provinces.id  ◄── KEY
            │   │   ├─ provinces.nameTh → Display "กรุงเทพมหานคร"
            │   │   └─ provinces.regionId → regions.id
            │   │       └─ regions.nameTh → Display "ภาคกลาง"
            │   └─ districts.voterCount → Calculate turnout
            │
            └─ candidates.partyId → parties.id
                └─ parties.nameTh → Display "เพื่อไทย"

VOTE AGGREGATION SCENARIOS:

1️⃣  CURRENT: National Aggregation
    ────────────────────────────────
    SELECT 
        p.id, p.nameTh, p.color,
        COUNT(*) as voteCount
    FROM votes v
    JOIN parties p ON v.partyId = p.id
    WHERE v.electionId = ? AND v.ballotType = 'PARTY_LIST'
    GROUP BY p.id

    Result: 
    ┌─────────────────────────────────┐
    │ PartyId │ PartyName  │ Votes    │
    ├─────────┼────────────┼──────────┤
    │ p1      │ เพื่อไทย   │ 500,000  │
    │ p2      │ ก้าวไกล    │ 450,000  │
    │ ...     │ ...        │ ...      │
    └─────────────────────────────────┘
    (ALL 400 DISTRICTS COMBINED)

2️⃣  MISSING: Province Aggregation
    ──────────────────────────────
    SELECT 
        pr.id, pr.nameTh,
        p.id, p.nameTh, p.color,
        COUNT(*) as voteCount
    FROM votes v
    JOIN candidates c ON v.candidateId = c.id
    JOIN districts d ON c.districtId = d.id
    JOIN provinces pr ON d.provinceId = pr.id
    JOIN parties p ON v.partyId = p.id
    WHERE v.electionId = ? AND v.ballotType = 'PARTY_LIST'
    GROUP BY pr.id, p.id

    Result:
    ┌─────────────────────────────────────────────────────┐
    │ Province    │ PartyName  │ Votes │ Turnout │ Region  │
    ├─────────────┼────────────┼───────┼─────────┼─────────┤
    │ กรุงเทพ      │ เพื่อไทย   │ 15k   │ 42.3%   │ ภาคกลาง │
    │ กรุงเทพ      │ ก้าวไกล    │ 12k   │ 42.3%   │ ภาคกลาง │
    │ ปทุมธานี      │ เพื่อไทย   │ 8k    │ 38.1%   │ ภาคกลาง │
    │ ...         │ ...        │ ...   │ ...     │ ...     │
    └─────────────────────────────────────────────────────┘
    (77 PROVINCES × 8 PARTIES = 616 ROWS)

3️⃣  ALSO MISSING: Region Aggregation
    ───────────────────────────────
    SELECT 
        r.id, r.nameTh,
        p.id, p.nameTh, p.color,
        COUNT(*) as voteCount
    FROM votes v
    JOIN candidates c ON v.candidateId = c.id
    JOIN districts d ON c.districtId = d.id
    JOIN provinces pr ON d.provinceId = pr.id
    JOIN regions r ON pr.regionId = r.id
    JOIN parties p ON v.partyId = p.id
    WHERE v.electionId = ? AND v.ballotType = 'PARTY_LIST'
    GROUP BY r.id, p.id

    Result:
    ┌──────────────────────────────┐
    │ Region   │ PartyName  │ Votes │
    ├──────────┼────────────┼───────┤
    │ ภาคเหนือ  │ เพื่อไทย   │ 120k  │
    │ ภาคเหนือ  │ ก้าวไกล    │ 95k   │
    │ ภาคกลาง   │ เพื่อไทย   │ 110k  │
    │ ...      │ ...        │ ...   │
    └──────────────────────────────┘
    (5 REGIONS × 8 PARTIES = 40 ROWS)
```

---

## Frontend Component Hierarchy (Current vs. Proposed)

```
CURRENT:
────────

ResultsPage
  ├─ HeaderBar (sticky)
  │  ├─ Title "ผลการเลือกตั้ง 2569"
  │  └─ StatusIndicator (online/offline)
  │
  ├─ TabBar (sticky)
  │  ├─ TabButton "บัญชีรายชื่อ" (active)
  │  └─ TabButton "ประชามติ"
  │
  ├─ MainContent
  │  ├─ PartyListTab
  │  │  └─ PartyCard[] (8-10 cards, sorted by votes)
  │  │
  │  └─ ReferendumTab
  │     ├─ QuestionCard (question 1)
  │     └─ QuestionCard (question 2)
  │
  └─ FooterBar (sticky, bottom)
     ├─ Total Votes: 3.5M
     └─ Voter Turnout: 45.2%


PROPOSED WITH PROVINCE LEVEL:
──────────────────────────────

ResultsPage
  ├─ HeaderBar (sticky)
  │  ├─ Title "ผลการเลือกตั้ง 2569"
  │  └─ StatusIndicator (online/offline)
  │
  ├─ TabBar (sticky)
  │  ├─ TabButton "บัญชีรายชื่อ" (national)
  │  ├─ TabButton "จังหวัด" ◄── NEW!
  │  ├─ TabButton "ภาค" ◄── NEW!
  │  ├─ TabButton "เขตเลือกตั้ง" (constituencies)
  │  └─ TabButton "ประชามติ" (referendums)
  │
  ├─ MainContent
  │  ├─ PartyListTab (unchanged)
  │  │  └─ PartyCard[]
  │  │
  │  ├─ ProvinceTab ◄── NEW!
  │  │  ├─ ProvinceControls
  │  │  │  ├─ SortDropdown (votes, turnout, name)
  │  │  │  ├─ FilterDropdown (all regions, or by region)
  │  │  │  └─ ViewToggle (list, table, map)
  │  │  │
  │  │  └─ ProvinceResultsList
  │  │     ├─ ProvinceCard
  │  │     │  ├─ Province name + region
  │  │     │  ├─ Top party (with color)
  │  │     │  ├─ Vote count
  │  │     │  ├─ Turnout %
  │  │     │  └─ [Click] → ProvinceDetail
  │  │     │
  │  │     ├─ ProvinceCard
  │  │     │  └─ ...
  │  │     │
  │  │     └─ ProvinceCard (77 total)
  │  │
  │  ├─ RegionTab ◄── NEW!
  │  │  └─ RegionCard[]
  │  │     └─ Party breakdown per region
  │  │
  │  ├─ ConstituencyTab (unchanged)
  │  │  └─ DistrictSelector + Candidates
  │  │
  │  └─ ReferendumTab (unchanged)
  │     └─ QuestionCard[]
  │
  └─ FooterBar (sticky, bottom)
     └─ Dynamic stats based on tab


ProvinceDetail PAGE (DRILL-DOWN):
─────────────────────────────────

ProvinceDetailPage (/results?electionId=X&provinceId=Y)
  ├─ HeaderBar
  │  ├─ Province name + region
  │  └─ [Back] button
  │
  ├─ SummaryStats
  │  ├─ Eligible voters: 1.2M
  │  ├─ Votes cast: 520k
  │  ├─ Turnout: 42.3%
  │  └─ Leading party + votes
  │
  ├─ PartyResultsChart
  │  ├─ Bar chart (horizontal)
  │  │  └─ Party1: 150k (28.8%)
  │  │  └─ Party2: 120k (23.1%)
  │  │  └─ ...
  │
  ├─ DistrictBreakdown
  │  ├─ Table of districts in province
  │  │  └─ District name, votes, turnout, winner
  │  │  └─ Click district → drills to candidate results
  │  │
  │  └─ Districts: 8 total
  │
  └─ ComparisonSection (Optional)
     ├─ Compare to region average
     ├─ Compare to national average
     └─ Compare to neighboring provinces
```

---

## Data Flow Diagram (Enhanced with Province-Level)

```
VOTING → AGGREGATION → DISPLAY

1. USER CASTS VOTE
   ─────────────────
   Voter selects party/candidate
        ↓
   Vote record created with:
   - candidateId (has districtId nested)
   - partyId
   - electionId
   - ballotType
        ↓
   SSE notifyVoteUpdate() called
   (currently only for national)


2. AGGREGATION LAYER (Backend)
   ──────────────────────────
   
   Current: National only
   ────────────────────
   GET /results/:electionId
        ↓
   Query: SELECT partyId, COUNT(*) FROM votes GROUP BY partyId
        ↓
   Result: 8 rows (1 per party)
        ↓
   Response: {partyListResults: [...]}
   
   
   Proposed: Add Province-Level
   ──────────────────────────
   GET /results/:electionId/by-province
        ↓
   Query: 
     SELECT 
       provinceId, partyId, COUNT(*) votes
     FROM votes v
     JOIN candidates c ON c.id = v.candidateId
     JOIN districts d ON d.id = c.districtId
     JOIN provinces p ON p.id = d.provinceId
     GROUP BY p.id, v.partyId
        ↓
   Result: 616 rows (77 provinces × 8 parties)
        ↓
   Response: 
   {
     provinces: [
       {
         provinceId: "...",
         provinceName: "กรุงเทพ",
         regionName: "ภาคกลาง",
         totalVotes: 150000,
         turnoutPercentage: 42.3,
         partyResults: [
           { partyId, partyName, voteCount, percentage, rank }
         ]
       },
       ... (77 provinces)
     ]
   }
        ↓
   Enhanced SSE: /stream/elections/:electionId/results
   (includes provincial snapshots in addition to national)


3. FRONTEND DISPLAY
   ────────────────
   
   Tab: "บัญชีรายชื่อ" (National) - EXISTING
   ─────────────────────────────────────
   Result: PartyListTab
   Data source: GET /results/:electionId
   Display: 8 party cards sorted by national votes
   
   
   Tab: "จังหวัด" (Provinces) - NEW
   ──────────────────────────────
   Result: ProvinceResultsTab
   Data source: GET /results/:electionId/by-province
   Display: 77 province cards sorted by votes/turnout/name
   
   Clicking province:
        ↓
   Navigate to /results?electionId=X&provinceId=Y
        ↓
   ProvinceDetailPage loads
   Data source: /results/:electionId/by-district?provinceId=Y
        ↓
   Display: 
   - Province summary stats
   - Party results in that province
   - Districts within province
   - Candidate results per district


4. REAL-TIME UPDATES
   ─────────────────
   
   Current: National only
   ──────────────────
   Vote cast → notifyVoteUpdate() → SSE sends national snapshot
        ↓
   Frontend updates PartyListTab with new counts
   
   
   Proposed: Include Province-Level
   ────────────────────────────────
   Vote cast → notifyVoteUpdate() → Enhanced SSE snapshot
        ├─ National aggregates (as before)
        └─ All 77 province aggregates (NEW)
        ↓
   Frontend updates:
   - PartyListTab with national updates
   - ProvinceTab with province-specific updates (only affected provinces)
   - ProvinceDetailPage if user viewing that province
```

---

## Implementation Checklist

```
PHASE 1: BACKEND - PROVINCE AGGREGATION
────────────────────────────────────────

[ ] Add GET /results/:electionId/by-province endpoint
    ├─ [ ] Query provinces with vote counts
    ├─ [ ] Calculate turnout per province
    ├─ [ ] Sort parties within each province
    ├─ [ ] Return response object
    └─ [ ] Test with postman/curl

[ ] Add GET /results/:electionId/by-region endpoint
    ├─ [ ] Query regions with vote counts
    ├─ [ ] Calculate turnout per region
    ├─ [ ] Sort parties within each region
    └─ [ ] Test with postman/curl

[ ] Enhanced SSE stream (optional for MVP)
    ├─ [ ] Include provincial aggregates in snapshot
    ├─ [ ] Keep national aggregates (backward compatible)
    └─ [ ] Test real-time updates


PHASE 2: FRONTEND - PROVINCE UI
───────────────────────────────

[ ] Create ProvinceResultsList component
    ├─ [ ] Display all 77 provinces
    ├─ [ ] Show party vote breakdown per province
    ├─ [ ] Include turnout percentage
    ├─ [ ] Add sorting/filtering controls
    └─ [ ] Add click handler for drill-down

[ ] Add "จังหวัด" tab to results page
    ├─ [ ] Add tab button to TabBar
    ├─ [ ] Add ProvinceResultsList component
    ├─ [ ] Wire up data fetching
    ├─ [ ] Handle loading/error states
    └─ [ ] Style to match existing tabs

[ ] Create ProvinceDetail component (optional for MVP)
    ├─ [ ] Show province summary stats
    ├─ [ ] Show party results in that province
    ├─ [ ] Show districts in that province
    ├─ [ ] Link to candidate results
    └─ [ ] Style province-level detail page

[ ] Add RegionTab (optional for MVP)
    ├─ [ ] Similar structure to ProvinceTab
    ├─ [ ] Show 5 regions instead of 77 provinces
    └─ [ ] Show party breakdown per region


PHASE 3: OPTIMIZATION
──────────────────────

[ ] Database optimization
    ├─ [ ] Add index on (electionId, ballotType, candidateId)
    ├─ [ ] Test query performance before/after
    └─ [ ] Consider materialized view if needed

[ ] Frontend performance
    ├─ [ ] Lazy load province list (virtualization)
    ├─ [ ] Memoize expensive components
    ├─ [ ] Test with 77 provinces
    └─ [ ] Check memory usage

[ ] Testing
    ├─ [ ] Unit tests for aggregation queries
    ├─ [ ] Integration tests for endpoints
    ├─ [ ] E2E tests for province drill-down
    └─ [ ] Performance testing (load test)
```

---

## Summary Table

```
┌─────────────────────────┬──────────────┬──────────────┬────────────────┐
│ Feature                 │ Current      │ Proposed     │ Impact         │
├─────────────────────────┼──────────────┼──────────────┼────────────────┤
│ National Results        │ ✅ Complete  │ ✅ Keep      │ None           │
│ Party Vote Counts       │ ✅ Yes       │ ✅ Yes       │ None           │
│ Party Percentages       │ ✅ Yes       │ ✅ Yes       │ None           │
│ Referendum Results      │ ✅ Yes       │ ✅ Yes       │ None           │
│ Voter Turnout           │ ✅ Yes       │ ✅ Enhanced  │ Calc per geog. │
│                         │              │              │                │
│ District Results        │ ✅ Complete  │ ✅ Keep      │ None           │
│ Candidate Ranking       │ ✅ Yes       │ ✅ Yes       │ None           │
│ District Turnout        │ ✅ Yes       │ ✅ Yes       │ None           │
│                         │              │              │                │
│ Province Results        │ ❌ NO        │ ✅ YES       │ NEW            │
│ Province Vote Counts    │ ❌ NO        │ ✅ YES       │ NEW            │
│ Province Turnout        │ ❌ NO        │ ✅ YES       │ NEW            │
│ Province Ranking        │ ❌ NO        │ ✅ YES       │ NEW            │
│                         │              │              │                │
│ Region Results          │ ❌ NO        │ ✅ YES       │ NEW (optional) │
│ Region Vote Counts      │ ❌ NO        │ ✅ YES       │ NEW (optional) │
│ Region Turnout          │ ❌ NO        │ ✅ YES       │ NEW (optional) │
│                         │              │              │                │
│ Geographic Filters      │ ⚠️ Partial   │ ✅ Complete  │ Enhanced       │
│ Real-time Updates       │ ✅ National  │ ✅ Provincial│ Enhanced       │
│ Map Visualization       │ ❌ NO        │ ✅ Planned   │ NEW (optional) │
│                         │              │              │                │
│ API Endpoints           │ 3            │ 5+           │ +2 core        │
│ Frontend Components     │ 3            │ 6+           │ +3 new         │
│ Database Queries        │ 2 main       │ 4 main       │ +2 new         │
│                         │              │              │                │
│ Lines of Code (Backend) │ ~150         │ ~350         │ +200           │
│ Lines of Code (Frontend)│ ~450         │ ~900         │ +450           │
│                         │              │              │                │
│ Estimated Dev Time      │ -            │ 14-22 hours  │ 2-3 dev weeks  │
│                         │              │              │                │
└─────────────────────────┴──────────────┴──────────────┴────────────────┘
```

---

## Quick Reference: Which Queries to Write

```
BACKEND (Express/Prisma):
─────────────────────────

1. National Party Results (EXISTING - keep as is)
   Location: /results/:electionId
   Query: SELECT partyId, COUNT(*) FROM votes WHERE ballotType='PARTY_LIST'
   Response: partyId, partyName, voteCount, percentage

2. By-District Results (EXISTING - minor enhancement)
   Location: /results/:electionId/by-district
   Query: SELECT districtId, candidateId, COUNT(*) FROM votes WHERE ballotType='CONSTITUENCY'
   Response: districtId, candidates[], winner

3. BY-PROVINCE Results (NEW - HIGH PRIORITY)
   Location: /results/:electionId/by-province
   Query: 
     SELECT 
       provinces.id, provinces.nameTh,
       regions.nameTh,
       districts.voterCount,
       parties.id, parties.nameTh, parties.color,
       COUNT(votes.id) as voteCount
     FROM votes
     JOIN candidates ON votes.candidateId = candidates.id
     JOIN districts ON candidates.districtId = districts.id
     JOIN provinces ON districts.provinceId = provinces.id
     JOIN regions ON provinces.regionId = regions.id
     JOIN parties ON votes.partyId = parties.id
     WHERE votes.electionId = ? AND votes.ballotType = 'PARTY_LIST'
     GROUP BY provinces.id, parties.id
   Response: provinces[{provinceId, provinceName, regionName, partyResults[]}]

4. BY-REGION Results (NEW - MEDIUM PRIORITY)
   Location: /results/:electionId/by-region
   Query: Similar to by-province but GROUP BY regions.id
   Response: regions[{regionId, regionName, partyResults[]}]

5. Enhanced SSE Stream (ENHANCEMENT - MEDIUM PRIORITY)
   Location: /stream/elections/:electionId/results
   Current: {timestamp, totalVotes, partyResults[]}
   Enhanced: {timestamp, totalVotes, partyResults[], provinces[]}
   Note: May want to paginate provinces to avoid huge payloads

FRONTEND (React/Next.js):
────────────────────────

1. ProvinceResultsList Component (NEW - HIGH PRIORITY)
   └─ Maps over 77 provinces
   └─ Shows party vote breakdown
   └─ Sortable/filterable
   └─ Click → detail view

2. ProvinceDetail Component (NEW - MEDIUM PRIORITY)
   └─ Shows single province stats
   └─ Shows all districts in province
   └─ Link to candidate results

3. RegionTab Component (NEW - LOW PRIORITY)
   └─ Similar to province but for 5 regions

4. Update results/page.tsx
   └─ Add province tab button
   └─ Wire up province data fetching
   └─ Handle loading/error states
```

