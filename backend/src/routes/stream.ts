import { Router, Response } from 'express';
import prisma from '../db/index.js';

const router = Router();

type SSEClient = {
  id: string;
  res: Response;
  electionId: string;
};

const clients: SSEClient[] = [];

function sendToClients(electionId: string, data: unknown): void {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients
    .filter(client => client.electionId === electionId)
    .forEach(client => {
      client.res.write(message);
    });
}

async function getElectionSnapshot(electionId: string) {
  const partyVotes = await prisma.vote.groupBy({
    by: ['partyId'],
    where: { electionId, ballotType: 'PARTY_LIST', partyId: { not: null } },
    _count: { id: true },
  });

  const parties = await prisma.party.findMany({
    where: { electionId },
    orderBy: { partyNumber: 'asc' },
  });

  const totalVotes = partyVotes.reduce((sum, pv) => sum + pv._count.id, 0);

  return {
    timestamp: new Date().toISOString(),
    totalVotes,
    partyResults: parties.map(party => ({
      partyId: party.id,
      partyName: party.nameTh,
      partyColor: party.color,
      voteCount: partyVotes.find(pv => pv.partyId === party.id)?._count.id || 0,
    })).sort((a, b) => b.voteCount - a.voteCount),
  };
}

router.get('/elections/:electionId/results', async (req, res) => {
  const { electionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const clientId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  clients.push({ id: clientId, res, electionId });

  const snapshot = await getElectionSnapshot(electionId);
  res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const index = clients.findIndex(c => c.id === clientId);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

export function notifyVoteUpdate(electionId: string): void {
  getElectionSnapshot(electionId).then(snapshot => {
    sendToClients(electionId, { event: 'vote_update', ...snapshot });
  });
}

export default router;
