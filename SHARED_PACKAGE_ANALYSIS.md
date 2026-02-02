# Shared Package Analysis Report
## Thai Election System - Shared Types & Contracts

---

## 1. PACKAGE PURPOSE & OVERVIEW

The `@election/shared` package is a **TypeScript-only type and contract library** that serves as the central point of truth for:
- **Data contracts** between frontend and backend
- **RBAC (Role-Based Access Control) definitions** and helper functions
- **Type safety** across the entire monorepo

**Key Characteristics:**
- ✅ Types-only + minimal runtime (RBAC helpers)
- ✅ Zero external dependencies (pure TypeScript)
- ✅ Mono-workspace dependency shared by both `@election/backend` and `frontend`
- ✅ Compiled to ES modules with TypeScript source maps

---

## 2. EXPORTS STRUCTURE

### 2.1 Barrel File: `src/index.ts`
**Purpose:** Central re-export hub that aggregates all type modules

```typescript
// Re-exports all types from domain modules
export * from './types/index.js';      // Common/base types
export * from './types/auth.js';       // Auth contracts
export * from './types/election.js';   // Election domain
export * from './types/geo.js';        // Geography domain
export * from './types/vote.js';       // Vote domain
export * from './types/rbac.js';       // RBAC + helpers
```

### 2.2 Module-Level Exports

#### `types/index.ts` (Common/Base Types - 21 lines)
**Exports (3):**
- `ApiResponse<T>` - Generic API response wrapper
- `PaginatedResponse<T>` - API response with pagination metadata
- `TimestampFields` - Base interface for created/updated timestamps

**Usage:** Foundation for all response types

---

#### `types/auth.ts` (Authentication - 62 lines)
**Exports (6 types/interfaces):**
1. `ThaiDVerifyResponse` - Identity verification response from ThaiD mock
   - Contains: citizen ID, Thai/English names, birth date, address, eligible district
   - **Runtime usage:** Backend service mock (in `services/thaidMock.ts`)

2. `AuthUser` - Current authenticated user (polymorphic for voter/official)
   - Fields: id, email, citizenId, name, role, scope, eligibleDistrictId
   - **Consumer:** Backend auth middleware & frontend auth context

3. `JWTPayload` - JWT token claims
   - Fields: sub (user id), role, scope, iat, exp
   - **Runtime usage:** Backend JWT verification in auth middleware

4. `VoterLoginRequest` - Voter login input
   - Only field: citizenId (13 digits)

5. `OfficialLoginRequest` - Official login input
   - Fields: email, password

6. `LoginResponse` - Login success response
   - Contains: AuthUser + JWT token

**Consumers:**
- Backend: `src/middleware/auth.ts`, `src/routes/auth.ts`, `src/services/thaidMock.ts`
- Frontend: `src/lib/auth-context.tsx`

---

#### `types/election.ts` (Election Domain - 112 lines)
**Exports (11 types/interfaces):**

**Core Entities:**
1. `ElectionStatus` - enum-like union: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED'
2. `BallotType` - enum-like union: 'PARTY_LIST' | 'CONSTITUENCY' | 'REFERENDUM'

3. `Election` - Main election aggregate
   - Fields: id, name, nameTh, description, startDate, endDate, status, ballotTypes
   - Flags: hasPartyList, hasConstituency, hasReferendum

4. `CreateElectionRequest` - Election creation payload

5. `UpdateElectionRequest` - Election update payload (partial + status override)

**Political Entities:**
6. `Party` - Political party for party-list voting
   - Fields: id, electionId, name, nameTh, abbreviation, color, logoUrl, partyNumber
   - Example: "พรรคเพื่อไทย" (PTP) - Red

7. `CreatePartyRequest` - Party creation payload

8. `Candidate` - Constituency candidate
   - Fields: id, electionId, districtId, partyId, candidateNumber, names (Thai+English), photoUrl
   - Optional party relationship

9. `CreateCandidateRequest` - Candidate creation payload

**Referendum:**
10. `ReferendumQuestion` - Yes/No question
    - Fields: id, electionId, questionNumber, questionTh, questionEn, descriptions

11. `CreateReferendumRequest` - Referendum question payload

**Key Pattern:** Request vs Entity separation (CQRS-like)

---

#### `types/geo.ts` (Geography - 49 lines)
**Exports (5 types/interfaces):**
1. `RegionName` - Union: 'Bangkok' | 'Central' | 'North' | 'Northeast' | 'South'

2. `Region` - ภาค (region)
   - Fields: id, name, nameTh, provinceCount, districtCount

