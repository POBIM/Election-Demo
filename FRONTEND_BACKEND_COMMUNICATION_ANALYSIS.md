# Frontend-Backend Communication Analysis Report
## Election Demo Project

---

## Executive Summary

The frontend-backend communication has **multiple critical issues** and several implementation details that could lead to bugs:

1. **🔴 CRITICAL**: `apiRequest()` does NOT automatically unwrap `{ success, data }` - it returns the raw response
2. **🔴 CRITICAL**: SSE stream has endpoint path mismatch + event name mismatch
3. **🟡 HIGH**: The vote page sometimes expects unwrapped data, sometimes wrapped
4. **🟡 HIGH**: Token storage is split across localStorage and cookies inconsistently
5. **🟢 MEDIUM**: Auth state management structure is correct but has storage inconsistencies

---

## 1. API Request Behavior

### File: `frontend/src/lib/api.ts`

```typescript
export async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  // ... config setup ...
  return await response.json();  // ⬅️ Returns RAW response, does NOT unwrap
}
```

**Key Finding**: `apiRequest()` returns the entire response object as-is, **NOT** extracting the nested `data` property.

### Backend Response Structure

All backend endpoints wrap responses in:
```typescript
res.json({ success: true, data: {...} })  // Standard envelope
```

**Example from `/elections` (backend/src/routes/elections.ts line 21)**:
```typescript
const elections = await prisma.election.findMany({...});
res.json({ success: true, data: elections });  // Returns { success, data: [...] }
```

### Frontend Usage Inconsistency ❌

The frontend pages handle this inconsistently:

#### ✅ CORRECT - Vote Page (lines 139-140):
```typescript
const response = await apiRequest<{ success: boolean; data: Election[] }>("/elections");
const elections = response.data || [];  // Correctly accesses .data
```

#### ✅ CORRECT - Vote Page (line 179):
```typescript
const res = await apiRequest<{ success: boolean; data: Party[] }>(`/parties?...`);
setParties(res.data || []);  // Explicitly unwraps
```

#### ❌ INCORRECT - Results Page (line 282):
```typescript
apiRequest<ElectionData>(`/results?electionId=${electionId}`)
  .then(data => {
    setInitialData(data);  // ⬅️ Treats response as direct data, not wrapped
```

**The Problem**: 
- Type declares `ElectionData` (the inner content)
- Actual response is `{ success: boolean, data: ElectionData }`
- Code treats entire response as `ElectionData`
- **This happens to work** because TypeScript doesn't enforce at runtime
- **But it's a type safety disaster**

### Impact

- Vote page is correct but verbose (must type entire envelope)
- Results page is fragile and breaks type safety
- Code is inconsistent across the codebase
- Hard to refactor without breaking things

---

## 2. Auth State Management

### File: `frontend/src/lib/auth-context.tsx`

#### User Object Structure

From `shared/src/types/auth.ts`:
```typescript
export interface AuthUser {
  id: string;                    // User ID
  email?: string;                // For officials (optional)
  citizenId?: string;            // For voters (optional)
  name: string;                  // Full name
  role: UserRole;                // One of 5 roles below
  scope?: OfficialScope;         // Geographic scope (region/province/district)
  eligibleDistrictId?: string;   // For voters only
}
```

#### User Roles & Scope

```typescript
type UserRole = 
  | 'super_admin'        // Full system access, no scope
  | 'regional_admin'     // Manage provinces in region (scope.regionId)
  | 'province_admin'     // Manage districts in province (scope.provinceId)
  | 'district_official'  // Manage votes in district (scope.districtId)
  | 'voter'              // Can cast votes only (uses eligibleDistrictId)
```

#### Implementation Details

**Login Response Handling**: ✅ Correct
- Voter login (line 78): Extracts `{ user, thaidInfo, token }` from `response.data`
- Official login (line 100): Extracts `{ user, token }` from `response.data`
- Both correctly access the `.data` property

**Token Storage**: ❌ Inconsistent
```typescript
localStorage.setItem("auth_token", token);  // localStorage key: "auth_token"
document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;  // Cookie: "auth_token"
```

**Triple Token Name Problem**:
1. Frontend stores as: `localStorage['auth_token']` 
2. Frontend stores as: cookie `auth_token`
3. Backend expects: cookie `token`

This creates maintenance chaos:
- `api.ts` reads from `localStorage` (line 10)
- `middleware.ts` reads from cookie `auth_token` (line 5)
- `backend/src/middleware/auth.ts` reads from cookie `token`

#### User Eligibility & Vote Rights

