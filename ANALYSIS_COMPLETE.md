# Frontend-Backend Communication Analysis - COMPLETE

**Date**: February 2, 2025  
**Project**: Election Demo  
**Status**: ✅ Analysis Complete

---

## Report Files Generated

1. **FRONTEND_BACKEND_COMMUNICATION_ANALYSIS.md** (20 KB)
   - Comprehensive detailed analysis with code examples
   - All issues documented with line numbers
   - Detailed recommendations with code samples
   - Security implications explained

2. **COMMUNICATION_SUMMARY.txt** (3.3 KB)
   - Quick reference for the 5 main findings
   - One-page overview of all issues
   - Recommended action order

3. **ISSUES_DIAGRAM.txt** (5 KB)
   - Visual representation of each issue
   - Flow diagrams showing current vs. fixed behavior
   - Severity breakdown matrix
   - Remediation priority timeline

---

## Key Findings Summary

### 🔴 CRITICAL ISSUES (Block Functionality)

**Issue #1: SSE Endpoint Path Mismatch**
- Frontend calls: `/stream/results/:electionId`
- Backend exposes: `/stream/elections/:electionId/results`
- Impact: 404 error, SSE stream never connects
- Files: `frontend/src/app/(public)/results/page.tsx:276` vs `backend/src/routes/stream.ts:49`

**Issue #2: SSE Event Name Mismatch**  
- Frontend listens for: `result_update`
- Backend sends: `snapshot` (initial) + unnamed (updates)
- Impact: No SSE events ever received
- Files: `frontend/src/hooks/useSSE.ts:43` vs `backend/src/routes/stream.ts:62,79`

### 🟡 HIGH PRIORITY (Type Safety & Security)

**Issue #3: API Response Type Mismatch**
- Results page types as: `ElectionData`
- Actual response: `{ success: boolean, data: ElectionData }`
- Works by accident due to runtime behavior
- File: `frontend/src/app/(public)/results/page.tsx:282`

**Issue #4: Token Storage Inconsistency**
- localStorage key: `auth_token`
- Frontend cookie: `auth_token`  
- Backend expects: `token` cookie
- Files: `auth-context.tsx`, `api.ts`, `middleware.ts`

### 🟢 MEDIUM PRIORITY (Code Quality)

**Issue #5: No API Error Unwrapping**
- Error responses not properly unwrapped from envelope
- File: `frontend/src/lib/api.ts:33-34`

**Issue #6: No JWT Signature Verification**
- Middleware decodes JWT without verifying signature
- File: `frontend/src/middleware.ts:15-19`

---

## What's Working ✅

1. **apiRequest() Function**
   - Correctly handles token from localStorage
   - Proper credential handling
   - Good error catching

2. **Auth Context**
   - User object structure is well-defined
   - Login/logout flows work correctly
   - User roles correctly implemented

3. **Route Protection**
   - Admin routes properly protected
   - Role-based access control working
   - Login redirects functioning

4. **SSE Hook Design**
   - Proper connection management
   - Good cleanup on unmount
   - Reconnection logic is solid
   - **But**: Connected to wrong endpoint with wrong events

5. **User Object**
   - All properties properly defined
   - Roles and scopes correctly structured
   - eligibleDistrictId correctly set for voters

---

## What's Broken ❌

### Critical (Blocks Features)
1. Live election results stream doesn't work
2. SSE endpoint doesn't exist (404)
3. SSE events never received even if connected

### High Priority
1. Type safety lost in results page (works by accident)
2. Token storage split across 3 different names
3. Auth may fail due to cookie name mismatch

### Medium Priority
1. Error messages may not display correctly
2. JWT tokens can be forged in frontend

---

## Specific Code Issues

### `frontend/src/lib/api.ts`
```typescript
// Line 41: Returns raw response, does not unwrap
return await response.json();  // ← Should be: return (json.data ?? json) as T;
```

### `frontend/src/app/(public)/results/page.tsx`
```typescript
// Line 276: Wrong endpoint
const { data: sseData, status } = useSSE<ElectionData>(`/stream/results/${electionId}`);
// Should be: /stream/elections/${electionId}/results

// Line 282: Type mismatch (works by accident)
apiRequest<ElectionData>(`/results?electionId=${electionId}`)
// Should be: apiRequest<Election[]>(...) after fixing apiRequest to auto-unwrap
```

### `frontend/src/hooks/useSSE.ts`
```typescript
// Line 43: Wrong event name
eventSource.addEventListener('result_update', (event) => {
// Should listen for: 'snapshot' OR backend should send 'result_update'
```

### `backend/src/routes/stream.ts`
```typescript
// Line 49: Wrong route path
router.get('/elections/:electionId/results', async (req, res) => {
// Should be: '/results/:electionId' OR frontend should call correct path

// Line 62: Wrong event name
res.write(`event: snapshot\n...`);
// Should be: 'result_update' to match frontend listener
```

