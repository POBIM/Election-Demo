# Backend API Endpoints Map - Complete Reference

**Last Updated:** 2024
**Backend URL:** `http://localhost:3001`
**Project:** Election Demo (Thai Election System)

---

## Table of Contents

1. [Response Format Overview](#response-format-overview)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Elections Endpoints](#elections-endpoints)
4. [Parties Endpoints](#parties-endpoints)
5. [Candidates Endpoints](#candidates-endpoints)
6. [Votes Endpoints](#votes-endpoints)
7. [Results Endpoints](#results-endpoints)
8. [Geography Endpoints](#geography-endpoints)
9. [Batch/Vote Submission Endpoints](#batchvote-submission-endpoints)
10. [Streaming Endpoints](#streaming-endpoints)
11. [Health Check Endpoint](#health-check-endpoint)
12. [Auth Requirements Summary](#auth-requirements-summary)

---

## Response Format Overview

### Success Response Format

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response Format (from explicit handlers)

```json
{
  "success": false,
  "error": "Error message"
}
```

### Error Response Format (from global error handler)

```json
{
  "ok": false,
  "error": "Error message"
}
```

**⚠️ IMPORTANT:** Response wrapper structure differs:
- Explicit handlers use `success` field (preferred)
- Global error handler uses `ok` field (fallback)
- Frontend should handle both patterns

---

## Authentication Endpoints

### POST /auth/voter/login

**Description:** Authenticate voter using 13-digit Thai Citizen ID

**Auth Required:** No

**Request Body:**
```json
{
  "citizenId": "1234567890123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "citizenId": "1234567890123",
      "name": "สมศักดิ์ รักชาติ",
      "role": "voter",
      "eligibleDistrictId": "district-id"
    },
    "thaidInfo": {
      "firstNameTh": "สมศักดิ์",
      "lastNameTh": "รักชาติ",
      "eligibleProvince": "กรุงเทพมหานคร"
    },
    "token": "eyJhbGc..."
  }
}
```

**Error Responses:**
- `400`: Invalid citizen ID format
- `400`: Citizen ID is required

---

### POST /auth/official/login

**Description:** Authenticate official/administrator using email and password

**Auth Required:** No

**Request Body:**
```json
{
  "email": "admin@election.go.th",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "admin@election.go.th",
      "name": "ผู้ดูแลระบบ",
      "role": "super_admin",
      "scope": {
        "regionId": null,
        "provinceId": null,
        "districtId": null
      }
    },
    "token": "eyJhbGc..."
  }
}
```

**Error Responses:**
- `400`: Email and password are required
- `401`: Invalid credentials

---

### GET /auth/me

**Description:** Get current authenticated user information

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "admin@election.go.th",
    "citizenId": null,
    "name": "ผู้ดูแลระบบ",
    "role": "super_admin",
    "scope": {
      "region": { "id": "...", "nameTh": "..." },
      "province": { "id": "...", "nameTh": "..." },
      "district": { "id": "...", "nameTh": "..." }
    }
  }
}
```

**Error Responses:**
- `401`: Authentication required
- `401`: Invalid or expired token
- `404`: User not found

---

### POST /auth/logout

**Description:** Logout current user (clears token cookie)

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out"
}
```

---

## Elections Endpoints

### GET /elections

**Description:** Get list of all elections, optionally filtered by status

**Auth Required:** No

**Query Parameters:**
- `status` (optional): Filter by status (DRAFT, OPEN, CLOSED, ARCHIVED)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "election-id",
      "name": "General Election 2027",
      "nameTh": "การเลือกตั้งทั่วไป พ.ศ. 2570",
      "description": "Parliamentary election",
      "status": "OPEN",
      "startDate": "2027-05-01T00:00:00Z",
      "endDate": "2027-05-01T00:00:00Z",
      "hasPartyList": true,
      "hasConstituency": true,
      "hasReferendum": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "_count": {
        "parties": 8,
        "candidates": 2000,
        "referendumQuestions": 0
      }
    }
  ]
}
```

---

### GET /elections/:id

**Description:** Get detailed information about a specific election

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "election-id",
    "name": "General Election 2027",
    "nameTh": "การเลือกตั้งทั่วไป พ.ศ. 2570",
    "description": "Parliamentary election",
    "status": "OPEN",
    "startDate": "2027-05-01T00:00:00Z",
    "endDate": "2027-05-01T00:00:00Z",
    "hasPartyList": true,
    "hasConstituency": true,
    "hasReferendum": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "parties": [
      {
        "id": "party-id",
        "partyNumber": 1,
        "name": "Party Name",
        "nameTh": "พรรคชื่อพรรค",
        "abbreviation": "PN",
        "color": "#FF0000"
      }
    ],
    "referendumQuestions": [],
    "_count": {
      "candidates": 2000,
      "votes": 150000
    }
  }
}
```

**Error Responses:**
- `404`: Election not found

---

### POST /elections

**Description:** Create new election (Super Admin only)

**Auth Required:** Yes (super_admin role)

**Request Body:**
```json
{
  "name": "General Election 2028",
  "nameTh": "การเลือกตั้งทั่วไป พ.ศ. 2571",
  "description": "Parliamentary election",
  "startDate": "2028-05-01",
  "endDate": "2028-05-01",
  "hasPartyList": true,
  "hasConstituency": true,
  "hasReferendum": false
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "election-id",
    "name": "General Election 2028",
    "nameTh": "การเลือกตั้งทั่วไป พ.ศ. 2571",
    "description": "Parliamentary election",
    "status": "DRAFT",
    "startDate": "2028-05-01T00:00:00Z",
    "endDate": "2028-05-01T00:00:00Z",
    "hasPartyList": true,
    "hasConstituency": true,
    "hasReferendum": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### PATCH /elections/:id

**Description:** Update election details (Super Admin only)

**Auth Required:** Yes (super_admin role)

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "nameTh": "ชื่อใหม่",
  "description": "Updated description",
  "startDate": "2028-05-02",
  "endDate": "2028-05-02",
  "hasPartyList": false,
  "hasConstituency": true,
  "hasReferendum": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "election-id",
    "name": "Updated Name",
    "nameTh": "ชื่อใหม่",
    ...
  }
}
```

---

### PATCH /elections/:id/status

**Description:** Change election status

**Auth Required:** Yes (election:manage_status permission)

**Valid Statuses:** DRAFT, OPEN, CLOSED, ARCHIVED

**Request Body:**
```json
{
  "status": "OPEN"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "election-id",
    "status": "OPEN",
    ...
  }
}
```

**Error Responses:**
- `400`: Invalid status

---

### DELETE /elections/:id

**Description:** Delete election (Super Admin only, DRAFT status only)

**Auth Required:** Yes (super_admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Election deleted"
}
```

**Error Responses:**
- `400`: Can only delete elections in DRAFT status
- `404`: Election not found

---

## Parties Endpoints

### GET /parties

**Description:** Get list of parties, optionally filtered by election

**Auth Required:** No

**Query Parameters:**
- `electionId` (optional): Filter by election ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "party-id",
      "electionId": "election-id",
      "partyNumber": 1,
      "name": "Pheu Thai Party",
      "nameTh": "พรรคเพื่อไทย",
      "abbreviation": "PTP",
      "color": "#FF0000",
      "logoUrl": null,
      "description": "Main party description",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /parties/:id

**Description:** Get specific party details

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "party-id",
    "electionId": "election-id",
    "partyNumber": 1,
    "name": "Pheu Thai Party",
    "nameTh": "พรรคเพื่อไทย",
    "abbreviation": "PTP",
    "color": "#FF0000",
    "logoUrl": null,
    "description": "Main party description",
    "election": {
      "id": "election-id",
      "name": "General Election 2027",
      "nameTh": "การเลือกตั้งทั่วไป พ.ศ. 2570",
      ...
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404`: Party not found

---

### POST /parties

**Description:** Create new party (Super Admin only)

**Auth Required:** Yes (super_admin role)

**Request Body:**
```json
{
  "electionId": "election-id",
  "partyNumber": 9,
  "name": "New Party",
  "nameTh": "พรรคใหม่",
  "abbreviation": "NP",
  "color": "#FF5733",
  "logoUrl": "https://example.com/logo.png",
  "description": "Party description"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "party-id",
    "electionId": "election-id",
    "partyNumber": 9,
    "name": "New Party",
    "nameTh": "พรรคใหม่",
    "abbreviation": "NP",
    "color": "#FF5733",
    "logoUrl": "https://example.com/logo.png",
    "description": "Party description",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### PATCH /parties/:id

**Description:** Update party details (Super Admin only)

**Auth Required:** Yes (super_admin role)

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "nameTh": "ชื่อใหม่",
  "abbreviation": "UN",
  "color": "#00FF00",
  "logoUrl": "https://example.com/new-logo.png",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "party-id",
    "name": "Updated Name",
    ...
  }
}
```

---

### DELETE /parties/:id

**Description:** Delete party (Super Admin only)

**Auth Required:** Yes (super_admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Party deleted"
}
```

---

## Candidates Endpoints

### GET /candidates

**Description:** Get list of candidates with optional filters

**Auth Required:** No

**Query Parameters:**
- `electionId` (optional): Filter by election ID
- `districtId` (optional): Filter by district ID
- `partyId` (optional): Filter by party ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "candidate-id",
      "electionId": "election-id",
      "districtId": "district-id",
      "partyId": "party-id",
      "candidateNumber": 1,
      "titleTh": "นาย",
      "firstNameTh": "สมศักดิ์",
      "lastNameTh": "รักชาติ",
      "titleEn": "Mr.",
      "firstNameEn": "Somsak",
      "lastNameEn": "Rakchat",
      "photoUrl": "https://example.com/photo.jpg",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "party": {
        "id": "party-id",
        "name": "Pheu Thai",
        "nameTh": "พรรคเพื่อไทย",
        ...
      },
      "district": {
        "id": "district-id",
        "nameTh": "เขตลาดพร้าว",
        "province": {
          "id": "province-id",
          "nameTh": "กรุงเทพมหานคร"
        }
      }
    }
  ]
}
```

---

### GET /candidates/:id

**Description:** Get specific candidate details

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "candidate-id",
    "electionId": "election-id",
    "districtId": "district-id",
    "partyId": "party-id",
    "candidateNumber": 1,
    "titleTh": "นาย",
    "firstNameTh": "สมศักดิ์",
    "lastNameTh": "รักชาติ",
    "titleEn": "Mr.",
    "firstNameEn": "Somsak",
    "lastNameEn": "Rakchat",
    "photoUrl": "https://example.com/photo.jpg",
    "party": { ... },
    "district": { ... },
    "election": { ... },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `404`: Candidate not found

---

### POST /candidates

**Description:** Create new candidate

**Auth Required:** Yes (candidate:create permission)

**Request Body:**
```json
{
  "electionId": "election-id",
  "districtId": "district-id",
  "partyId": "party-id",
  "candidateNumber": 1,
  "titleTh": "นาย",
  "firstNameTh": "สมศักดิ์",
  "lastNameTh": "รักชาติ",
  "titleEn": "Mr.",
  "firstNameEn": "Somsak",
  "lastNameEn": "Rakchat",
  "photoUrl": "https://example.com/photo.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "candidate-id",
    "electionId": "election-id",
    ...
  }
}
```

---

### PATCH /candidates/:id

**Description:** Update candidate details

**Auth Required:** Yes (candidate:update permission)

**Request Body:** (all fields optional)
```json
{
  "partyId": "party-id",
  "titleTh": "นายแพทย์",
  "firstNameTh": "สมศักดิ์",
  "lastNameTh": "รักชาติ",
  "titleEn": "Dr.",
  "firstNameEn": "Somsak",
  "lastNameEn": "Rakchat",
  "photoUrl": "https://example.com/new-photo.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "candidate-id",
    ...
  }
}
```

---

### DELETE /candidates/:id

**Description:** Delete candidate

**Auth Required:** Yes (candidate:delete permission)

**Response (200):**
```json
{
  "success": true,
  "message": "Candidate deleted"
}
```

---

## Votes Endpoints

### POST /votes/cast

**Description:** Cast vote(s) in an election

**Auth Required:** Yes (voter login)

**Request Body:**
```json
{
  "electionId": "election-id",
  "partyVote": {
    "partyId": "party-id"
  },
  "constituencyVote": {
    "candidateId": "candidate-id"
  },
  "referendumVotes": [
    {
      "questionId": "question-id",
      "answer": "APPROVE"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "message": "Vote cast successfully",
    "receipts": [
      {
        "ballotType": "PARTY_LIST",
        "confirmationCode": "A1B2C3D4"
      },
      {
        "ballotType": "CONSTITUENCY",
        "confirmationCode": "E5F6G7H8"
      },
      {
        "ballotType": "REFERENDUM",
        "confirmationCode": "I9J0K1L2"
      }
    ],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Voter verification required
- `400`: Election is not open for voting
- `404`: Election not found
- `409`: You have already voted in this election

---

### GET /votes/status/:electionId

**Description:** Check if voter has already voted in an election

**Auth Required:** Yes (voter login)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hasVoted": true,
    "ballotTypes": ["PARTY_LIST", "CONSTITUENCY"],
    "votedAt": "2024-01-01T12:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Voter verification required

---

## Results Endpoints

### GET /results/:electionId

**Description:** Get aggregated election results

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "electionId": "election-id",
    "electionName": "การเลือกตั้งทั่วไป พ.ศ. 2570",
    "status": "CLOSED",
    "lastUpdated": "2024-01-01T12:00:00Z",
    "totalEligibleVoters": 50000000,
    "totalVotesCast": 30000000,
    "turnoutPercentage": 60.0,
    "partyListResults": [
      {
        "partyId": "party-id",
        "partyName": "Pheu Thai",
        "partyNameTh": "พรรคเพื่อไทย",
        "partyColor": "#FF0000",
        "voteCount": 8000000,
        "percentage": 26.67
      }
    ],
    "referendumResults": [
      {
        "questionId": "question-id",
        "questionText": "คำถามประชามติ",
        "approveCount": 15000000,
        "disapproveCount": 10000000,
        "abstainCount": 5000000,
        "approvePercentage": 50.0,
        "disapprovePercentage": 33.33,
        "result": "APPROVED"
      }
    ]
  }
}
```

**Error Responses:**
- `404`: Election not found

---

### GET /results/:electionId/by-district

**Description:** Get constituency results by district

**Auth Required:** No

**Query Parameters:**
- `provinceId` (optional): Filter by province

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "districtId": "district-id",
      "districtName": "เขตลาดพร้าว",
      "provinceName": "กรุงเทพมหานคร",
      "voterCount": 120000,
      "totalVotes": 72000,
      "turnoutPercentage": 60.0,
      "candidates": [
        {
          "candidateId": "candidate-id",
          "candidateName": "นาย สมศักดิ์ รักชาติ",
          "partyName": "พรรคเพื่อไทย",
          "partyColor": "#FF0000",
          "voteCount": 15000,
          "percentage": 20.83,
          "isWinner": true
        }
      ],
      "winner": {
        "candidateId": "candidate-id",
        "candidateName": "นาย สมศักดิ์ รักชาติ",
        "partyName": "พรรคเพื่อไทย",
        "partyColor": "#FF0000",
        "voteCount": 15000,
        "percentage": 20.83
      }
    }
  ]
}
```

---

## Geography Endpoints

### GET /geo/regions

**Description:** Get all regions

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "region-id",
      "name": "Northern",
      "nameTh": "ภาคเหนือ",
      "code": "1",
      "provinceCount": 9
    }
  ]
}
```

---

### GET /geo/provinces

**Description:** Get provinces, optionally filtered by region

**Auth Required:** No

**Query Parameters:**
- `regionId` (optional): Filter by region ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "province-id",
      "regionId": "region-id",
      "name": "Bangkok",
      "nameTh": "กรุงเทพมหานคร",
      "code": "10",
      "districtCount": 50,
      "region": {
        "id": "region-id",
        "name": "Central",
        "nameTh": "ภาคกลาง",
        ...
      }
    }
  ]
}
```

---

### GET /geo/provinces/:id

**Description:** Get specific province with districts

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "province-id",
    "regionId": "region-id",
    "name": "Bangkok",
    "nameTh": "กรุงเทพมหานคร",
    "code": "10",
    "region": { ... },
    "districts": [
      {
        "id": "district-id",
        "nameTh": "เขตลาดพร้าว",
        "zoneNumber": 1,
        "voterCount": 120000
      }
    ]
  }
}
```