Vote page correctly uses `user?.eligibleDistrictId`:
```typescript
const res = await apiRequest<...>(`/candidates?electionId=${election.id}&districtId=${user.eligibleDistrictId}`);
```

This property is **only set for voters**, not for officials. This is correct behavior.

---

## 3. Route Protection & Middleware

### File: `frontend/src/middleware.ts`

**Protection Logic**:
1. Extracts `auth_token` cookie
2. Manually decodes JWT without verification (lines 15-19)
3. Checks role is in allowed admin roles
4. Redirects unauthenticated users to `/login`

```typescript
const payload = JSON.parse(atob(parts[1]));  // ⬅️ No signature verification!
const allowedRoles = ['super_admin', 'regional_admin', 'province_admin', 'district_official'];
if (!allowedRoles.includes(payload.role)) {
  return NextResponse.redirect(new URL('/', request.url));
}
```

**Coverage**:
- ✅ `/admin/*` - Protected (requires admin role)
- ✅ `/login` - Redirects admins to `/admin` automatically
- ❌ No signature verification on JWT decode

**Security Issue**: Token can be forged in frontend by admin. Backend has validation, but frontend trusts the token completely.

---

## 4. Server-Sent Events (SSE) - CRITICAL ISSUES 🔴

### File: `frontend/src/hooks/useSSE.ts`

#### Implementation Quality: ✅ Good Hook Design
- Proper connection management with `useRef`
- Cleanup on unmount (lines 73-81)
- Reconnection with configurable interval
- Memory leak prevention with `isMounted` flag
- Good error handling

#### Event Handling (line 43):
```typescript
eventSource.addEventListener('result_update', (event) => {
  const parsedData = JSON.parse(event.data);
  setData(parsedData);
  options.onMessage?.(parsedData);
});
```

**The Problem**: Listens for `result_update` event type.

### Backend Stream Implementation Issues

**File**: `backend/src/routes/stream.ts`

The backend SSE endpoint has **TWO DIFFERENT EVENT NAMES**:

1. **`snapshot`** event for initial connection (line 62):
```typescript
res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
```

2. **Unnamed events** for subsequent updates (line 19):
```typescript
const message = `data: ${JSON.stringify(data)}\n\n`;  // No event type!
```

#### 🔴 ISSUE #1: EVENT NAME MISMATCH

| Component | Listens For | Backend Sends | Match? |
|-----------|-------------|--------------|--------|
| useSSE Hook | `result_update` | `snapshot` + unnamed | ❌ NO |
| Results Page | via useSSE | initial + updates | ❌ NO |

**Consequence**: Frontend never receives the `snapshot` event, and updates have no event type. The `addEventListener('result_update')` is never triggered.

#### 🔴 ISSUE #2: ENDPOINT PATH MISMATCH

**Frontend** (results/page.tsx line 276):
```typescript
const { data: sseData, status } = useSSE<ElectionData>(`/stream/results/${electionId}`);
// Calls: /stream/results/1
```

**Backend** (stream.ts line 49):
```typescript
router.get('/elections/:electionId/results', async (req, res) => {
// Exposes: /stream/elections/1/results
```

**Consequence**: 404 error when frontend tries to connect to SSE stream.

### Results Page SSE Usage

**File**: `frontend/src/app/(public)/results/page.tsx`

Initial data fetch (line 282):
```typescript
apiRequest<ElectionData>(`/results?electionId=${electionId}`)
  .then(data => {
    setInitialData(data);  // ⬅️ Type mismatch - receives { success, data } but typed as ElectionData
```

SSE connection (line 276):
```typescript
const { data: sseData, status } = useSSE<ElectionData>(`/stream/results/${electionId}`);
// Endpoint doesn't exist, also event name is wrong
```

Data merging (line 293):
```typescript
const displayData = sseData || initialData;  // Falls back to initial if SSE fails
```

**Summary of Results Page Issues**:
1. ❌ API response type mismatch (expects unwrapped)
2. ❌ SSE endpoint path doesn't exist (404)
3. ❌ SSE event name doesn't match (result_update vs snapshot)
4. ✅ Fallback to initial data works correctly

---

## 5. API Response Inconsistencies Summary

### Pattern 1: Vote Page (✅ Type Safe)
```typescript
const response = await apiRequest<{ success: boolean; data: T }>("/endpoint");
const items = response.data;  // Explicit unwrapping, fully typed
```

**Pros**: Type safe, clear intent  
**Cons**: Verbose, must type envelope everywhere

### Pattern 2: Results Page (❌ Broken Types)  
```typescript
const data = await apiRequest<T>("/endpoint");  // Generic is inner type
// Actually receives: { success, data: T }
// But TypeScript thinks: T
// This works by accident, code accesses wrong shape
```

