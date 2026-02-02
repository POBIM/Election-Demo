# Backend API Quick Reference

## All Endpoints Summary Table

| HTTP Method | Path | Auth | Role | Description |
|------------|------|------|------|-------------|
| **HEALTH & AUTH** |
| GET | `/health` | ❌ | - | Health check |
| POST | `/auth/voter/login` | ❌ | - | Voter login (13-digit ID) |
| POST | `/auth/official/login` | ❌ | - | Official login (email/password) |
| GET | `/auth/me` | ✅ | any | Get current user info |
| POST | `/auth/logout` | ❌ | - | Logout (clear cookie) |
| **ELECTIONS** |
| GET | `/elections` | ❌ | - | List all elections |
| GET | `/elections/:id` | ❌ | - | Get election details |
| POST | `/elections` | ✅ | super_admin | Create election |
| PATCH | `/elections/:id` | ✅ | super_admin | Update election |
| PATCH | `/elections/:id/status` | ✅ | manage_status | Change status |
| DELETE | `/elections/:id` | ✅ | super_admin | Delete election |
| **PARTIES** |
| GET | `/parties` | ❌ | - | List all parties |
| GET | `/parties/:id` | ❌ | - | Get party details |
| POST | `/parties` | ✅ | super_admin | Create party |
| PATCH | `/parties/:id` | ✅ | super_admin | Update party |
| DELETE | `/parties/:id` | ✅ | super_admin | Delete party |
| **CANDIDATES** |
| GET | `/candidates` | ❌ | - | List candidates |
| GET | `/candidates/:id` | ❌ | - | Get candidate details |
| POST | `/candidates` | ✅ | candidate:create | Create candidate |
| PATCH | `/candidates/:id` | ✅ | candidate:update | Update candidate |
| DELETE | `/candidates/:id` | ✅ | candidate:delete | Delete candidate |
| **VOTES** |
| POST | `/votes/cast` | ✅ | voter | Cast vote(s) |
| GET | `/votes/status/:electionId` | ✅ | voter | Check if voted |
| **RESULTS** |
| GET | `/results/:electionId` | ❌ | - | Get aggregate results |
| GET | `/results/:electionId/by-district` | ❌ | - | Get district results |
| **GEOGRAPHY** |
| GET | `/geo/regions` | ❌ | - | List regions |
| GET | `/geo/provinces` | ❌ | - | List provinces |
| GET | `/geo/provinces/:id` | ❌ | - | Get province details |
| GET | `/geo/districts` | ❌ | - | List districts |
| GET | `/geo/districts/:id` | ❌ | - | Get district details |
| GET | `/geo/stats` | ❌ | - | Geographic statistics |
| **BATCHES** |
| GET | `/batches` | ✅ | official roles | List batches |
| GET | `/batches/:id` | ✅ | any | Get batch details |
| POST | `/batches` | ✅ | district_official | Submit batch |
| POST | `/batches/:id/approve` | ✅ | admin roles | Approve batch |
| POST | `/batches/:id/reject` | ✅ | admin roles | Reject batch |
| DELETE | `/batches/:id` | ✅ | submitter/super_admin | Delete batch |
| **STREAMING** |
| GET | `/stream/elections/:electionId/results` | ❌ | - | Real-time results (SSE) |

**Legend:**
- ✅ = Auth required
- ❌ = No auth
- `manage_status`, `candidate:create`, etc. = Permission-based

---

## Response Format Cheat Sheet

### Success Response (Most endpoints)
```json
{
  "success": true,
  "data": { /* actual data */ }
}
```

### Error Response (Explicit handlers)
```json
{
  "success": false,
  "error": "Error message"
}
```

### Error Response (Global handler)
```json
{
  "ok": false,
  "error": "Error message"
}
```

### Health Check
```json
{
  "ok": true,
  "timestamp": "ISO8601"
}
```

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH, POST logout) |
| 201 | Created (POST for create operations) |
| 400 | Bad request / Invalid input |
| 401 | Authentication required / Invalid token |
| 403 | Permission denied |
| 404 | Resource not found |
| 409 | Conflict (already exists, invalid state) |

---

## Token Handling

**Extraction order:**
1. Cookie: `token`
2. Header: `Authorization: Bearer TOKEN`

**Frontend setup:**
```javascript
// Via cookie (automatic with httpOnly: false)
axios.defaults.withCredentials = true;

// Via header (manual)
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

---

## User Roles Hierarchy

```
super_admin
├── Can access everything
└── Needed for: elections, parties, super admin endpoints

regional_admin
├── Scoped to region
└── Can: approve batches in region, manage candidates in region

province_admin
├── Scoped to province
└── Can: approve batches in province, manage candidates in province

district_official
├── Scoped to district
└── Can: submit batches, manage own district data

