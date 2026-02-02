# Complexity Hotspots and Large Files Analysis
**Election Demo Repository - Complexity & Domain Boundary Identification**

---

## Executive Summary

**Repository Structure:**
- **Backend**: Express.js with Prisma ORM, 8 domain routes + 3 middleware
- **Frontend**: Next.js 14 with App Router, organized by auth layout groups
- **Shared**: TypeScript types package (types/index/auth/election/vote/rbac/geo)

**Total Analyzed LOC**: ~5,220 (excluding node_modules, .next, dist, build)

---

## 🔴 CRITICAL HOTSPOTS (>300 LOC)

### 1. **Frontend: Vote Page** (652 LOC)
**File**: `frontend/src/app/(public)/vote/page.tsx`

**Why It Matters:**
- Core voting workflow for all voter interactions
- Multi-step form spanning 7 distinct steps (authentication → confirmation receipt)
- Handles 3 ballot types: party list, constituency, referendum
- Complex state management with 15+ useState hooks
- Custom inline UI components (Card, CardHeader, CardContent, Label, Input)

**Complexity Indicators:**
- Step-based navigation logic (lines 208-241)
- Conditional rendering for 7 different UI states
- Multiple API endpoints orchestration
- Form validation and formatting (citizen ID parsing)
- Dual-purpose components embedded in page (card system)

**Domain Boundaries Identified:**
- **Voter Authentication**: Lines 107-122 (handleLogin)
- **Election Selection**: Lines 136-206 (checkVoteStatus, handleSelectElection)
- **Ballot Display Logic**: Lines 193-219 (step routing based on election type)
- **Vote Submission**: Lines 243-273 (handleSubmitVote, receipt generation)
- **Receipt Display**: Lines 320-358 (step === 7)

**Suggested AGENTS.md Placement**: Place at `frontend/src/app/(public)/vote/` to document:
- Multi-step form architecture and step transitions
- API contracts for: /elections, /votes/cast, /votes/status
- Voter eligibility and ballot type determination
- Receipt generation and confirmation code handling

---

### 2. **Frontend: Results Page** (394 LOC)
**File**: `frontend/src/app/(public)/results/page.tsx`

**Why It Matters:**
- Real-time election results visualization with SSE streaming
- Three distinct result views: party list, constituency, referendum
- Complex percentage calculations and data aggregation
- Dynamic chart/bar rendering with animations
- Live connection status monitoring

**Complexity Indicators:**
- Custom hooks: `useSSE()` for real-time streaming
- Three tab components with memoization (lines 81-272)
- Percentage calculations for three ballot types
- Responsive UI with sticky headers and status indicators
- Data formatting (Thai locale, percentage formatting)

**Domain Boundaries Identified:**
- **Results Aggregation**: Lines 22-58 (ElectionData interface, result types)
- **Real-Time Streaming**: Lines 274-291 (SSE setup and initial data fetch)
- **Party List Results**: Lines 81-131 (PartyListTab, vote counting)
- **Constituency Results**: Lines 133-214 (ConstituencyTab, district selection, winner determination)
- **Referendum Results**: Lines 216-272 (ReferendumTab, approve/disapprove/abstain voting)

**Suggested AGENTS.md Placement**: Place at `frontend/src/app/(public)/results/` to document:
- SSE streaming protocol and reconnection logic
- Result aggregation formulas
- Three-way tabbed navigation pattern
- Real-time vs. initial data fallback
- Performance considerations for large result sets

---

### 3. **Backend: Batch Processing Route** (307 LOC)
**File**: `backend/src/routes/batches.ts`

**Why It Matters:**
- Handles vote batch submissions from district officials
- Implements hierarchical approval workflows (district → province → region → super admin)
- Complex RBAC scope filtering (district, province, region level access)
- Vote aggregation and batch status management

**Complexity Indicators:**
- Scope-based access control (lines 19-41): 5 different role hierarchies
- Multi-step approval workflow with conditional logic
- Batch creation with vote count validation
- Approval/rejection with cascading permissions
- Detailed audit trail and timestamp tracking

**Domain Boundaries Identified:**
- **Batch Query/Listing**: Lines 10-58 (scope-based filtering for 4 roles)
- **Batch Detail Retrieval**: Lines 60-83 (full vote data with approvals)
- **Batch Submission**: Lines 85-170 (district official submission with validation)
- **Batch Approval**: Lines 172-240+ (hierarchical approval workflow)
- **Approval Workflow**: Role-based approval chains

