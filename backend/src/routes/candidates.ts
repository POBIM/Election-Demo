import { Router } from 'express';
import prisma from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.get('/', async (req, res) => {
  const { electionId, districtId, partyId } = req.query;

  const candidates = await prisma.candidate.findMany({
    where: {
      ...(electionId && { electionId: electionId as string }),
      ...(districtId && { districtId: districtId as string }),
      ...(partyId && { partyId: partyId as string }),
    },
    include: {
      party: true,
      district: { include: { province: true } },
    },
    orderBy: { candidateNumber: 'asc' },
  });

  res.json({ success: true, data: candidates });
});

router.get('/:id', async (req, res) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: req.params.id },
    include: {
      party: true,
      district: { include: { province: true } },
      election: true,
    },
  });

  if (!candidate) {
    res.status(404).json({ success: false, error: 'Candidate not found' });
    return;
  }

  res.json({ success: true, data: candidate });
});

router.post('/', authMiddleware, requirePermission('candidate:create'), async (req, res) => {
  const {
    electionId, districtId, partyId, candidateNumber,
    titleTh, firstNameTh, lastNameTh, titleEn, firstNameEn, lastNameEn, photoUrl,
  } = req.body;

  const candidate = await prisma.candidate.create({
    data: {
      electionId,
      districtId,
      partyId,
      candidateNumber,
      titleTh,
      firstNameTh,
      lastNameTh,
      titleEn,
      firstNameEn,
      lastNameEn,
      photoUrl,
    },
    include: { party: true, district: true },
  });

  res.status(201).json({ success: true, data: candidate });
});

router.patch('/:id', authMiddleware, requirePermission('candidate:update'), async (req, res) => {
  const { partyId, titleTh, firstNameTh, lastNameTh, titleEn, firstNameEn, lastNameEn, photoUrl } = req.body;

  const candidate = await prisma.candidate.update({
    where: { id: req.params.id },
    data: {
      ...(partyId !== undefined && { partyId }),
      ...(titleTh && { titleTh }),
      ...(firstNameTh && { firstNameTh }),
      ...(lastNameTh && { lastNameTh }),
      ...(titleEn !== undefined && { titleEn }),
      ...(firstNameEn !== undefined && { firstNameEn }),
      ...(lastNameEn !== undefined && { lastNameEn }),
      ...(photoUrl !== undefined && { photoUrl }),
    },
    include: { party: true, district: true },
  });

  res.json({ success: true, data: candidate });
});

router.delete('/:id', authMiddleware, requirePermission('candidate:delete'), async (req, res) => {
  await prisma.candidate.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Candidate deleted' });
});

export default router;
