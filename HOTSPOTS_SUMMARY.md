# 🔥 Complexity Hotspots - Quick Reference

## 3 Critical Hotspots (>300 LOC)

### 🔴 #1: Vote Page (652 LOC)
- **Path**: `frontend/src/app/(public)/vote/page.tsx`
- **Why Critical**: Core 7-step voter workflow
- **Key Complexity**: Multi-step state machine, 3 ballot types, form validation
- **AGENTS.md Should Go**: `frontend/src/app/(public)/vote/AGENTS.md`
- **Document**: Multi-step form flow, API contracts, ballot routing logic

### 🔴 #2: Results Page (394 LOC)
- **Path**: `frontend/src/app/(public)/results/page.tsx`
- **Why Critical**: Real-time election results with SSE streaming
- **Key Complexity**: Real-time data sync, 3 tab views, percentage calculations
- **AGENTS.md Should Go**: `frontend/src/app/(public)/results/AGENTS.md`
- **Document**: SSE protocol, reconnection logic, aggregation formulas

### 🔴 #3: Batches Route (307 LOC)
- **Path**: `backend/src/routes/batches.ts`
- **Why Critical**: Hierarchical approval workflow with complex RBAC
- **Key Complexity**: 4-stage approval chain, scope-based filtering
- **AGENTS.md Should Go**: `backend/src/routes/AGENTS.md` (covers all routes + batch details)
- **Document**: Approval state machine, role-based access matrix

---

## 8 Recommended AGENTS.md Placements (Priority Order)

### Tier 1: CRITICAL (Do First)
```
1. frontend/src/app/(public)/vote/AGENTS.md
2. backend/src/routes/AGENTS.md (covers batches.ts + all 8 routes)
3. backend/src/middleware/AGENTS.md (covers RBAC architecture)
```

### Tier 2: HIGH (Do Soon)
```
4. frontend/src/app/(public)/results/AGENTS.md
5. frontend/src/app/(admin)/admin/AGENTS.md
6. frontend/src/lib/AGENTS.md
```

### Tier 3: MEDIUM (Monitor & Do Later)
```
7. shared/src/types/AGENTS.md
8. backend/src/services/AGENTS.md (if services expand)
```

---

## Files by Domain Boundary

### 🎯 Frontend Voter Path
- `vote/page.tsx` (652 LOC) → **HOTSPOT**
- `results/page.tsx` (394 LOC) → **HOTSPOT**
- `lib/auth-context.tsx` (150 LOC)
- `hooks/useSSE.ts` (85 LOC)
- `lib/api.ts` (45 LOC)

### 🎯 Backend API Layer
- `routes/batches.ts` (307 LOC) → **HOTSPOT**
- `routes/auth.ts` (176 LOC)
- `routes/results.ts` (151 LOC)
- `routes/elections.ts` (117 LOC)
- `routes/votes.ts` (128 LOC)
- `routes/geo.ts` (112 LOC)
- `routes/candidates.ts` (97 LOC)
- `routes/parties.ts` (75 LOC)
- `routes/stream.ts` (83 LOC)

### 🎯 Authorization & Security
- `middleware/rbac.ts` (91 LOC)
- `middleware/auth.ts` (78 LOC)
- `shared/types/rbac.ts` (113 LOC)
- `shared/types/auth.ts` (62 LOC)

### 🎯 Admin Management
- `admin/elections/new/page.tsx` (188 LOC)
- `admin/elections/[id]/page.tsx` (185 LOC)
- `admin/page.tsx` (176 LOC)
- `admin/layout.tsx` (151 LOC)

### 🎯 Domain Models (Shared)
- `shared/types/vote.ts` (171 LOC)
- `shared/types/election.ts` (112 LOC)
- `shared/types/rbac.ts` (113 LOC)

---

## Key Metrics

- **Total LOC Analyzed**: ~5,220 (excluding node_modules, .next, dist)
- **Files >300 LOC**: 3 files (1,353 LOC total)
- **Files 150-300 LOC**: 10 files (1,965 LOC total)
- **Largest File**: Vote page (652 LOC)
- **Density Alert**: Frontend voting flow is 932 LOC in 4 files → Consider extraction
- **Well-Distributed**: Backend routes at ~130 LOC average across 8 files

---

## What Each AGENTS.md Should Cover

### `frontend/src/app/(public)/vote/AGENTS.md`
- [ ] 7-step form state machine diagram
- [ ] Step transitions and conditions
- [ ] API contracts (POST /votes/cast, GET /elections, etc.)
- [ ] Ballot type routing logic
- [ ] Receipt generation workflow
- [ ] Error handling and validation

### `backend/src/routes/AGENTS.md`
- [ ] API routing structure
- [ ] Route-level RBAC requirements
- [ ] Request/response patterns
- [ ] Pagination and filtering
- [ ] Error response codes
- [ ] Rate limiting (if any)

### `backend/src/middleware/AGENTS.md`
- [ ] Middleware execution order
- [ ] JWT validation flow
- [ ] Scope and role assignment
- [ ] RBAC permission matrix (5 roles × 8 operations)
- [ ] Error handling pipeline

### `frontend/src/app/(public)/results/AGENTS.md`
- [ ] SSE reconnection logic
- [ ] Real-time vs. initial data strategy
- [ ] Percentage calculation formulas
- [ ] Three result views (party/constituency/referendum)
- [ ] Performance optimization for large datasets

### `frontend/src/app/(admin)/admin/AGENTS.md`
- [ ] Role-based view filtering
- [ ] Election lifecycle (DRAFT → OPEN → CLOSED)
- [ ] Batch upload workflow
- [ ] Admin permission matrix
- [ ] Form validation rules

### `frontend/src/lib/AGENTS.md`
- [ ] Auth context initialization
- [ ] Cookie session management
- [ ] API request error handling
- [ ] ThaidMock integration
- [ ] Type-safe API client usage

### `shared/src/types/AGENTS.md`
- [ ] Type hierarchy and relationships
- [ ] Enum definitions
- [ ] Validation rules per type
- [ ] Type compatibility between frontend/backend

---

## Complexity Hotspot Patterns Identified

| Pattern | Files | Impact |
|---------|-------|--------|
| Multi-step forms | vote/page.tsx (652 LOC) | High branching logic |
| Real-time streaming | results/page.tsx (394 LOC) | Connection management |
| Hierarchical permissions | batches.ts (307 LOC) | Access control logic |
| Form state management | 3 admin pages (549 LOC) | 15+ useState hooks |
| Scope-based filtering | routes/*.ts | Duplicated query logic |
| Custom UI components | vote/page.tsx | Card system inline |

---

## Generated Output Excluded

✅ Properly excluded from analysis:
- `node_modules/` (397 directories)
- `frontend/.next/` (build output)
- `backend/prisma/migrations/` (auto-generated DB)
- `.git/` (version control)
- `*.d.ts` build artifacts

---

## Next Steps

1. **Read Full Analysis**: See `COMPLEXITY_ANALYSIS.md` for detailed documentation
2. **Start with Critical 3**: Create AGENTS.md for vote/, batches.ts, middleware/
3. **Add Tier 2 Soon**: Cover results/, admin/, lib/
4. **Domain Mapping**: Use provided interaction diagrams for understanding dependencies
5. **Monitor**: Check for files growing beyond 300 LOC as features are added