**Error Responses:**
- `404`: Province not found

---

### GET /geo/districts

**Description:** Get districts with optional filters

**Auth Required:** No

**Query Parameters:**
- `provinceId` (optional): Filter by province ID
- `regionId` (optional): Filter by region ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "district-id",
      "provinceId": "province-id",
      "nameTh": "เขตลาดพร้าว",
      "zoneNumber": 1,
      "voterCount": 120000,
      "province": {
        "id": "province-id",
        "nameTh": "กรุงเทพมหานคร",
        "region": { ... }
      }
    }
  ]
}
```

---

### GET /geo/districts/:id

**Description:** Get specific district details

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "district-id",
    "provinceId": "province-id",
    "nameTh": "เขตลาดพร้าว",
    "zoneNumber": 1,
    "voterCount": 120000,
    "province": {
      "id": "province-id",
      "nameTh": "กรุงเทพมหานคร",
      "region": { ... }
    }
  }
}
```

**Error Responses:**
- `404`: District not found

---

### GET /geo/stats

**Description:** Get geographic statistics

**Auth Required:** No

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRegions": 5,
    "totalProvinces": 77,
    "totalDistricts": 400,
    "totalVoters": 50000000
  }
}
```

---

## Batch/Vote Submission Endpoints

### GET /batches

**Description:** Get list of vote batches (with role-based filtering)

**Auth Required:** Yes (district_official, province_admin, regional_admin, or super_admin)

**Query Parameters:**
- `electionId` (optional): Filter by election
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED)
- `districtId` (optional): Filter by district (super_admin only)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "batch-id",
      "electionId": "election-id",
      "districtId": "district-id",
      "status": "PENDING",
      "totalVotes": 5000,
      "notes": "Batch from district office",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z",
      "election": {
        "id": "election-id",
        "nameTh": "การเลือกตั้งทั่วไป พ.ศ. 2570"
      },
      "district": {
        "id": "district-id",
        "nameTh": "เขตลาดพร้าว",
        "province": {
          "nameTh": "กรุงเทพมหานคร"
        }
      },
      "submittedBy": {
        "id": "user-id",
        "name": "เจ้าหน้าที่เขต"
      },
      "approvedBy": null
    }
  ]
}
```

