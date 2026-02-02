import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import prisma from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { notifyVoteUpdate } from './stream.js';

const router = Router();

const VOTE_SALT = process.env.ELECTION_VOTE_SALT || 'default-salt';

function createVoterHash(citizenId: string, electionId: string): string {
  return createHash('sha256').update(`${citizenId}:${electionId}:${VOTE_SALT}`).digest('hex');
}

function generateConfirmationCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

router.post('/cast', authMiddleware, async (req, res) => {
  const { electionId, partyVote, constituencyVote, referendumVotes } = req.body;

  if (!req.user?.citizenId) {
    res.status(400).json({ success: false, error: 'Voter verification required' });
    return;
  }

  const election = await prisma.election.findUnique({ where: { id: electionId } });

  if (!election) {
    res.status(404).json({ success: false, error: 'Election not found' });
    return;
  }

  if (election.status !== 'OPEN') {
    res.status(400).json({ success: false, error: 'Election is not open for voting' });
    return;
  }

  const voterHash = createVoterHash(req.user.citizenId, electionId);

  const existingVote = await prisma.vote.findFirst({
    where: { electionId, voterHash },
  });

  if (existingVote) {
    res.status(409).json({ success: false, error: 'You have already voted in this election' });
    return;
  }

  const receipts: { ballotType: string; confirmationCode: string }[] = [];

  await prisma.$transaction(async (tx) => {
    if (partyVote?.partyId && election.hasPartyList) {
      await tx.vote.create({
        data: {
          electionId,
          ballotType: 'PARTY_LIST',
          voterHash,
          partyId: partyVote.partyId,
        },
      });
      receipts.push({ ballotType: 'PARTY_LIST', confirmationCode: generateConfirmationCode() });
    }

    if (constituencyVote?.candidateId && election.hasConstituency) {
      await tx.vote.create({
        data: {
          electionId,
          ballotType: 'CONSTITUENCY',
          voterHash,
          candidateId: constituencyVote.candidateId,
        },
      });
      receipts.push({ ballotType: 'CONSTITUENCY', confirmationCode: generateConfirmationCode() });
    }

    if (referendumVotes && election.hasReferendum) {
      for (const rv of referendumVotes) {
        await tx.vote.create({
          data: {
            electionId,
            ballotType: 'REFERENDUM',
            voterHash,
            referendumQuestionId: rv.questionId,
            referendumAnswer: rv.answer,
          },
        });
        receipts.push({ ballotType: 'REFERENDUM', confirmationCode: generateConfirmationCode() });
      }
    }
  });

  // Notify SSE clients about the vote update
  notifyVoteUpdate(electionId);

  res.status(201).json({
    success: true,
    data: {
      message: 'Vote cast successfully',
      receipts,
      timestamp: new Date().toISOString(),
    },
  });
});

router.get('/status/:electionId', authMiddleware, async (req, res) => {
  const citizenId = req.user?.citizenId;
  const electionId = req.params.electionId as string;
  
  if (!citizenId) {
    res.status(400).json({ success: false, error: 'Voter verification required' });
    return;
  }

  const voterHash = createVoterHash(citizenId, electionId);

  const votes = await prisma.vote.findMany({
    where: { electionId, voterHash },
    select: { ballotType: true, createdAt: true },
  });

  res.json({
    success: true,
    data: {
      hasVoted: votes.length > 0,
      ballotTypes: votes.map(v => v.ballotType),
      votedAt: votes[0]?.createdAt,
    },
  });
});

export default router;
