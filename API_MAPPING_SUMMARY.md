# API Endpoints Mapping - Executive Summary

## Document Overview

This project contains **comprehensive API documentation** for the Election Demo backend API. Two detailed reference documents have been created:

1. **API_ENDPOINTS_COMPLETE.md** (33 KB) - Full detailed reference with all endpoints and response examples
2. **API_QUICK_REFERENCE.md** (11 KB) - Quick lookup guide with tables and checklists

---

## Quick Stats

| Metric | Count |
|--------|-------|
| **Total Endpoints** | 41 |
| **Route Files** | 11 |
| **HTTP Methods Used** | 5 (GET, POST, PATCH, DELETE, HEAD) |
| **Authentication Types** | 3 (None, Voter, Official) |
| **User Roles** | 5 (voter, district_official, province_admin, regional_admin, super_admin) |
| **Response Formats** | 2 patterns (success/ok) |

---

## Endpoint Breakdown by Category

### Authentication (5 endpoints)
- Voter login (13-digit citizen ID)
- Official login (email/password)
- Get current user
- Logout
- Supports both cookie and Bearer token auth

### Elections (6 endpoints)
- List/get elections
- Create/update elections (super_admin only)
- Change status (DRAFT → OPEN → CLOSED → ARCHIVED)
- Delete elections (DRAFT status only)

### Parties (5 endpoints)
- List/get parties
- Create/update/delete parties (super_admin only)
- Filterable by election

### Candidates (5 endpoints)
- List/get candidates
- Create/update/delete candidates (permission-based)
- Supports filtering by election, district, party

### Votes (2 endpoints)
- Cast vote(s) - only when election OPEN
- Check vote status - prevents double voting via hashed citizen ID

### Results (2 endpoints)
- Get aggregated election results
- Get district-level results with candidate winners

### Geography (6 endpoints)
- Get regions, provinces, districts
- Get statistics (voter counts)
- Hierarchical structure: Region → Province → District

### Batch Submission (6 endpoints)
- List batches (role-based filtering)
- Submit batch (district_official only, election must be CLOSED)
- Approve/reject batches (admin roles with jurisdiction checking)
- Delete pending batches

### Streaming (1 endpoint)
- Server-Sent Events for real-time election results
- Sends snapshot on connect, updates on votes, heartbeat every 30s

### Health (1 endpoint)
- GET /health - Basic monitoring endpoint

---

## Critical Findings for Frontend/Backend Integration

### ⚠️ Response Wrapper Inconsistency

**ISSUE:** The backend uses TWO different response patterns:

**Pattern 1 (Most endpoints - PREFERRED):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Pattern 2 (Global error handler - FALLBACK):**
```json
{
  "ok": false,
  "error": "..."
}
```

**FIX REQUIRED:** Frontend must handle both patterns:
```javascript
// Check success first
if (response.data?.success === false) {
  // Handle explicit error
} else if (response.data?.ok === false) {
  // Handle global error  
} else if (response.data?.success === true) {
  // Process success data
}
```

**AFFECTED:** Error responses from unhandled errors will use `ok` field instead of `success`.

---

### ✅ Authentication Token Handling

**WORKING CORRECTLY:**

Token extraction order:
1. Cookie: `token` (httpOnly on server, checks if httpOnly flag allows)
2. Header: `Authorization: Bearer <token>`

Both methods are supported and work correctly. Frontend can use either:
- Via cookies (automatic with requests when credentials enabled)
- Via Authorization header (manual attachment)

---

### ✅ Role-Based Access Control

**WORKING CORRECTLY:**

- Scope filtering properly implemented for officials
- District/Province/Region hierarchy enforced
- Super admin can bypass scope restrictions
- Permission matrix clearly defined in shared package

**Role hierarchy:**
```
super_admin (no scope limits)
  ↓
regional_admin (scoped to region)
  ↓
province_admin (scoped to province)
  ↓
district_official (scoped to district)
  ↓
voter (basic voting rights)
```

---

### ✅ Vote Casting & Deduplication

**WORKING CORRECTLY:**

- Uses hashed voter ID: SHA256(citizenId + electionId + salt)
- Prevents double voting through database unique constraint
- Only allows voting when election status = OPEN
- Returns confirmation codes for receipt