---

### GET /batches/:id

**Description:** Get specific batch details with vote breakdowns

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "batch-id",
    "electionId": "election-id",
    "districtId": "district-id",
    "status": "PENDING",
    "totalVotes": 5000,
    "notes": "Batch from district office",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z",
    "election": { ... },
    "district": { ... },
    "submittedBy": { ... },
    "approvedBy": null,
    "partyVotes": [
      {
        "id": "party-vote-id",
        "batchId": "batch-id",
        "partyId": "party-id",
        "voteCount": 2000
      }
    ],
    "constituencyVotes": [
      {
        "id": "constituency-vote-id",
        "batchId": "batch-id",
        "candidateId": "candidate-id",
        "voteCount": 3000
      }
    ],
    "referendumVotes": []
  }
}
```

**Error Responses:**
- `404`: Batch not found

---

### POST /batches

**Description:** Submit new batch of votes (District Officials only)

**Auth Required:** Yes (district_official role, must be submitting for their district)

**Request Body:**
```json
{
  "electionId": "election-id",
  "districtId": "district-id",
  "partyVotes": [
    {
      "partyId": "party-id",
      "voteCount": 2000
    }
  ],
  "constituencyVotes": [
    {
      "candidateId": "candidate-id",
      "voteCount": 3000
    }
  ],
  "referendumVotes": [
    {
      "questionId": "question-id",
      "approveCount": 1500,
      "disapproveCount": 1200,
      "abstainCount": 300
    }
  ],
  "notes": "Batch from district office"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "batch-id",
    "electionId": "election-id",
    "districtId": "district-id",
    "status": "PENDING",
    "totalVotes": 5000,
    "notes": "Batch from district office",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z",
    "district": { ... },
    "partyVotes": [ ... ],
    "constituencyVotes": [ ... ],
    "referendumVotes": [ ... ]
  },
  "message": "ส่งข้อมูลผลคะแนนเรียบร้อยแล้ว รอการอนุมัติ"
}
```

**Error Responses:**
- `400`: ไม่มีสิทธิ์เข้าถึงเขตนี้ (Access denied)
- `400`: สามารถส่งข้อมูลได้หลังปิดคูหาเลือกตั้งเท่านั้น (Can only submit after election closes)
- `404`: ไม่พบการเลือกตั้ง (Election not found)
- `404`: ไม่พบเขตเลือกตั้ง (District not found)
- `409`: มีข้อมูลที่รอการอนุมัติอยู่แล้ว (Pending batch already exists)

---

### POST /batches/:id/approve

**Description:** Approve batch (Province Admin, Regional Admin, or Super Admin)

**Auth Required:** Yes (appropriate admin role for jurisdiction)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "batch-id",
    "status": "APPROVED",
    "approvedById": "user-id",
    ...
  },
  "message": "อนุมัติข้อมูลผลคะแนนเรียบร้อยแล้ว"
}
```

