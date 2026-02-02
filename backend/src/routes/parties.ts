import { Router } from 'express';
import prisma from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/rbac.js';

const router = Router();

router.get('/', async (req, res) => {
  const { electionId } = req.query;

  const parties = await prisma.party.findMany({
    where: electionId ? { electionId: electionId as string } : undefined,
    orderBy: { partyNumber: 'asc' },
  });

  res.json({ success: true, data: parties });
});

router.get('/:id', async (req, res) => {
  const party = await prisma.party.findUnique({
    where: { id: req.params.id },
    include: { election: true },
  });

  if (!party) {
    res.status(404).json({ success: false, error: 'Party not found' });
    return;
  }

  res.json({ success: true, data: party });
});

router.post('/', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { electionId, name, nameTh, abbreviation, color, logoUrl, partyNumber, description } = req.body;

  const party = await prisma.party.create({
    data: {
      electionId,
      name,
      nameTh,
      abbreviation,
      color,
      logoUrl,
      partyNumber,
      description,
    },
  });

  res.status(201).json({ success: true, data: party });
});

router.patch('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  const { name, nameTh, abbreviation, color, logoUrl, description } = req.body;

  const party = await prisma.party.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(nameTh && { nameTh }),
      ...(abbreviation && { abbreviation }),
      ...(color && { color }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(description !== undefined && { description }),
    },
  });

  res.json({ success: true, data: party });
});

router.delete('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  await prisma.party.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Party deleted' });
});

export default router;
