import type { TimestampFields } from './index.js';
import type { BallotType } from './election.js';

// Vote (anonymous - only stores hash for deduplication)
export interface Vote extends TimestampFields {
  id: string;
  electionId: string;
  ballotType: BallotType;
  voterHash: string; // sha256(citizenId + electionSalt) - for deduplication
  
  // One of these based on ballotType:
  partyId?: string;
  candidateId?: string;
  referendumQuestionId?: string;
  referendumAnswer?: 'APPROVE' | 'DISAPPROVE' | 'ABSTAIN';
}

// Vote submission requests
export interface CastPartyVoteRequest {
  electionId: string;
  partyId: string;
}

export interface CastConstituencyVoteRequest {
  electionId: string;
  candidateId: string;
}

export interface CastReferendumVoteRequest {
  electionId: string;
  questionId: string;
  answer: 'APPROVE' | 'DISAPPROVE' | 'ABSTAIN';
}

export interface CastBallotRequest {
  electionId: string;
  partyVote?: {
    partyId: string;
  };
  constituencyVote?: {
    candidateId: string;
  };
  referendumVotes?: {
    questionId: string;
    answer: 'APPROVE' | 'DISAPPROVE' | 'ABSTAIN';
  }[];
}

export interface VoteReceipt {
  ballotId: string;
  electionId: string;
  ballotType: BallotType;
  timestamp: Date;
  confirmationCode: string; // short code for voter reference
}

// Vote Batch (for district official upload)
export type BatchStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VoteBatch extends TimestampFields {
  id: string;
  electionId: string;
  districtId: string;
  submittedById: string;
  approvedById?: string;
  status: BatchStatus;
  partyVotes: BatchPartyVote[];
  constituencyVotes: BatchConstituencyVote[];
  referendumVotes: BatchReferendumVote[];
  totalVotes: number;
  notes?: string;
  rejectionReason?: string;
}

export interface BatchPartyVote {
  partyId: string;
  voteCount: number;
}

export interface BatchConstituencyVote {
  candidateId: string;
  voteCount: number;
}

export interface BatchReferendumVote {
  questionId: string;
  approveCount: number;
  disapproveCount: number;
  abstainCount: number;
}

export interface CreateVoteBatchRequest {
  electionId: string;
  districtId: string;
  partyVotes: BatchPartyVote[];
  constituencyVotes: BatchConstituencyVote[];
  referendumVotes?: BatchReferendumVote[];
  notes?: string;
}

// Results
export interface PartyResult {
  partyId: string;
  partyName: string;
  partyNameTh: string;
  partyColor: string;
  voteCount: number;
  percentage: number;
}

export interface CandidateResult {
  candidateId: string;
  candidateName: string;
  partyName?: string;
  partyColor?: string;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

export interface DistrictResult {
  districtId: string;
  districtName: string;
  provinceName: string;
  totalVotes: number;
  invalidVotes: number;
  noVotes: number;
  turnoutPercentage: number;
  candidates: CandidateResult[];
  winner?: CandidateResult;
}

export interface ReferendumResult {
  questionId: string;
  questionText: string;
  approveCount: number;
  disapproveCount: number;
  abstainCount: number;
  approvePercentage: number;
  disapprovePercentage: number;
  result: 'APPROVED' | 'DISAPPROVED' | 'TIE';
}

export interface ElectionResults {
  electionId: string;
  electionName: string;
  status: string;
  lastUpdated: Date;
  totalEligibleVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  
  partyListResults: PartyResult[];
  constituencyResults: DistrictResult[];
  referendumResults: ReferendumResult[];
  
  // Aggregations
  byRegion: {
    regionName: string;
    totalVotes: number;
    turnout: number;
    partyResults: PartyResult[];
  }[];
  
  byProvince: {
    provinceId: string;
    provinceName: string;
    totalVotes: number;
    turnout: number;
  }[];
}