**Error Responses:**
- `400`: ข้อมูลนี้ได้รับการดำเนินการแล้ว (Already processed)
- `403`: ไม่มีสิทธิ์อนุมัติข้อมูลเขตนี้ (Permission denied)
- `404`: ไม่พบข้อมูล (Batch not found)

---

### POST /batches/:id/reject

**Description:** Reject batch with reason

**Auth Required:** Yes (appropriate admin role for jurisdiction)

**Request Body:**
```json
{
  "reason": "ข้อมูลไม่ถูกต้อง - มีหลักฐานการโกงคะแนน"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "batch-id",
    "status": "REJECTED",
    "rejectionReason": "ข้อมูลไม่ถูกต้อง - มีหลักฐานการโกงคะแนน",
    "approvedById": "user-id",
    ...
  },
  "message": "ปฏิเสธข้อมูลผลคะแนนแล้ว"
}
```

**Error Responses:**
- `400`: กรุณาระบุเหตุผลในการปฏิเสธ (Reason required)
- `400`: ข้อมูลนี้ได้รับการดำเนินการแล้ว (Already processed)
- `403`: ไม่มีสิทธิ์ปฏิเสธข้อมูลเขตนี้ (Permission denied)
- `404`: ไม่พบข้อมูล (Batch not found)

