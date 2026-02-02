-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "provinces_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provinceId" TEXT NOT NULL,
    "zoneNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "zoneDescription" TEXT NOT NULL,
    "amphoeList" TEXT NOT NULL,
    "voterCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "districts_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "passwordHash" TEXT,
    "citizenId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'voter',
    "scopeRegionId" TEXT,
    "scopeProvinceId" TEXT,
    "scopeDistrictId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_scopeRegionId_fkey" FOREIGN KEY ("scopeRegionId") REFERENCES "regions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_scopeProvinceId_fkey" FOREIGN KEY ("scopeProvinceId") REFERENCES "provinces" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_scopeDistrictId_fkey" FOREIGN KEY ("scopeDistrictId") REFERENCES "districts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "hasPartyList" BOOLEAN NOT NULL DEFAULT true,
    "hasConstituency" BOOLEAN NOT NULL DEFAULT true,
    "hasReferendum" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "partyNumber" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "parties_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "partyId" TEXT,
    "candidateNumber" INTEGER NOT NULL,
    "titleTh" TEXT NOT NULL,
    "firstNameTh" TEXT NOT NULL,
    "lastNameTh" TEXT NOT NULL,
    "titleEn" TEXT,
    "firstNameEn" TEXT,
    "lastNameEn" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "candidates_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "candidates_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "referendum_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionTh" TEXT NOT NULL,
    "questionEn" TEXT,
    "descriptionTh" TEXT,
    "descriptionEn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "referendum_questions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "ballotType" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "partyId" TEXT,
    "candidateId" TEXT,
    "referendumQuestionId" TEXT,
    "referendumAnswer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "votes_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "votes_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "votes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "votes_referendumQuestionId_fkey" FOREIGN KEY ("referendumQuestionId") REFERENCES "referendum_questions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vote_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "electionId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vote_batches_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vote_batches_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vote_batches_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vote_batches_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vote_batch_parties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL,
    CONSTRAINT "vote_batch_parties_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "vote_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vote_batch_candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL,
    CONSTRAINT "vote_batch_candidates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "vote_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vote_batch_referendums" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "approveCount" INTEGER NOT NULL DEFAULT 0,
    "disapproveCount" INTEGER NOT NULL DEFAULT 0,
    "abstainCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "vote_batch_referendums_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "vote_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE INDEX "provinces_regionId_idx" ON "provinces"("regionId");

-- CreateIndex
CREATE INDEX "districts_provinceId_idx" ON "districts"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "districts_provinceId_zoneNumber_key" ON "districts"("provinceId", "zoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_citizenId_key" ON "users"("citizenId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_scopeRegionId_idx" ON "users"("scopeRegionId");

-- CreateIndex
CREATE INDEX "users_scopeProvinceId_idx" ON "users"("scopeProvinceId");

-- CreateIndex
CREATE INDEX "users_scopeDistrictId_idx" ON "users"("scopeDistrictId");

-- CreateIndex
CREATE INDEX "elections_status_idx" ON "elections"("status");

-- CreateIndex
CREATE INDEX "parties_electionId_idx" ON "parties"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "parties_electionId_partyNumber_key" ON "parties"("electionId", "partyNumber");

-- CreateIndex
CREATE INDEX "candidates_electionId_idx" ON "candidates"("electionId");

-- CreateIndex
CREATE INDEX "candidates_districtId_idx" ON "candidates"("districtId");

-- CreateIndex
CREATE INDEX "candidates_partyId_idx" ON "candidates"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_electionId_districtId_candidateNumber_key" ON "candidates"("electionId", "districtId", "candidateNumber");

-- CreateIndex
CREATE INDEX "referendum_questions_electionId_idx" ON "referendum_questions"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "referendum_questions_electionId_questionNumber_key" ON "referendum_questions"("electionId", "questionNumber");

-- CreateIndex
CREATE INDEX "votes_electionId_idx" ON "votes"("electionId");

-- CreateIndex
CREATE INDEX "votes_ballotType_idx" ON "votes"("ballotType");

-- CreateIndex
CREATE INDEX "votes_partyId_idx" ON "votes"("partyId");

-- CreateIndex
CREATE INDEX "votes_candidateId_idx" ON "votes"("candidateId");

-- CreateIndex
CREATE INDEX "votes_referendumQuestionId_idx" ON "votes"("referendumQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_electionId_ballotType_voterHash_key" ON "votes"("electionId", "ballotType", "voterHash");

-- CreateIndex
CREATE UNIQUE INDEX "votes_electionId_ballotType_voterHash_referendumQuestionId_key" ON "votes"("electionId", "ballotType", "voterHash", "referendumQuestionId");

-- CreateIndex
CREATE INDEX "vote_batches_electionId_idx" ON "vote_batches"("electionId");

-- CreateIndex
CREATE INDEX "vote_batches_districtId_idx" ON "vote_batches"("districtId");

-- CreateIndex
CREATE INDEX "vote_batches_status_idx" ON "vote_batches"("status");

-- CreateIndex
CREATE INDEX "vote_batches_submittedById_idx" ON "vote_batches"("submittedById");

-- CreateIndex
CREATE UNIQUE INDEX "vote_batch_parties_batchId_partyId_key" ON "vote_batch_parties"("batchId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "vote_batch_candidates_batchId_candidateId_key" ON "vote_batch_candidates"("batchId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "vote_batch_referendums_batchId_questionId_key" ON "vote_batch_referendums"("batchId", "questionId");
