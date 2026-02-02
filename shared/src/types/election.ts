import type { TimestampFields } from './index.js';

// Election Status
export type ElectionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

// Ballot Types
export type BallotType = 'PARTY_LIST' | 'CONSTITUENCY' | 'REFERENDUM';

// Election
export interface Election extends TimestampFields {
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

export interface CreateElectionRequest {
  name: string;
  nameTh: string;
  description?: string;
  startDate: string;
  endDate: string;
  hasPartyList: boolean;
  hasConstituency: boolean;
  hasReferendum: boolean;
}

export interface UpdateElectionRequest extends Partial<CreateElectionRequest> {
  status?: ElectionStatus;
}

// Party (for Party List voting)
export interface Party extends TimestampFields {
  id: string;
  electionId: string;
  name: string;
  nameTh: string;
  abbreviation: string;
  color: string;
  logoUrl?: string;
  partyNumber: number;
  description?: string;
}

export interface CreatePartyRequest {
  electionId: string;
  name: string;
  nameTh: string;
  abbreviation: string;
  color: string;
  logoUrl?: string;
  partyNumber: number;
  description?: string;
}

// Candidate (for Constituency voting)
export interface Candidate extends TimestampFields {
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
  party?: Party;
}

export interface CreateCandidateRequest {
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

// Referendum Question
export interface ReferendumQuestion extends TimestampFields {
  id: string;
  electionId: string;
  questionNumber: number;
  questionTh: string;
  questionEn?: string;
  descriptionTh?: string;
  descriptionEn?: string;
}

export interface CreateReferendumRequest {
  electionId: string;
  questionNumber: number;
  questionTh: string;
  questionEn?: string;
  descriptionTh?: string;
  descriptionEn?: string;
}