### Token Storage
```typescript
// auth-context.tsx lines 81, 103
localStorage.setItem("auth_token", token);  // One name
document.cookie = `auth_token=${token}...`; // Same name
// But backend expects: "token" cookie
```

---

## User Object Properties ✅

All properties are correctly implemented:

```typescript
interface AuthUser {
  id: string;                    // User ID
  email?: string;                // For officials
  citizenId?: string;            // For voters
  name: string;                  // Full name
  role: UserRole;                // voter | super_admin | regional_admin | etc.
  scope?: OfficialScope;         // { regionId?, provinceId?, districtId? }
  eligibleDistrictId?: string;   // For voters to access their district
}
```

Available roles:
- `super_admin` - Full system access
- `regional_admin` - Manage provinces in region (scope.regionId)
- `province_admin` - Manage districts in province (scope.provinceId)
- `district_official` - Manage votes in district (scope.districtId)
- `voter` - Can vote and view results (uses eligibleDistrictId)

---

## Does apiRequest() Auto-Unwrap?

**Answer: NO**

```typescript
// apiRequest returns: { success: true, data: [...] }

// Vote page (correct):
const response = await apiRequest<{ success: boolean; data: Election[] }>("/elections");
const elections = response.data;  // ✅ Explicitly accesses .data

// Results page (incorrect but works):
const data = await apiRequest<Election[]>("/elections");  
// ❌ Typed as Election[] but receives { success, data: Election[] }
// Works by accident at runtime
```

**Recommendation**: Add auto-unwrap to apiRequest:
```typescript
return (json.data ?? json) as T;  // One line change
```

Then all call sites become:
```typescript
const elections = await apiRequest<Election[]>("/elections");  // Clean!
```

---

## Remediation Path

### Immediate (Today - 30 mins)
1. Fix SSE endpoint path
   - Change `backend/src/routes/stream.ts` line 49: `/elections/:electionId/results` → `/results/:electionId`
   - OR change `frontend/src/app/(public)/results/page.tsx` line 276 to match backend

2. Fix SSE event name  
   - Change `backend/src/routes/stream.ts` line 62: `snapshot` → `result_update`
   - Also fix line 79 in sendToClients function
   - OR change `frontend/src/hooks/useSSE.ts` line 43 to listen for `snapshot`

**Impact**: Live results feature will work

### Short Term (This Week - 2 hours)
3. Add auto-unwrap to apiRequest()
   - Edit `frontend/src/lib/api.ts` line 41
   - Change all call sites to use unwrapped types
   - Update results/page.tsx to use Election[] instead of envelope

4. Standardize token storage
   - Choose either localStorage OR cookies (recommend HttpOnly cookies)
   - Update all three locations (auth-context, api.ts, middleware.ts)
   - Test cross-origin authentication

**Impact**: Type safety restored, token handling consistent

### Medium Term (This Month - 1 hour)
5. Add error response unwrapping
   - Type error responses properly
   - Unwrap error from { success: false, error: "..." }

6. Add JWT signature verification
   - Use jose library to verify tokens in middleware
   - Prevent token forgery

**Impact**: Better error handling, improved security

---

## Testing Recommendations

After fixes, test:

1. **SSE Connection**
   - Navigate to `/results`
   - Check browser DevTools Network tab
   - Verify SSE stream connects to correct endpoint
   - Verify `result_update` events are received

2. **Live Updates**
   - Cast a vote in another browser
   - Verify results update in real-time on first browser

3. **Token Management**
   - Login as admin
   - Verify token is stored consistently
   - Verify cross-origin requests work
   - Verify logout clears token properly

4. **API Type Safety**
   - Run TypeScript type check
   - Verify no type errors
   - Test apiRequest with multiple endpoints

---

## Code Quality Metrics

| Metric | Status | Notes |
|--------|--------|-------|
| API Response Handling | ❌ Inconsistent | Vote page correct, results page has type mismatch |
| SSE Implementation | ❌ Broken | Endpoint and event name don't match backend |
| Token Management | ❌ Messy | Three different names across layers |
| Type Safety | ⚠️ Partial | Vote page safe, results page risky |
| Error Handling | ⚠️ Basic | No unwrapping of error responses |
| Security | ⚠️ Weak | No JWT verification in frontend |

---

## Conclusion

The frontend-backend communication has **6 identified issues**:
- **2 CRITICAL** (SSE is completely broken)
- **2 HIGH** (Type safety and token storage)
- **2 MEDIUM** (Code quality and security)

**Root Cause**: Inconsistent patterns and architectural decisions not enforced.

**Good News**: All issues are fixable with targeted changes.

**Timeline**: 
- Critical fixes: 30 minutes
- Type safety fixes: 2 hours  
- Security hardening: 1 hour
- **Total**: ~3.5 hours

See the detailed analysis documents for code-by-code recommendations.