**Pros**: Less verbose  
**Cons**: Type safety completely broken, fragile

### Pattern 3: Auth Context (✅ Correct)
```typescript
const response = await apiRequest<VoterLoginResponse>("/auth/voter/login");
// VoterLoginResponse = { data: { user, thaidInfo, token } }
const { user, token } = response.data;  // Correct unwrapping
```

---

## 6. Type Definitions Review

### Backend Response Envelope (shared/src/types/index.ts)
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

✅ All backend endpoints follow this pattern correctly.

### User Role Permissions (shared/src/types/rbac.ts)

Permission matrix is well-defined:
- **Super Admin**: All permissions
- **Regional Admin**: Can manage candidates in region, approve vote batches
- **Province Admin**: Can manage candidates in province, approve vote batches  
- **District Official**: Can upload vote batches (read-only)
- **Voter**: Can cast votes and view results (read-only)

✅ Roles are correctly defined in frontend and backend.

---

## 🔴 CRITICAL ISSUES SUMMARY

### Issue #1: SSE Endpoint Path Mismatch
- **Location**: `frontend/src/app/(public)/results/page.tsx` line 276 vs `backend/src/routes/stream.ts` line 49
- **Frontend calls**: `/stream/results/:electionId`
- **Backend exposes**: `/stream/elections/:electionId/results`
- **Impact**: 404 error, SSE never connects
- **Severity**: 🔴 Critical - Live results completely broken

### Issue #2: SSE Event Name Mismatch
- **Location**: `frontend/src/hooks/useSSE.ts` line 43 vs `backend/src/routes/stream.ts` lines 62, 79
- **Frontend listens for**: `result_update`
- **Backend sends**: `snapshot` (initial) + unnamed events (updates)
- **Impact**: Frontend never receives any SSE events
- **Severity**: 🔴 Critical - Live updates completely broken

### Issue #3: API Response Type Mismatch in Results Page
- **Location**: `frontend/src/app/(public)/results/page.tsx` line 282
- **Code types as**: `ElectionData`
- **Actually receives**: `{ success: boolean, data: ElectionData }`
- **Works by**: Accident (TypeScript not enforced at runtime)
- **Impact**: Type safety lost, code is fragile
- **Severity**: 🟡 High - Will break if API changes

### Issue #4: Token Storage Inconsistency
- **Location**: `frontend/src/lib/auth-context.tsx`, `frontend/src/lib/api.ts`, `frontend/src/middleware.ts`
- **Frontend localStorage key**: `auth_token`
- **Frontend cookie name**: `auth_token`
- **Backend cookie name**: `token`
- **Impact**: May cause cross-origin or cookie issues
- **Severity**: 🟡 High - Potential authentication failures

### Issue #5: No API Error Response Unwrapping
- **Location**: `frontend/src/lib/api.ts` lines 33-34
- **Problem**: Error handling doesn't unwrap error from envelope
- **Impact**: Error messages may not display correctly
- **Severity**: 🟢 Medium - Error handling is sub-optimal

### Issue #6: No JWT Signature Verification
- **Location**: `frontend/src/middleware.ts` lines 15-19
- **Problem**: Decodes JWT without verifying signature
- **Impact**: Tokens can be forged in frontend
- **Severity**: 🟢 Medium - Security risk (backend validates)

---

## 📋 Detailed Recommendations

### Priority 1: Fix SSE Issues (Breaks Live Results)

**Option A**: Match frontend to backend
```typescript
// results/page.tsx line 276
const { data: sseData, status } = useSSE<ElectionData>(`/stream/elections/${electionId}/results`);
// Change endpoint path

// useSSE.ts line 43  
eventSource.addEventListener('snapshot', (event) => {  // Listen for 'snapshot'
  if (isMounted) {
    try {
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
      options.onMessage?.(parsedData);
    } catch (err) {
      console.error('Failed to parse SSE data', err);
    }
  }
});
```

**Option B**: Change backend to match frontend
```typescript
// stream.ts line 62
res.write(`event: result_update\ndata: ${JSON.stringify(snapshot)}\n\n`);  // Change event name

// stream.ts - Update sendToClients to use same event name
function sendToClients(electionId: string, data: unknown): void {
  const message = `event: result_update\ndata: ${JSON.stringify(data)}\n\n`;
  // ...
}

// results/page.tsx line 276 - Fix endpoint path
const { data: sseData, status } = useSSE<ElectionData>(`/stream/results/${electionId}`);
// But backend route is at /stream/elections/:electionId/results - need to change backend route
```

