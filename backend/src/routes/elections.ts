import { Router } from 'express';
import prisma from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission, requireSuperAdmin } from '../middleware/rbac.js';

const router = Router();

router.get('/', async (req, res) => {
  const { status } = req.query;

  const elections = await prisma.election.findMany({
    where: status ? { status: status as string } : undefined,
    orderBy: { startDate: 'desc' },
    include: {
      _count: {
        select: { parties: true, candidates: true, referendumQuestions: true },
      },
    },
  });

  res.json({ success: true, data: elections });
});

router.get('/:id', async (req, res) => {
  const election = await prisma.election.findUnique({
    where: { id: req.params.id },
    include: {
      parties: { orderBy: { partyNumber: 'asc' } },
      referendumQuestions: { orderBy: { questionNumber: 'asc' } },
      _count: { select: { candidates: true, votes: true } },
    },
  });

  if (!election) {
    res.status(404).json({ success: false, error: 'Election not found' });
    return;
  }

  res.json({ success: true, data: election });
});

router.post('/', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { name, nameTh, description, startDate, endDate, hasPartyList, hasConstituency, hasReferendum } = req.body;

  const election = await prisma.election.create({
    data: {
      name,
      nameTh,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      hasPartyList: hasPartyList ?? true,
      hasConstituency: hasConstituency ?? true,
      hasReferendum: hasReferendum ?? false,
      status: 'DRAFT',
    },
  });

  res.status(201).json({ success: true, data: election });
});

router.patch('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { name, nameTh, description, startDate, endDate, hasPartyList, hasConstituency, hasReferendum } = req.body;

  const election = await prisma.election.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(nameTh && { nameTh }),
      ...(description !== undefined && { description }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(hasPartyList !== undefined && { hasPartyList }),
      ...(hasConstituency !== undefined && { hasConstituency }),
      ...(hasReferendum !== undefined && { hasReferendum }),
    },
  });

  res.json({ success: true, data: election });
});

router.patch('/:id/status', authMiddleware, requirePermission('election:manage_status'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'];

  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status' });
    return;
  }

  const election = await prisma.election.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json({ success: true, data: election });
});

router.delete('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  const election = await prisma.election.findUnique({ where: { id: req.params.id } });

  if (!election) {
    res.status(404).json({ success: false, error: 'Election not found' });
    return;
  }

  if (election.status !== 'DRAFT') {
    res.status(400).json({ success: false, error: 'Can only delete elections in DRAFT status' });
    return;
  }

  await prisma.election.delete({ where: { id: req.params.id } });

  res.json({ success: true, message: 'Election deleted' });
});

export default router;