3. `Province` - จังหวัด (province)
   - Fields: id, code, name, nameTh, regionId, districtCount
   - Relations: region (optional)

4. `District` - เขตเลือกตั้ง (constituency/electoral district)
   - Fields: id, provinceId, zoneNumber, name, nameTh, zoneDescription, amphoeList, voterCount
   - Relations: province (optional)

5. `GeoStats` - Aggregate statistics
   - Nesting: totalProvinces, totalDistricts, totalVoters, byRegion summary

**Note:** Geography is primarily read-only; populated via database seed

---

#### `types/vote.ts` (Vote & Results - 171 lines)
**Exports (17 types/interfaces):**

**Vote Recording:**
1. `Vote` - Individual vote (anonymized)
   - Fields: id, electionId, ballotType, voterHash (sha256 dedup), ballot choice fields
   - **Key:** Only stores hash of citizenId (not actual ID) for privacy

2. `CastPartyVoteRequest` - Party list vote input
3. `CastConstituencyVoteRequest` - Constituency vote input
4. `CastReferendumVoteRequest` - Referendum vote input

5. `CastBallotRequest` - Composite vote (voter can vote in all 3 categories)
   - Fields: electionId, partyVote?, constituencyVote?, referendumVotes[]

6. `VoteReceipt` - Voter-facing confirmation
   - Fields: ballotId, electionId, ballotType, timestamp, confirmationCode

**Batch Processing:**
7. `BatchStatus` - enum: 'PENDING' | 'APPROVED' | 'REJECTED'

8. `VoteBatch` - District official vote batch submission
   - Fields: id, electionId, districtId, submittedById, approvedById, status
   - Contains: partyVotes[], constituencyVotes[], referendumVotes[]
   - Metadata: totalVotes, notes, rejectionReason

9. `BatchPartyVote` - Vote count by party
10. `BatchConstituencyVote` - Vote count by candidate
11. `BatchReferendumVote` - Vote counts by answer (approve/disapprove/abstain)

12. `CreateVoteBatchRequest` - Batch submission payload

**Results & Analytics:**
13. `PartyResult` - Party vote count & percentage
14. `CandidateResult` - Candidate vote count, party affiliation, winner flag
15. `DistrictResult` - District aggregate: candidates, total/invalid votes, turnout
16. `ReferendumResult` - Referendum vote counts & result (APPROVED/DISAPPROVED/TIE)

17. `ElectionResults` - Complete election outcome
    - Contains: partyListResults[], constituencyResults[], referendumResults[]
    - Aggregations: byRegion, byProvince
    - Metadata: totalEligibleVoters, totalVotesCast, turnoutPercentage

**Consumer:** Frontend vote submission (`src/app/(public)/vote/page.tsx`)

---

#### `types/rbac.ts` (RBAC & Authorization - 113 lines)
**Exports (6 types/interfaces + 2 helper functions with RUNTIME CODE):**

**Type Definitions:**
1. `UserRole` - Union: 'super_admin' | 'regional_admin' | 'province_admin' | 'district_official' | 'voter'

2. `OfficialScope` - Geographic/hierarchical scope
   - Fields: regionId?, provinceId?, districtId?
   - Defines what regions/provinces/districts an official can access

3. `Permission` - Union of 22 string literals (granular permissions)
   - Categories: election:*, party:*, candidate:*, vote:*, user:*
   - Example: 'election:create', 'vote:batch_upload', 'vote:view_results'

**Runtime Implementation (ONLY FILE WITH RUNTIME CODE):**
4. `ROLE_PERMISSIONS` - Constant object mapping roles to permission arrays
   ```
   {
     super_admin: [all 22 permissions],
     regional_admin: [read-heavy + candidate:create/update + vote:batch_approve],
     province_admin: [read-heavy + candidate:create/update + vote:batch_approve],
     district_official: [limited: vote:batch_upload only],
     voter: [minimal: election/party/candidate:read + vote:cast]
   }
   ```

5. `hasPermission(role, permission)` - Helper function
   - Checks if role has permission
   - **Runtime consumer:** Backend RBAC middleware (`src/middleware/rbac.ts`)

6. `canAccessDistrict(userRole, userScope, targetDistrictId, ...)` - Helper function
   - Scope-aware access check
   - Example: regional_admin can access districts only in their region
   - **Runtime consumer:** Backend RBAC middleware

**Key Insight:** This is the ONLY module with runtime JS code (2 functions); all others are type-only

---

## 3. CONSUMPTION PATTERNS