---

### DELETE /batches/:id

**Description:** Delete batch (only if PENDING status)

**Auth Required:** Yes (batch submitter or super_admin)

**Response (200):**
```json
{
  "success": true,
  "message": "ลบข้อมูลเรียบร้อยแล้ว"
}
```

**Error Responses:**
- `400`: ไม่สามารถลบข้อมูลที่ดำเนินการแล้ว (Cannot delete processed batch)
- `403`: ไม่มีสิทธิ์ลบข้อมูลนี้ (Permission denied)
- `404`: ไม่พบข้อมูล (Batch not found)

---

## Streaming Endpoints

### GET /stream/elections/:electionId/results

**Description:** Real-time election results via Server-Sent Events (SSE)

**Auth Required:** No

**Connection Type:** WebSocket/Server-Sent Events

**Response (Streaming):**

Initial snapshot event:
```
event: snapshot
data: {
  "timestamp": "2024-01-01T12:00:00Z",
  "totalVotes": 150000,
  "partyResults": [
    {
      "partyId": "party-id",
      "partyName": "พรรคเพื่อไทย",
      "partyColor": "#FF0000",
      "voteCount": 50000
    }
  ]
}
```

Subsequent update events:
```
data: {
  "event": "vote_update",
  "timestamp": "2024-01-01T12:01:00Z",
  "totalVotes": 150100,
  "partyResults": [...]
}
```