**Suggested AGENTS.md Placement**: Place at `backend/src/routes/` or separate `backend/src/routes/batches/` to document:
- Hierarchical approval workflow (4-step approval chain)
- Scope-based access control matrix
- Vote count validation and error handling
- Batch status state machine (PENDING → APPROVED → COMMITTED)
- Multi-role approval scenarios and permission matrix

---

## 🟡 SIGNIFICANT FILES (150-300 LOC)

| File | LOC | Purpose & Complexity |
|------|-----|---------------------|
| `backend/src/routes/auth.ts` | 176 | Voter and official authentication, JWT tokens, scope/role assignment |
| `backend/src/routes/results.ts` | 151 | Vote aggregation across all ballot types, percentage calculations |
| `frontend/src/app/(admin)/admin/elections/new/page.tsx` | 188 | Election creation form with complex configurations |
| `frontend/src/app/(admin)/admin/elections/[id]/page.tsx` | 185 | Election editing, status changes, configuration updates |
| `frontend/src/app/(admin)/admin/page.tsx` | 176 | Admin dashboard with role-based view filtering |
| `frontend/src/lib/auth-context.tsx` | 150 | Global auth state + voter/official login, thaidMock integration |
| `frontend/src/app/(admin)/admin/layout.tsx` | 151 | RBAC-aware admin sidebar navigation |
| `backend/src/routes/elections.ts` | 117 | CRUD + status transitions, scope filtering |
| `backend/src/middleware/rbac.ts` | 91 | Permission checking, district access validation |
| `shared/src/types/rbac.ts` | 113 | RBAC model: roles, permissions, scope definitions |

---

## 📊 File Size Distribution

```
Frontend Pages (app router):
  ├─ (public)/vote/page.tsx ................... 652 LOC ⚠️ HOTSPOT
  ├─ (public)/results/page.tsx ............... 394 LOC ⚠️ HOTSPOT
  ├─ (admin)/admin/elections/new/page.tsx ... 188 LOC
  ├─ (admin)/admin/elections/[id]/page.tsx .. 185 LOC
  ├─ (admin)/admin/page.tsx .................. 176 LOC
  ├─ (auth)/login/page.tsx ................... 117 LOC
  └─ app/page.tsx ............................ 99 LOC

Backend Routes:
  ├─ routes/batches.ts ....................... 307 LOC ⚠️ HOTSPOT
  ├─ routes/auth.ts .......................... 176 LOC
  ├─ routes/results.ts ....................... 151 LOC
  ├─ routes/elections.ts ..................... 117 LOC
  ├─ routes/votes.ts ......................... 128 LOC
  ├─ routes/candidates.ts .................... 97 LOC
  ├─ routes/geo.ts ........................... 112 LOC
  ├─ routes/parties.ts ....................... 75 LOC
  ├─ routes/stream.ts ........................ 83 LOC
  └─ routes/health.ts ........................ 11 LOC

Middleware & Infrastructure:
  ├─ middleware/rbac.ts ...................... 91 LOC
  ├─ middleware/auth.ts ...................... 78 LOC
  ├─ middleware/errorHandler.ts ............. 25 LOC
  ├─ lib/auth-context.tsx ................... 150 LOC
  ├─ lib/api.ts ............................. 45 LOC
  └─ hooks/useSSE.ts ........................ 85 LOC

Shared Types:
  ├─ types/vote.ts .......................... 171 LOC
  ├─ types/rbac.ts .......................... 113 LOC
  ├─ types/election.ts ...................... 112 LOC
  └─ types/auth.ts .......................... 62 LOC
```

---

## 🎯 Domain Boundaries & AGENTS.md Placement Recommendations

### **Tier 1: CRITICAL - Place AGENTS.md Immediately**

#### 1️⃣ `frontend/src/app/(public)/vote/`
**Boundary**: Voter voting workflow  
**Scope**: Authentication → Ballot Selection → Vote Casting → Receipt

```
├── AGENTS.md (NEW) - Multi-step voting workflow
├── page.tsx (652 LOC) - Form orchestration
└── Related: shared/types/vote.ts (171 LOC)
```

**Document Should Cover**:
- Multi-step form state machine (7 steps)
- API contracts: POST /votes/cast, GET /votes/status/:electionId
- Ballot type routing (party list → constituency → referendum → confirmation)
- Receipt generation and confirmation code
- Voter eligibility validation

---