### 3.1 Backend (`@election/backend`)
**Import Style:** Uses TypeScript path alias `@election/shared`

**Files Importing Shared:**
1. `src/middleware/auth.ts`
   - Imports: `JWTPayload`, `AuthUser`, `UserRole`, `OfficialScope` (types)
   - Usage: JWT verification, auth context

2. `src/middleware/rbac.ts`
   - Imports: `hasPermission`, `canAccessDistrict` (functions + types)
   - Imports: `Permission`, `UserRole` (types)
   - Usage: Authorization checks in route handlers

3. `src/routes/auth.ts`
   - Imports: `AuthUser`, `OfficialScope` (types)
   - Usage: Type-safe auth endpoints

4. `src/services/thaidMock.ts`
   - Imports: `ThaiDVerifyResponse` (type)
   - Usage: Mock identity verification

**Pattern:** Backend ONLY uses types + 2 RBAC helper functions

---

### 3.2 Frontend (`frontend`)
**Import Style:** Direct relative path imports `../../../shared/src/types/*`
(Note: Frontend is NOT in workspace dependencies for `@election/shared`)

**Files Importing Shared:**
1. `src/lib/auth-context.tsx`
   - Imports: `AuthUser`, `ThaiDVerifyResponse`, `OfficialLoginRequest`
   - Usage: Type-safe auth state management, login form

2. `src/app/(public)/vote/page.tsx`
   - Imports: `CastBallotRequest`
   - Usage: Type-safe vote submission

**Pattern:** Frontend uses direct path imports (not npm package)

---

## 4. CENTRAL TYPES & DOMAIN BOUNDARIES

### 4.1 Most Critical Types (by usage frequency)

**Tier 1: Foundational**
- `AuthUser` - Used in every auth-related operation
- `UserRole` - Base for all permission checks
- `OfficialScope` - Hierarchical access control

**Tier 2: Request/Response Contracts**
- `CastBallotRequest` - Every vote submission
- `VoteBatch` - Every official batch upload
- `ElectionResults` - Every results query

**Tier 3: Domain Models**
- `Election`, `Party`, `Candidate` - Election CRUD
- `Vote`, `VoteReceipt` - Vote atomicity
- `District`, `Province`, `Region` - Geographic hierarchy

---

### 4.2 Type Boundaries & Relationships

```
┌─ RBAC Layer (Authorization)
│  ├─ UserRole + OfficialScope
│  ├─ Permission
│  └─ ROLE_PERMISSIONS (runtime)
│
├─ Auth Layer (Identity)
│  ├─ AuthUser (combines role + scope)
│  ├─ JWTPayload
│  ├─ ThaiDVerifyResponse (input)
│  └─ LoginResponse (contract)
│
├─ Election Management
│  ├─ Election (top-level aggregate)
│  ├─ Party (for PARTY_LIST ballots)
│  ├─ Candidate (for CONSTITUENCY ballots)
│  ├─ ReferendumQuestion (for REFERENDUM ballots)
│  └─ BallotType (discriminator)
│
├─ Geography (Static)
│  ├─ Region (ภาค)
│  ├─ Province (จังหวัด)
│  └─ District (เขตเลือกตั้ง)
│
├─ Vote Recording (Privacy-First)
│  ├─ Vote (individual, anonymized)
│  ├─ VoteBatch (bulk upload for officials)
│  ├─ VoteReceipt (voter confirmation)
│  └─ CastBallotRequest (vote submission contract)
│
└─ Results (Analytics)
   ├─ PartyResult
   ├─ CandidateResult
   ├─ ReferendumResult
   └─ ElectionResults (complete outcome)
```

---

## 5. TYPE vs RUNTIME BREAKDOWN

| Module | Type-Only | Runtime | Lines | Exports |
|--------|-----------|---------|-------|---------|
| `index.ts` | ✅ | ❌ | 21 | 3 |
| `auth.ts` | ✅ | ❌ | 62 | 6 |
| `election.ts` | ✅ | ❌ | 112 | 11 |
| `geo.ts` | ✅ | ❌ | 49 | 5 |
| `vote.ts` | ✅ | ❌ | 171 | 17 |
| `rbac.ts` | ✅ | ✅ | 113 | 6 types + 2 functions |
| **TOTAL** | **99%** | **1%** | **528** | **48** |

**Key Finding:** Only `rbac.ts` exports runtime code (2 helper functions);
everything else is compile-time type definitions.

---

## 6. PACKAGE DISTRIBUTION & CONFIGURATION