Heartbeat (every 30 seconds):
```
: heartbeat
```

**Connection Closes:** When client disconnects

---

## Health Check Endpoint

### GET /health

**Description:** Health check endpoint for monitoring

**Auth Required:** No

**Response (200):**
```json
{
  "ok": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Auth Requirements Summary

### Public Endpoints (No Auth Required)

- `GET /health`
- `GET /elections`
- `GET /elections/:id`
- `GET /parties`
- `GET /parties/:id`
- `GET /candidates`
- `GET /candidates/:id`
- `GET /results/:electionId`
- `GET /results/:electionId/by-district`
- `GET /geo/regions`
- `GET /geo/provinces`
- `GET /geo/provinces/:id`
- `GET /geo/districts`
- `GET /geo/districts/:id`
- `GET /geo/stats`
- `GET /stream/elections/:electionId/results`
- `POST /auth/voter/login`
- `POST /auth/official/login`
- `POST /auth/logout`

### Voter Auth Required

- `POST /votes/cast` (authenticated voter)
- `GET /votes/status/:electionId` (authenticated voter)

### Official Auth Required

- `GET /auth/me` (any authenticated user)
- `GET /batches` (district_official, province_admin, regional_admin, super_admin)
- `GET /batches/:id` (any authenticated user)
- `POST /batches` (district_official role)
- `POST /batches/:id/approve` (province_admin, regional_admin, super_admin)
- `POST /batches/:id/reject` (province_admin, regional_admin, super_admin)
- `DELETE /batches/:id` (batch submitter or super_admin)

### Super Admin Only

- `POST /elections` (super_admin)
- `PATCH /elections/:id` (super_admin)
- `DELETE /elections/:id` (super_admin)
- `POST /parties` (super_admin)
- `PATCH /parties/:id` (super_admin)
- `DELETE /parties/:id` (super_admin)

### Permission-Based

- `PATCH /elections/:id/status` (election:manage_status)
- `POST /candidates` (candidate:create)
- `PATCH /candidates/:id` (candidate:update)
- `DELETE /candidates/:id` (candidate:delete)

---

## Response Wrapper Differences

⚠️ **IMPORTANT INCONSISTENCY:**

The backend has **two different response wrapper patterns**:

### Pattern 1: Explicit Handlers (Most endpoints)
```json
{
  "success": true,
  "data": { ... }
}
```

**Error variant:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### Pattern 2: Global Error Handler (Fallback)
```json
{
  "ok": false,
  "error": "Error message"
}
```

**Frontend implications:**
- Handle both `success` and `ok` fields
- Some errors may come with `success: false` while unhandled errors may come with `ok: false`
- Health check endpoint uses `ok` field instead of `success`

---

## Token Extraction

The backend extracts JWT tokens in this order:
1. Cookie: `token`
2. Header: `Authorization: Bearer <token>`

**Frontend should implement:**
```javascript
// Option 1: Send via Cookie (automatically included in requests if httpOnly: false)
axios.defaults.withCredentials = true;