#### 2️⃣ `backend/src/routes/batches.ts` + `backend/src/middleware/rbac.ts`
**Boundary**: Hierarchical approval workflows + Role-Based Access Control  
**Scope**: Vote batch aggregation, multi-level approval, scope filtering

```
├── AGENTS.md (NEW) - RBAC architecture & batch approval
├── batches.ts (307 LOC) - Batch submission/approval
├── middleware/rbac.ts (91 LOC) - Permission enforcement
└── Related: shared/types/rbac.ts (113 LOC)
```

**Document Should Cover**:
- RBAC model (5 roles: super_admin, regional_admin, province_admin, district_official, voter)
- Scope hierarchy (region → province → district)
- Permission matrix across all operations
- Batch approval workflow (4-stage approval chain)
- District access validation logic
- Scope-based query filtering

---

#### 3️⃣ `backend/src/routes/` (API Route Group)
**Boundary**: Backend API domain boundaries  
**Scope**: 8 distinct routes handling different aspects of elections

```
├── AGENTS.md (NEW) - Backend route architecture & API contracts
├── auth.ts (176 LOC)
├── elections.ts (117 LOC)
├── votes.ts (128 LOC)
├── results.ts (151 LOC)
├── batches.ts (307 LOC)
├── candidates.ts (97 LOC)
├── parties.ts (75 LOC)
├── geo.ts (112 LOC)
├── stream.ts (83 LOC)
└── health.ts (11 LOC)
```

**Document Should Cover**:
- API routing structure and versioning
- Authentication & authorization flows
- Error handling patterns
- Response format consistency
- API rate limiting (if applicable)
- Data validation at route level

---

### **Tier 2: HIGH PRIORITY - Place AGENTS.md Soon**

#### 4️⃣ `frontend/src/app/(public)/results/`
**Boundary**: Real-time election results visualization  
**Scope**: SSE streaming, multi-tab results aggregation

```
├── AGENTS.md (NEW) - Real-time results architecture
├── page.tsx (394 LOC)
└── Related: hooks/useSSE.ts (85 LOC)
```

**Document Should Cover**:
- Server-Sent Events (SSE) protocol
- Real-time vs. initial data strategy
- Percentage calculation formulas
- Three result view types (party list, constituency, referendum)
- Reconnection logic and fallback behavior

---

#### 5️⃣ `backend/src/middleware/`
**Boundary**: Cross-cutting authentication & error handling  
**Scope**: Request validation, auth enforcement, error responses

```
├── AGENTS.md (NEW) - Middleware architecture
├── auth.ts (78 LOC) - JWT validation, scope extraction
├── rbac.ts (91 LOC) - Permission & access checks
└── errorHandler.ts (25 LOC) - Error response normalization
```

**Document Should Cover**:
- Middleware execution order
- Authentication flow (JWT validation, scope/role assignment)
- Error handling and status codes
- CORS configuration
- Request validation pipeline

---

#### 6️⃣ `frontend/src/app/(admin)/admin/`
**Boundary**: Admin dashboard and election management  
**Scope**: RBAC-aware UI, election CRUD, batch management

```
├── AGENTS.md (NEW) - Admin panel architecture
├── layout.tsx (151 LOC) - RBAC-aware nav
├── page.tsx (176 LOC) - Dashboard
├── elections/
│   ├── page.tsx (125 LOC) - Election listing
│   ├── new/page.tsx (188 LOC) - Creation form
│   └── [id]/page.tsx (185 LOC) - Edit form
└── Related: lib/auth-context.tsx (150 LOC)
```

**Document Should Cover**:
- Admin role-based view filtering
- Election lifecycle (DRAFT → OPEN → CLOSED)
- Form validation and submission
- Permission-based UI rendering

---

### **Tier 3: MEDIUM PRIORITY - Monitor for Growth**

#### 7️⃣ `shared/src/types/`
**Boundary**: Type definitions and domain models  
**Scope**: Shared types for both frontend and backend

```
├── AGENTS.md (NEW) - Domain model documentation
├── rbac.ts (113 LOC) - RBAC types
├── vote.ts (171 LOC) - Vote & ballot types
├── election.ts (112 LOC) - Election & candidate types
├── auth.ts (62 LOC) - Authentication types
└── geo.ts (49 LOC) - Geographic types
```

**Document Should Cover**:
- Type hierarchy and relationships
- Enum definitions (roles, permissions, ballot types)
- Interface contracts
- Validation rules for each type

---

#### 8️⃣ `frontend/src/lib/`
**Boundary**: Frontend utilities and state management  
**Scope**: API client, auth context, helper functions