**Recommendation**: Option B is better (change backend to use standardized event name and simpler path):
```typescript
// stream.ts route
router.get('/results/:electionId', async (req, res) => {
  // ... same implementation ...
  res.write(`event: result_update\ndata: ${JSON.stringify(snapshot)}\n\n`);
  // ...
});
```

### Priority 2: Fix API Response Type Handling

**Option A**: Auto-unwrap in apiRequest (recommended)
```typescript
// frontend/src/lib/api.ts
export async function apiRequest<T>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<T> {
  const { data, headers, ...customConfig } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;

  const config: RequestInit = {
    method: data ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...customConfig,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...config,
      credentials: "include",
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const json = await response.json();
    // Auto-unwrap if it has a data property (standard envelope)
    return (json.data ?? json) as T;  // ⬅️ Add this line
  } catch (error) {
    throw error;
  }
}
```

Then update all call sites to use unwrapped type:
```typescript
// Before (verbose)
const response = await apiRequest<{ success: boolean; data: Election[] }>("/elections");
const elections = response.data || [];

// After (clean)
const elections = await apiRequest<Election[]>("/elections");
```

**Option B**: Create helper types for envelope
```typescript
// frontend/src/types/api.ts
export type ApiResponseType<T> = { success: boolean; data: T };

// Then use:
const response = await apiRequest<ApiResponseType<Election[]>>("/elections");
const elections = response.data || [];
```

**Recommendation**: Option A (auto-unwrap) is simpler and cleaner.

### Priority 3: Standardize Token Storage

**Recommended Approach**: Use backend-set cookies only
```typescript
// backend/src/routes/auth.ts - Set HttpOnly cookie
res.cookie('token', jwtToken, {
  httpOnly: true,      // Cannot be accessed from JS
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 86400000,    // 24 hours
});

// frontend/src/lib/api.ts - Automatically sent with credentials
const response = await fetch(`${API_BASE_URL}${endpoint}`, {
  ...config,
  credentials: "include",  // Sends cookies automatically
});
// No need to manually read/set token in localStorage

// frontend/src/middleware.ts
const token = request.cookies.get('token')?.value;  // Read from backend-set cookie
```

This is more secure because:
- JS can't access the token (HttpOnly)
- Token automatically sent with all requests
- No localStorage to manage
- Backend-controlled token lifetime

**If you must use localStorage** (less secure):
```typescript
// Standardize everything to "auth_token"
const token = localStorage.getItem("auth_token");
document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;

// backend/src/middleware/auth.ts - Read "auth_token" instead of "token"
const token = req.cookies.token || req.cookies.auth_token || /* ... */;
```

### Priority 4: Add Error Response Type Safety

```typescript
// frontend/src/lib/api.ts
interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  // ... existing code ...
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...config,
      credentials: "include",
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ApiErrorResponse;
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }
    
    // ... rest of code ...
  } catch (error) {
    throw error;
  }
}
```

### Priority 5: Add JWT Signature Verification

```typescript
// frontend/src/middleware.ts
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET!);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');

  if (isAdminPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, secret);
      const allowedRoles = ['super_admin', 'regional_admin', 'province_admin', 'district_official'];
      if (!allowedRoles.includes(payload.role as string)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (e) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ... rest of code ...
}
```

---

## ✅ Summary of Changes Needed

| Issue | Priority | Component | Fix |
|-------|----------|-----------|-----|
| SSE endpoint path | 🔴 | stream.ts, results/page.tsx | Align paths |
| SSE event name | 🔴 | useSSE.ts, stream.ts | Use `result_update` consistently |
| API response unwrapping | 🟡 | api.ts, results/page.tsx | Add auto-unwrap to apiRequest |
| Token storage | 🟡 | auth-context.tsx, api.ts, middleware.ts | Standardize on one method |
| Error response handling | 🟢 | api.ts | Type and unwrap errors |
| JWT verification | 🟢 | middleware.ts | Add signature verification |

---

## 🎯 Conclusion

The frontend-backend communication works in most happy paths but has **critical structural issues**:

1. **SSE is completely broken** - wrong endpoint and event names
2. **API response handling is inconsistent** - some pages handle correctly, others don't
3. **Token management is split** - localStorage and cookies are out of sync
4. **Type safety is compromised** - TypeScript types don't match actual responses

**Next Steps**:
1. **Immediately**: Fix SSE endpoint and event names (blocks live results)
2. **Soon**: Refactor apiRequest to auto-unwrap responses
3. **Soon**: Choose and standardize token storage strategy
4. **Later**: Add JWT verification for security