### 6.1 Package.json Exports
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    }
  }
}
```

**Supports 2 import styles:**
1. `import * from '@election/shared'` → all exports
2. `import * from '@election/shared/types'` → types/index.ts only

### 6.2 Built Artifacts
- **Format:** ES Modules (.js files)
- **Types:** TypeScript declaration files (.d.ts)
- **Source Maps:** Included (.js.map, .d.ts.map)
- **Output Directory:** `./dist/` (built by `npm run build:shared`)

---

## 7. DEPENDENCY GRAPH

```
┌─────────────────────────────────────┐
│  Thai Election System (Root)        │
│  Monorepo Workspaces                │
├─────────────────────────────────────┤
│                                     │
├─ @election/shared                  │
│  ├─ Type Definitions                │
│  ├─ RBAC Helpers (minimal runtime)  │
│  └─ Data Contracts                  │
│       │                             │
│       ├──────────────┬──────────────┤
│       │              │              │
│       ▼              ▼              │
│  @election/backend  frontend       │
│  ├─ Auth            ├─ Vote UI     │
│  ├─ RBAC Check      ├─ Auth Form   │
│  ├─ Results API     └─ Results Viz │
│  └─ Endpoints       (uses shared   │
│      (uses @election/shared)   via relative path)
│                                     │
└─────────────────────────────────────┘
```

---

## 8. BUILD & COMPILATION

### 8.1 TypeScript Configuration
- **Extends:** `tsconfig.json` in shared root
- **Targets:** ES2020 / ESNext
- **Module:** ES Modules
- **Declaration:** true (generates .d.ts)

### 8.2 Build Commands
```bash
npm run build:shared    # Compiles src/ → dist/
npm run typecheck:shared # Type check only (no emit)
npm run lint:shared     # ESLint validation
```

### 8.3 Dependencies
- **Runtime:** None (zero external deps)
- **Dev:** TypeScript, ESLint, @types/node

---

## 9. SUMMARY & KEY INSIGHTS

### Purpose
Central type and contract library for a Thai election system with strict RBAC enforcement and privacy-first vote recording.

### Boundaries
- **In-scope:** Type definitions, data contracts, RBAC permission model + 2 helper functions
- **Out-of-scope:** API implementation, database models, business logic

### Type Exports Summary
| Category | Count | Examples |
|----------|-------|----------|
| Types/Interfaces | 46 | AuthUser, Election, Vote, Role |
| Unions | 5 | UserRole, BallotType, ElectionStatus |
| Constants | 1 | ROLE_PERMISSIONS (runtime) |
| Functions | 2 | hasPermission(), canAccessDistrict() |

### Key Characteristics
✅ **Types-first** - 99% compile-time, 1% runtime  
✅ **Zero dependencies** - Pure TypeScript  
✅ **Monorepo-aware** - Path aliases in workspace  
✅ **Privacy-conscious** - Vote anonymization (voterHash)  
✅ **Hierarchical RBAC** - Regional/Province/District scoping  
✅ **Multi-ballot support** - Party list + Constituency + Referendum  

### Consumers
- **Backend:** 5 files (middleware, routes, services)
- **Frontend:** 2 files (auth context, vote submission)

---

## 10. APPENDIX: Complete Export Inventory

### By Count
- **Interfaces:** 33
- **Type Unions:** 5
- **Request Types:** 8
- **Result/Response Types:** 9
- **Helper Types:** 2
- **Constants:** 1
- **Functions:** 2

### By Domain
| Domain | Exports |
|--------|---------|
| RBAC | UserRole, OfficialScope, Permission, ROLE_PERMISSIONS, hasPermission(), canAccessDistrict() |
| Auth | AuthUser, JWTPayload, VoterLoginRequest, OfficialLoginRequest, LoginResponse, ThaiDVerifyResponse |
| Election | Election, CreateElectionRequest, UpdateElectionRequest, Party, CreatePartyRequest, Candidate, CreateCandidateRequest, ReferendumQuestion, CreateReferendumRequest, ElectionStatus, BallotType |
| Geography | Region, RegionName, Province, District, GeoStats |
| Vote | Vote, CastBallotRequest, CastPartyVoteRequest, CastConstituencyVoteRequest, CastReferendumVoteRequest, VoteReceipt, VoteBatch, BatchPartyVote, BatchConstituencyVote, BatchReferendumVote, CreateVoteBatchRequest, BatchStatus |
| Results | PartyResult, CandidateResult, DistrictResult, ReferendumResult, ElectionResults |
| Common | ApiResponse, PaginatedResponse, TimestampFields |