// Option 2: Send via Authorization Header
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

---

## Common Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Authentication required | Missing or invalid token |
| 401 | Invalid or expired token | Token expired or tampered with |
| 403 | Insufficient role permissions | User role doesn't have permission |
| 403 | Insufficient permissions | User lacks required permission |
| 403 | Access denied for this district | User scope doesn't cover district |
| 404 | Not found | Resource doesn't exist |
| 409 | Conflict | Resource already exists or invalid state |

---

## Data Type Notes

### Citizen ID
- 13 digits
- Used for voter authentication
- Format: "1234567890123"

### Confirmation Codes
- 8 characters (hex uppercase)
- Example: "A1B2C3D4"

### Ballot Types
- `PARTY_LIST`: Vote for party
- `CONSTITUENCY`: Vote for candidate
- `REFERENDUM`: Vote on referendum question

### Referendum Answers
- `APPROVE`: Yes/Approve
- `DISAPPROVE`: No/Disapprove
- `ABSTAIN`: Abstain from voting

### Batch Status
- `PENDING`: Waiting for approval
- `APPROVED`: Approved and counted
- `REJECTED`: Rejected by admin

### Election Status
- `DRAFT`: Being prepared
- `OPEN`: Voting in progress
- `CLOSED`: Voting finished
- `ARCHIVED`: Historical election

### User Roles
- `voter`: Regular voter
- `district_official`: Works at polling station
- `province_admin`: Manages province
- `regional_admin`: Manages region
- `super_admin`: System administrator

---

## Rate Limiting

No explicit rate limiting mentioned in code. Recommend implementing at deployment stage.

---

## CORS Configuration

- **Allowed Origin:** `http://localhost:3000`
- **Credentials:** Enabled
- **Methods:** Standard REST methods (GET, POST, PATCH, DELETE)
- **Headers:** Application/JSON

Update CORS origin in `backend/src/app.ts` for production deployment.