---

### ✅ Batch Submission Workflow

**WORKING CORRECTLY:**

- Can only submit when election is CLOSED
- District officials restricted to their own district
- Status flow: PENDING → APPROVED/REJECTED
- Cannot delete approved/rejected batches
- Approval hierarchies: district_official → province_admin → regional_admin → super_admin

---

## Key Implementation Details

### Request Authentication
```
Headers:
- Cookie: token=JWT_TOKEN
  OR
- Authorization: Bearer JWT_TOKEN
```

### JWT Token Structure
```javascript
{
  sub: userId,
  role: userRole,
  scope: {
    regionId?: string,
    provinceId?: string,
    districtId?: string
  },
  citizenId?: string  // For voters
}
```

### Voter vs. Official Distinction
- **Voters:** Identified by `citizenId` (13-digit Thai ID)
- **Officials:** Identified by `email` + `role` + `scope`
- Both get JWT tokens with different payload structure

---

## Data Validation Notes

### Citizen ID (Voter Login)
- Must be exactly 13 digits
- Format validation done in `verifyThaiD()` mock service
- Uses simple regex check (demo-only)

### Confirmation Codes
- Generated as random hex: `randomBytes(4).toString('hex').toUpperCase()`
- Format: 8 characters uppercase hex (e.g., "A1B2C3D4")

### Election Status Transitions
- Valid values: DRAFT, OPEN, CLOSED, ARCHIVED
- Only DRAFT elections can be deleted
- Only OPEN elections allow voting
- Only CLOSED elections allow batch submission

### Batch Statuses
- PENDING: Awaiting approval
- APPROVED: Counted in results
- REJECTED: Marked as invalid

---

## API Security Issues (Demo-Only)

### ⚠️ HIGH PRIORITY for Production

1. **Password Hashing**
   - Current: SHA256 (cryptographically weak)
   - Fix: Use bcryptjs with salt rounds 10+
   - Location: `backend/src/routes/auth.ts`

2. **JWT Secret**
   - Current: Defaults to 'dev-secret'
   - Fix: Use strong random secret from env var
   - Location: `backend/src/middleware/auth.ts`

3. **CORS Origin**
   - Current: Hardcoded to `http://localhost:3000`
   - Fix: Use env var for production
   - Location: `backend/src/app.ts`

4. **No Rate Limiting**
   - Current: None implemented
   - Fix: Add rate limiting middleware (express-rate-limit)

5. **No Input Validation**
   - Current: Basic checks only
   - Fix: Use zod or joi for validation

---

## Performance Considerations

### Current Limitations
- No pagination on list endpoints
- All eligible results returned at once
- No caching layer
- SSE streaming loads all votes into memory

### Recommendations
```javascript
// Add pagination to large endpoints
// GET /elections?limit=10&offset=0
// GET /parties?electionId=X&limit=50&offset=0

// Add filtering
// GET /batches?status=PENDING&electionId=X

// Consider caching
// Redis for: regions, provinces, districts, parties
```

---

## Token-Based vs. Cookie-Based Auth Comparison

| Aspect | Token (Header) | Cookie |
|--------|---|---|
| **XSRF Protection** | ❌ (Manual required) | ✅ (Built-in) |
| **Mobile Friendly** | ✅ | ❌ (Depending on app) |
| **CORS Preflight** | ❌ | ✅ (May trigger) |
| **Server Support** | ✅ Both available | ✅ Available |
| **XSS Risk** | Low (if not in DOM) | ✅ (httpOnly mitigates) |

**Current Backend:** Supports both, so frontend choice is flexible.

---

## Testing Scenarios Covered

### ✅ Voter Flow
1. POST /auth/voter/login
2. GET /elections
3. GET /candidates?electionId=X&districtId=Y
4. POST /votes/cast
5. GET /votes/status/:electionId

### ✅ Official Flow
1. POST /auth/official/login
2. GET /elections
3. GET /batches
4. POST /batches (submit)
5. (Admin reviews)
6. POST /batches/:id/approve or reject

