# Shared Package - Quick Reference Guide

## What Is It?
A **type-first contract library** (528 lines) that defines the API boundaries, data structures, and RBAC model for the Thai election system. 99% compile-time types, 1% runtime (2 RBAC helper functions).

## Quick Stats
| Metric | Value |
|--------|-------|
| Total Exports | 48 |
| Total Lines | 528 |
| Modules | 6 |
| Runtime Code | ~50 lines (rbac.ts) |
| External Dependencies | 0 (zero-dep) |
| Consumers | Backend (4 files) + Frontend (2 files) |

## File Structure
```
shared/src/
├── index.ts              ← Barrel file (re-exports all)
└── types/
    ├── index.ts          ← Base types: ApiResponse, TimestampFields
    ├── auth.ts           ← Auth contracts (6 exports)
    ├── election.ts       ← Election domain (11 exports)
    ├── geo.ts            ← Geography hierarchy (5 exports)
    ├── vote.ts           ← Vote recording & results (17 exports)
    └── rbac.ts           ← Authorization model + 2 functions (6 types + 2 fn)
```

## Export Inventory by Domain

### 1. RBAC & Authorization (6 exports + 2 functions)
```typescript
// Types
type UserRole = 'super_admin' | 'regional_admin' | 'province_admin' | 
                'district_official' | 'voter';
interface OfficialScope { regionId?: string; provinceId?: string; districtId?: string; }
type Permission = 22 granular permissions (election:*, party:*, vote:*, user:*)

// Runtime
const ROLE_PERMISSIONS: Record<UserRole, Permission[]>  // mapping
function hasPermission(role, permission): boolean       // check permission
function canAccessDistrict(...): boolean                // scope-aware check
```

**Used By:** Backend RBAC middleware, Frontend (in context for display)

---

### 2. Authentication & Identity (6 exports)
```typescript
interface AuthUser {
  id: string;
  email?: string;
  citizenId?: string;
  name: string;
  role: UserRole;
  scope?: OfficialScope;
  eligibleDistrictId?: string;
}

interface JWTPayload {
  sub: string;          // user id
  role: UserRole;
  scope?: OfficialScope;
  iat: number;
  exp: number;
}

interface ThaiDVerifyResponse {
  citizenId: string;
  titleTh: string;
  firstNameTh: string;
  lastNameTh: string;
  birthDate: string;
  gender: 'M' | 'F';
  address: {...};
  eligibleDistrictId: string;
  eligibleProvince: string;
}

// Request/Response contracts
interface VoterLoginRequest { citizenId: string; }
interface OfficialLoginRequest { email: string; password: string; }
interface LoginResponse { user: AuthUser; token: string; }
```

**Used By:** Backend auth middleware, Frontend auth context

---

### 3. Election Management (11 exports)
```typescript
// Status enums
type ElectionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
type BallotType = 'PARTY_LIST' | 'CONSTITUENCY' | 'REFERENDUM';

// Core entities
interface Election {
  id: string;
  name: string;
  nameTh: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: ElectionStatus;
  ballotTypes: BallotType[];
  hasPartyList: boolean;
  hasConstituency: boolean;
  hasReferendum: boolean;
}

interface Party {
  id: string;
  electionId: string;
  name: string;
  nameTh: string;
  abbreviation: string;
  color: string;
  partyNumber: number;
  logoUrl?: string;
}

interface Candidate {
  id: string;
  electionId: string;
  districtId: string;
  partyId?: string;
  candidateNumber: number;
  titleTh: string;
  firstNameTh: string;
  lastNameTh: string;
  titleEn?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  photoUrl?: string;
}

interface ReferendumQuestion {
  id: string;
  electionId: string;
  questionNumber: number;
  questionTh: string;
  questionEn?: string;
}

// Request contracts
interface CreateElectionRequest { ... }
interface UpdateElectionRequest { status?: ElectionStatus; }
interface CreatePartyRequest { ... }
interface CreateCandidateRequest { ... }
interface CreateReferendumRequest { ... }
```

**Used By:** Backend election APIs, Frontend admin forms

---

### 4. Geography (5 exports - Read-Only)
```typescript
type RegionName = 'Bangkok' | 'Central' | 'North' | 'Northeast' | 'South';

interface Region {
  id: string;
  name: RegionName;
  nameTh: string;
  provinceCount: number;
  districtCount: number;
}

interface Province {
  id: string;
  code: number;
  name: string;
  nameTh: string;
  regionId: string;
  region?: Region;
}

interface District {
  id: string;
  provinceId: string;
  province?: Province;
  zoneNumber: number;
  name: string;
  nameTh: string;
  amphoeList: string[];
  voterCount: number;
}

interface GeoStats {
  totalProvinces: number;
  totalDistricts: number;
  totalVoters: number;
  byRegion: {...}[];
}
```

**Used By:** Backend geo APIs, Frontend district/province selectors

---