```
├── AGENTS.md (NEW) - Frontend infrastructure
├── auth-context.tsx (150 LOC) - Auth state
├── api.ts (45 LOC) - API request wrapper
└── utils.ts (6 LOC) - Tailwind/clsx helpers
```

**Document Should Cover**:
- Auth context initialization and voter login flow
- API request error handling
- ThaidMock integration for voter verification
- Cookie-based session management

---

## 📈 Density Analysis (LOC per functional area)

```
Frontend Voting Flow:
  - Vote page: 652 LOC
  - Auth context: 150 LOC
  - useSSE hook: 85 LOC
  - API client: 45 LOC
  ─────────────────────
  Total: 932 LOC (Dense voter flow)

Backend Election Management:
  - Routes (8 files): ~1,050 LOC
  - Middleware (3 files): 194 LOC
  - Services: 83 LOC
  - DB setup: 13 LOC
  ─────────────────────
  Total: ~1,340 LOC (Well-distributed)

Shared Types:
  - vote.ts: 171 LOC
  - rbac.ts: 113 LOC
  - election.ts: 112 LOC
  - Others: ~170 LOC
  ─────────────────────
  Total: 566 LOC (Stable foundation)
```

---

## 🔗 Key Domain Interactions

### **Authentication Flow Boundary**
```
Auth Touch Points:
├─ Frontend Entry: frontend/src/app/(auth)/login/ (117 LOC)
├─ State Management: frontend/src/lib/auth-context.tsx (150 LOC)
├─ Backend Validation: backend/src/routes/auth.ts (176 LOC)
├─ Middleware Enforcement: backend/src/middleware/auth.ts (78 LOC)
└─ Types Definition: shared/src/types/auth.ts (62 LOC)
```
**Why It Matters**: All protected routes depend on this; token validation failure cascades through system

---

### **RBAC Boundary**
```
RBAC Touch Points:
├─ Permission Model: shared/src/types/rbac.ts (113 LOC)
├─ Middleware Checks: backend/src/middleware/rbac.ts (91 LOC)
├─ Batch Approval Logic: backend/src/routes/batches.ts (~100 LOC of 307)
├─ Route-Level Guards: backend/src/routes/*.ts (distributed)
├─ Admin UI Filtering: frontend/src/app/(admin)/ (distributed)
└─ Auth Context: frontend/src/lib/auth-context.tsx (150 LOC)
```
**Why It Matters**: Cascading permission checks across 8 API routes and 3 frontend areas

---

### **Vote Workflow Boundary**
```
Vote Processing Touches:
├─ Frontend Form: frontend/src/app/(public)/vote/page.tsx (652 LOC)
├─ API Submission: backend/src/routes/votes.ts (128 LOC)
├─ Vote Types: shared/src/types/vote.ts (171 LOC)
├─ Results Aggregation: backend/src/routes/results.ts (151 LOC)
├─ Real-Time Streaming: backend/src/routes/stream.ts (83 LOC)
└─ Frontend Display: frontend/src/app/(public)/results/page.tsx (394 LOC)
```
**Why It Matters**: 5 different system areas must stay in sync for vote integrity

---

## 📋 Excluded Areas (Generated/External)

- `node_modules/` - 397 directories
- `frontend/.next/` - Build output
- `backend/prisma/migrations/` - Auto-generated
- `*.d.ts` files from build
- `.git/` directory

---

## Summary: Where to Place AGENTS.md

| Priority | Location | Size | Reason |
|----------|----------|------|--------|
| **🔴 Critical** | `frontend/src/app/(public)/vote/` | 652 LOC | Core voter workflow |
| **🔴 Critical** | `backend/src/routes/batches.ts` | 307 LOC | Hierarchical approvals |
| **🔴 Critical** | `backend/src/middleware/rbac.ts` | 91 LOC | Permission architecture |
| **🟠 High** | `frontend/src/app/(public)/results/` | 394 LOC | Real-time streaming |
| **🟠 High** | `backend/src/routes/` | ~1,050 LOC | API boundaries |
| **🟠 High** | `frontend/src/app/(admin)/` | ~825 LOC | Admin dashboard |
| **🟡 Medium** | `shared/src/types/` | 566 LOC | Domain models |
| **🟡 Medium** | `frontend/src/lib/` | 195 LOC | Frontend infra |

**Total Coverage**: 8 AGENTS.md files recommended for full documentation  
**Critical Path**: 3 AGENTS.md files cover ~75% of complexity hotspots