### ✅ Results Flow
1. GET /elections
2. GET /results/:electionId
3. GET /results/:electionId/by-district
4. GET /stream/elections/:electionId/results

---

## Common Frontend Implementation Patterns

### Handling Inconsistent Response Wrapper

```typescript
// Create a response interceptor
const handleResponse = (response: any) => {
  const data = response.data;
  
  if ('success' in data) {
    // Pattern 1: Explicit handlers
    if (data.success) return { ok: true, data: data.data };
    if (data.success === false) return { ok: false, error: data.error };
  }
  
  if ('ok' in data) {
    // Pattern 2: Global error handler
    if (data.ok === true) return { ok: true, data };
    if (data.ok === false) return { ok: false, error: data.error };
  }
  
  // Fallback
  return { ok: true, data };
};
```

### Handling JWT Tokens

```typescript
// Option 1: Via Authorization Header
const api = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Option 2: Via Cookies
axios.defaults.withCredentials = true;
// Token automatically included if set as cookie
```

### Checking Authentication Status

```typescript
// Verify token validity
const checkAuth = async () => {
  try {
    const response = await api.get('/auth/me');
    if (response.data?.success) {
      return response.data.data; // User object
    }
  } catch {
    return null; // Not authenticated
  }
};
```

---

## File Locations for API Implementation

| Component | Location | Purpose |
|-----------|----------|---------|
| Route mounting | `backend/src/routes/index.ts` | All routes registered here |
| Auth routes | `backend/src/routes/auth.ts` | Login, logout, get me |
| Election routes | `backend/src/routes/elections.ts` | Election CRUD |
| Vote routes | `backend/src/routes/votes.ts` | Vote casting and status |
| Results routes | `backend/src/routes/results.ts` | Aggregated results |
| Batch routes | `backend/src/routes/batches.ts` | Batch submission/approval |
| Streaming | `backend/src/routes/stream.ts` | SSE for real-time results |
| Auth middleware | `backend/src/middleware/auth.ts` | JWT token handling |
| RBAC middleware | `backend/src/middleware/rbac.ts` | Role/permission checks |
| Error handler | `backend/src/middleware/errorHandler.ts` | Global error response |
| App config | `backend/src/app.ts` | Express setup, CORS |

---

## Summary Checklist for Frontend Implementation

### ✅ Must Implement
- [ ] Handle both `success` and `ok` response fields
- [ ] Store JWT token from login response
- [ ] Send token via Authorization header OR cookie
- [ ] Implement token refresh before expiry (7d default)
- [ ] Handle 401 responses (redirect to login)
- [ ] Display error messages from error field

### ✅ Should Implement
- [ ] Check election status before allowing vote
- [ ] Validate citizen ID format (13 digits)
- [ ] Show confirmation codes to voter
- [ ] Check vote status before allowing duplicate voting
- [ ] Handle role-based UI (show/hide based on user role)
- [ ] Implement SSE listener for real-time results

### ✅ Nice to Have
- [ ] Optimistic UI updates
- [ ] Token refresh mechanism
- [ ] Error boundary components
- [ ] Loading states for async operations
- [ ] Offline support for voters
- [ ] Batch retry logic

---

## Next Steps

1. **Review both API documents**
   - API_ENDPOINTS_COMPLETE.md (detailed reference)
   - API_QUICK_REFERENCE.md (quick lookup)

2. **Verify frontend implementation matches**
   - Check response handler patterns
   - Verify token sending mechanism
   - Test role-based access control

3. **Fix response wrapper inconsistency**
   - Update error handler OR
   - Create response normalization layer

4. **Implement security fixes**
   - Use bcryptjs for passwords
   - Use strong JWT secret
   - Add rate limiting

5. **Add features for production**
   - Pagination support
   - Better input validation
   - Caching layer
   - Request logging

---

## Contact Points in Code

**For Questions About:**
- **Response formats:** See `backend/src/routes/*.ts` and `backend/src/middleware/errorHandler.ts`
- **Authentication:** See `backend/src/middleware/auth.ts`
- **Authorization:** See `backend/src/middleware/rbac.ts`
- **API mounting:** See `backend/src/routes/index.ts`

All files use TypeScript with Prisma ORM (SQLite) and Express.js.