voter
└── Can: vote, check vote status
```

---

## Key Data Fields

### Citizen ID (Voter Login)
- 13 digits: `1234567890123`

### Confirmation Code (Vote Receipt)
- 8 chars hex: `A1B2C3D4`

### Ballot Types
- `PARTY_LIST` - Party vote
- `CONSTITUENCY` - Candidate vote
- `REFERENDUM` - Referendum vote

### Referendum Answers
- `APPROVE` - Yes/In favor
- `DISAPPROVE` - No/Against
- `ABSTAIN` - No opinion

### Batch Status
- `PENDING` - Awaiting approval
- `APPROVED` - Counted
- `REJECTED` - Denied

### Election Status
- `DRAFT` - Being prepared
- `OPEN` - Voting active
- `CLOSED` - Voting ended
- `ARCHIVED` - Historical

---

## Frontend/Backend Mismatch Checks

✅ **Already verified in this mapping:**

1. **Response wrapper inconsistency**
   - Most use `success` field
   - Error handler uses `ok` field
   - Health check uses `ok` field
   - Frontend should handle both

2. **Auth token extraction**
   - Supports both cookie and header
   - Cookie checked first
   - Both methods work

3. **Role-based access**
   - Scope filtering implemented for officials
   - District/Province/Region hierarchy enforced
   - Super admin bypasses scope checks

4. **Batch submission workflow**
   - Must be CLOSED election to submit
   - Can only submit for own district (for district_official)
   - Status transitions: PENDING → APPROVED/REJECTED
   - Cannot delete after approval

5. **Vote casting**
   - Only when election OPEN
   - One vote per citizen per election
   - Creates hashed voter ID (prevents double voting)
   - Returns confirmation codes

---

## Database Relationships

```
Election
├── Party (1:N)
├── Candidate (1:N)
│   ├── Party (N:1)
│   └── District (N:1)
├── ReferendumQuestion (1:N)
├── Vote (1:N)
│   ├── Party (N:1, optional)
│   ├── Candidate (N:1, optional)
│   └── ReferendumQuestion (N:1, optional)
└── VoteBatch (1:N)
    ├── BatchPartyVote (1:N)
    ├── BatchConstituencyVote (1:N)
    └── BatchReferendumVote (1:N)

Region (1:N) Province (1:N) District
```

---

## Permissions Matrix

| Permission | Super Admin | Regional Admin | Province Admin | District Official |
|-----------|:-----------:|:--------------:|:--------------:|:-----------------:|
| election:manage_status | ✅ | ❌ | ❌ | ❌ |
| candidate:create | ✅ | ✅* | ✅* | ❌ |
| candidate:update | ✅ | ✅* | ✅* | ❌ |
| candidate:delete | ✅ | ✅* | ✅* | ❌ |
| batch:submit | ❌ | ❌ | ❌ | ✅ |
| batch:approve | ✅ | ✅** | ✅*** | ❌ |
| batch:reject | ✅ | ✅** | ✅*** | ❌ |

*Scoped to their region/province
**Scoped to their region
***Scoped to their province

---

## Common API Flows

### Voter Voting Flow
```
POST /auth/voter/login
  ↓
GET /elections (pick election)
  ↓
GET /candidates?electionId=X (view candidates)
  ↓
POST /votes/cast (submit vote)
  ↓
GET /votes/status/:electionId (verify vote)
```

### Official Batch Submission Flow
```
POST /auth/official/login
  ↓
GET /elections (pick election)
  ↓
POST /batches (submit batch)
  ↓
GET /batches/:id (verify submission)
  ↓
(Admin reviews and approves)
```

### Results Viewing Flow
```
GET /elections (pick election)
  ↓
GET /results/:electionId (view aggregates)
  ↓
GET /results/:electionId/by-district (view district breakdown)
  ↓
GET /stream/elections/:electionId/results (real-time updates)
```

---

## Error Handling Pattern

Every endpoint returns errors in one of these patterns:

**Pattern 1: Explicit handlers (preferred)**
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

**Pattern 2: Global error handler (fallback)**
```json
{
  "ok": false,
  "error": "Error message"
}
```

**Frontend should:**
```javascript
if (response.data?.success === false) {
  // Handle explicit error
} else if (response.data?.ok === false) {
  // Handle global error
} else {
  // Success
}
```

---

## Deployment Notes

**CORS Configuration** (in `backend/src/app.ts`):
```javascript
cors({
  origin: 'http://localhost:3000', // UPDATE FOR PRODUCTION
  credentials: true
})
```

**JWT Configuration** (in `backend/src/middleware/auth.ts`):
- Secret: `JWT_SECRET` env var (default: 'dev-secret')
- Expires: `JWT_EXPIRES_IN` env var (default: '7d')

**Database**:
- SQLite by default (Prisma ORM)
- Location: `backend/prisma/dev.db`

**Vote Salt** (in `backend/src/routes/votes.ts`):
- `ELECTION_VOTE_SALT` env var (default: 'default-salt')
- Used for voter hash generation

---

## Testing Credentials

### Voter Login
- Citizen ID: `1234567890123` (or any 13-digit number)
- No password needed

### Official Logins
| Email | Password | Role |
|-------|----------|------|
| admin@election.go.th | admin123 | super_admin |
| regional.bkk@election.go.th | regional123 | regional_admin |
| province.bkk@election.go.th | province123 | province_admin |
| district1.bkk@election.go.th | district123 | district_official |

---

## Performance Notes

- No pagination implemented on list endpoints
- Consider adding limit/offset for large datasets
- SSE streaming supports multiple concurrent clients
- Vote deduplication via hashed citizen ID + election ID

---

## Security Considerations

⚠️ **Issues noted in code:**

1. **Password hashing**: Uses SHA256 (demo-only)
   - Should use bcryptjs for production

2. **CORS origin**: Hardcoded to localhost:3000
   - Must be updated for production

3. **JWT secret**: Defaults to 'dev-secret'
   - Must use strong secret in production

4. **No rate limiting**: Implement at deployment

5. **No input validation library**: Uses basic checks
   - Consider zod/joi for production

---

## Future Improvements

- [ ] Pagination on list endpoints
- [ ] Input validation (zod/joi)
- [ ] Rate limiting
- [ ] Request logging
- [ ] Password reset flow
- [ ] Two-factor authentication for officials
- [ ] Audit logging for batch approvals
- [ ] Encrypted vote transmission
- [ ] Multiple authentication methods