### 5. Vote Recording & Results (17 exports)
```typescript
// Anonymous vote storage (privacy-first)
interface Vote {
  id: string;
  electionId: string;
  ballotType: BallotType;
  voterHash: string;              // SHA256(citizenId + electionSalt), NOT plain ID
  partyId?: string;               // For PARTY_LIST
  candidateId?: string;           // For CONSTITUENCY
  referendumQuestionId?: string;  // For REFERENDUM
  referendumAnswer?: 'APPROVE' | 'DISAPPROVE' | 'ABSTAIN';
}

// Voter submission contract
interface CastBallotRequest {
  electionId: string;
  partyVote?: { partyId: string; };
  constituencyVote?: { candidateId: string; };
  referendumVotes?: { questionId: string; answer: string; }[];
}

// Voter confirmation
interface VoteReceipt {
  ballotId: string;
  electionId: string;
  ballotType: BallotType;
  timestamp: Date;
  confirmationCode: string;
}

// Official batch upload workflow
type BatchStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface VoteBatch {
  id: string;
  electionId: string;
  districtId: string;
  submittedById: string;
  approvedById?: string;
  status: BatchStatus;
  partyVotes: BatchPartyVote[];
  constituencyVotes: BatchConstituencyVote[];
  referendumVotes: BatchReferendumVote[];
  totalVotes: number;
  notes?: string;
  rejectionReason?: string;
}

// Results aggregation
interface PartyResult {
  partyId: string;
  partyName: string;
  voteCount: number;
  percentage: number;
}

interface CandidateResult {
  candidateId: string;
  candidateName: string;
  partyName?: string;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

interface DistrictResult {
  districtId: string;
  districtName: string;
  totalVotes: number;
  candidates: CandidateResult[];
  winner?: CandidateResult;
}

interface ReferendumResult {
  questionId: string;
  approveCount: number;
  disapproveCount: number;
  abstainCount: number;
  result: 'APPROVED' | 'DISAPPROVED' | 'TIE';
}

interface ElectionResults {
  electionId: string;
  electionName: string;
  status: string;
  totalVotesCast: number;
  turnoutPercentage: number;
  partyListResults: PartyResult[];
  constituencyResults: DistrictResult[];
  referendumResults: ReferendumResult[];
  byRegion: {...}[];
  byProvince: {...}[];
}
```

**Used By:** Frontend vote submission & results display, Backend vote APIs

---

### 6. Base Types (3 exports)
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TimestampFields {
  createdAt: Date;
  updatedAt: Date;
}
```

**Used By:** All domain types (inherited)

---

## How It's Consumed

### Backend (`@election/backend`)
```typescript
// Path alias import
import { AuthUser, JWTPayload } from '@election/shared';
import { hasPermission, canAccessDistrict } from '@election/shared';
import type { CastBallotRequest } from '@election/shared';

// Used in:
// - middleware/auth.ts: JWT verification
// - middleware/rbac.ts: Permission checks
// - routes/auth.ts: Auth endpoints
// - services/thaidMock.ts: Identity verification mock
```

### Frontend (`frontend`)
```typescript
// Relative path imports (NOT using npm package)
import { AuthUser, CastBallotRequest } from '../../../shared/src/types/vote';

// Used in:
// - lib/auth-context.tsx: Auth state management
// - app/(public)/vote/page.tsx: Vote submission form
```

---

## Key Features

### 1. Privacy-First Vote Recording
- **Never stores citizen ID** - Uses voterHash (SHA256 of ID + salt)
- **Anonymous voting** - Votes cannot be traced to individual voters
- **Deduplication** - Prevents double-voting via voterHash

### 2. Hierarchical RBAC
```
super_admin (full access)
  ↓
regional_admin (region-scoped)
  ↓
province_admin (province-scoped)
  ↓
district_official (district-scoped)
  ↓
voter (vote-only)
```

### 3. Multi-Ballot Support
Voter can simultaneously vote in:
- **Party List** (PARTY_LIST) - Select one party
- **Constituency** (CONSTITUENCY) - Select one candidate for their district
- **Referendum** (REFERENDUM) - Answer multiple yes/no questions

### 4. Request/Entity Separation
```
CreateElectionRequest (input) → Election (storage/response)
CreatePartyRequest → Party
CreateCandidateRequest → Candidate
CastBallotRequest (input) → Vote (anonymous storage)
```

---

## Build & Distribution

### Commands
```bash
npm run build:shared      # Compile to dist/
npm run typecheck:shared  # Type-check only
npm run lint:shared       # ESLint
```

### Output
- **Format:** ES Modules (ESM)
- **With:** TypeScript declarations (.d.ts) + source maps
- **Location:** `./dist/`

### Package Exports
```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./types": { "types": "./dist/types/index.d.ts" }
  }
}
```

---

## Dependencies
- **Runtime:** None (zero-dep) ✓
- **Dev:** TypeScript, ESLint, @types/node

---

## Summary
A **lean, type-first contract library** that serves as the single source of truth for the election system. Enables type-safe, privacy-conscious vote processing with strict RBAC enforcement across backend and frontend.

**Core Promise:** If it compiles with shared types, the data contract is valid.
