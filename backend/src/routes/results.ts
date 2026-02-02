import { Router } from 'express';
import prisma from '../db/index.js';

const router = Router();

router.get('/:electionId', async (req, res) => {
  const election = await prisma.election.findUnique({
    where: { id: req.params.electionId },
  });

  if (!election) {
    res.status(404).json({ success: false, error: 'Election not found' });
    return;
  }

  const [partyVotes, , referendumVotes, totalVoters] = await Promise.all([
    prisma.vote.groupBy({
      by: ['partyId'],
      where: { electionId: req.params.electionId, ballotType: 'PARTY_LIST', partyId: { not: null } },
      _count: { id: true },
    }),
    prisma.vote.groupBy({
      by: ['candidateId'],
      where: { electionId: req.params.electionId, ballotType: 'CONSTITUENCY', candidateId: { not: null } },
      _count: { id: true },
    }),
    prisma.vote.groupBy({
      by: ['referendumQuestionId', 'referendumAnswer'],
      where: { electionId: req.params.electionId, ballotType: 'REFERENDUM' },
      _count: { id: true },
    }),
    prisma.district.aggregate({ _sum: { voterCount: true } }),
  ]);

  const parties = await prisma.party.findMany({
    where: { electionId: req.params.electionId },
    orderBy: { partyNumber: 'asc' },
  });

  const totalPartyVotes = partyVotes.reduce((sum, pv) => sum + pv._count.id, 0);

  const partyResults = parties.map(party => {
    const votes = partyVotes.find(pv => pv.partyId === party.id)?._count.id || 0;
    return {
      partyId: party.id,
      partyName: party.name,
      partyNameTh: party.nameTh,
      partyColor: party.color,
      voteCount: votes,
      percentage: totalPartyVotes > 0 ? (votes / totalPartyVotes) * 100 : 0,
    };
  }).sort((a, b) => b.voteCount - a.voteCount);

  const referendumQuestions = await prisma.referendumQuestion.findMany({
    where: { electionId: req.params.electionId },
    orderBy: { questionNumber: 'asc' },
  });

  const referendumResults = referendumQuestions.map(question => {
    const votes = referendumVotes.filter(rv => rv.referendumQuestionId === question.id);
    const approveCount = votes.find(v => v.referendumAnswer === 'APPROVE')?._count.id || 0;
    const disapproveCount = votes.find(v => v.referendumAnswer === 'DISAPPROVE')?._count.id || 0;
    const abstainCount = votes.find(v => v.referendumAnswer === 'ABSTAIN')?._count.id || 0;
    const total = approveCount + disapproveCount + abstainCount;

    return {
      questionId: question.id,
      questionText: question.questionTh,
      approveCount,
      disapproveCount,
      abstainCount,
      approvePercentage: total > 0 ? (approveCount / total) * 100 : 0,
      disapprovePercentage: total > 0 ? (disapproveCount / total) * 100 : 0,
      result: approveCount > disapproveCount ? 'APPROVED' : approveCount < disapproveCount ? 'DISAPPROVED' : 'TIE',
    };
  });

  res.json({
    success: true,
    data: {
      electionId: election.id,
      electionName: election.nameTh,
      status: election.status,
      lastUpdated: new Date().toISOString(),
      totalEligibleVoters: totalVoters._sum.voterCount || 0,
      totalVotesCast: totalPartyVotes,
      turnoutPercentage: totalVoters._sum.voterCount 
        ? (totalPartyVotes / totalVoters._sum.voterCount) * 100 
        : 0,
      partyListResults: partyResults,
      referendumResults,
    },
  });
});

router.get('/:electionId/by-district', async (req, res) => {
  const { provinceId } = req.query;

  const districts = await prisma.district.findMany({
    where: provinceId ? { provinceId: provinceId as string } : undefined,
    include: { province: true },
    orderBy: [{ province: { nameTh: 'asc' } }, { zoneNumber: 'asc' }],
  });

  const candidates = await prisma.candidate.findMany({
    where: { electionId: req.params.electionId },
    include: { party: true },
  });

  const votes = await prisma.vote.groupBy({
    by: ['candidateId'],
    where: { electionId: req.params.electionId, ballotType: 'CONSTITUENCY' },
    _count: { id: true },
  });

  const districtResults = districts.map(district => {
    const districtCandidates = candidates.filter(c => c.districtId === district.id);
    const candidateResults = districtCandidates.map(candidate => {
      const voteCount = votes.find(v => v.candidateId === candidate.id)?._count.id || 0;
      return {
        candidateId: candidate.id,
        candidateName: `${candidate.titleTh}${candidate.firstNameTh} ${candidate.lastNameTh}`,
        partyName: candidate.party?.nameTh,
        partyColor: candidate.party?.color,
        voteCount,
      };
    }).sort((a, b) => b.voteCount - a.voteCount);

    const totalVotes = candidateResults.reduce((sum, c) => sum + c.voteCount, 0);
    const winner = candidateResults[0];

    return {
      districtId: district.id,
      districtName: district.nameTh,
      provinceName: district.province.nameTh,
      voterCount: district.voterCount,
      totalVotes,
      turnoutPercentage: district.voterCount > 0 ? (totalVotes / district.voterCount) * 100 : 0,
      candidates: candidateResults.map(c => ({
        ...c,
        percentage: totalVotes > 0 ? (c.voteCount / totalVotes) * 100 : 0,
        isWinner: c.candidateId === winner?.candidateId,
      })),
      winner: winner ? { ...winner, percentage: totalVotes > 0 ? (winner.voteCount / totalVotes) * 100 : 0 } : null,
    };
  });

  res.json({ success: true, data: districtResults });
});

export default router;
