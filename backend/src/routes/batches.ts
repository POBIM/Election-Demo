import { Router } from 'express';
import prisma from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();



router.get('/', authMiddleware, requireRole('super_admin', 'regional_admin', 'province_admin', 'district_official'), async (req, res) => {
  const { electionId, status, districtId } = req.query;
  const user = req.user!;

  const where: Record<string, unknown> = {};

  if (electionId) where.electionId = electionId;
  if (status) where.status = status;

  if (user.role === 'district_official' && user.scope?.districtId) {
    where.districtId = user.scope.districtId;
  } else if (user.role === 'province_admin' && user.scope?.provinceId) {
    const districts = await prisma.district.findMany({
      where: { provinceId: user.scope.provinceId },
      select: { id: true },
    });
    where.districtId = { in: districts.map(d => d.id) };
  } else if (user.role === 'regional_admin' && user.scope?.regionId) {
    const provinces = await prisma.province.findMany({
      where: { regionId: user.scope.regionId },
      select: { id: true },
    });
    const districts = await prisma.district.findMany({
      where: { provinceId: { in: provinces.map(p => p.id) } },
      select: { id: true },
    });
    where.districtId = { in: districts.map(d => d.id) };
  }

  if (districtId && user.role === 'super_admin') {
    where.districtId = districtId;
  }

  const batches = await prisma.voteBatch.findMany({
    where,
    include: {
      election: { select: { id: true, nameTh: true } },
      district: { select: { id: true, nameTh: true, province: { select: { nameTh: true } } } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: batches,
  });
});

router.get('/:id', authMiddleware, async (req, res) => {
  const batch = await prisma.voteBatch.findUnique({
    where: { id: req.params.id },
    include: {
      election: { select: { id: true, nameTh: true } },
      district: { select: { id: true, nameTh: true, province: { select: { nameTh: true, region: { select: { id: true } } } } } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      partyVotes: true,
      constituencyVotes: true,
      referendumVotes: true,
    },
  });

  if (!batch) {
    res.status(404).json({ success: false, error: 'Batch not found' });
    return;
  }

  res.json({
    success: true,
    data: batch,
  });
});

router.post('/', authMiddleware, requireRole('district_official'), async (req, res) => {
  const { electionId, districtId, partyVotes, constituencyVotes, referendumVotes, notes } = req.body;
  const user = req.user!;

  if (user.scope?.districtId && user.scope.districtId !== districtId) {
    res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงเขตนี้' });
    return;
  }

  const election = await prisma.election.findUnique({ where: { id: electionId } });
  
  if (!election) {
    res.status(404).json({ success: false, error: 'ไม่พบการเลือกตั้ง' });
    return;
  }

  if (election.status !== 'CLOSED') {
    res.status(400).json({ success: false, error: 'สามารถส่งข้อมูลได้หลังปิดคูหาเลือกตั้งเท่านั้น' });
    return;
  }

  const district = await prisma.district.findUnique({ where: { id: districtId } });
  
  if (!district) {
    res.status(404).json({ success: false, error: 'ไม่พบเขตเลือกตั้ง' });
    return;
  }

  const existingBatch = await prisma.voteBatch.findFirst({
    where: { electionId, districtId, status: 'PENDING' },
  });

  if (existingBatch) {
    res.status(409).json({ success: false, error: 'มีข้อมูลที่รอการอนุมัติอยู่แล้ว กรุณารออนุมัติหรือยกเลิกก่อน' });
    return;
  }

  const partyTotal = (partyVotes || []).reduce((sum: number, pv: { voteCount: number }) => sum + pv.voteCount, 0);
  const candidateTotal = (constituencyVotes || []).reduce((sum: number, cv: { voteCount: number }) => sum + cv.voteCount, 0);

  const batch = await prisma.voteBatch.create({
    data: {
      electionId,
      districtId,
      submittedById: user.id,
      status: 'PENDING',
      totalVotes: Math.max(partyTotal, candidateTotal),
      notes,
      partyVotes: {
        create: (partyVotes || []).map((pv: { partyId: string; voteCount: number }) => ({
          partyId: pv.partyId,
          voteCount: pv.voteCount,
        })),
      },
      constituencyVotes: {
        create: (constituencyVotes || []).map((cv: { candidateId: string; voteCount: number }) => ({
          candidateId: cv.candidateId,
          voteCount: cv.voteCount,
        })),
      },
      referendumVotes: {
        create: (referendumVotes || []).map((rv: { questionId: string; approveCount: number; disapproveCount: number; abstainCount: number }) => ({
          questionId: rv.questionId,
          approveCount: rv.approveCount || 0,
          disapproveCount: rv.disapproveCount || 0,
          abstainCount: rv.abstainCount || 0,
        })),
      },
    },
    include: {
      district: { select: { nameTh: true } },
      partyVotes: true,
      constituencyVotes: true,
      referendumVotes: true,
    },
  });

  res.status(201).json({
    success: true,
    data: batch,
    message: 'ส่งข้อมูลผลคะแนนเรียบร้อยแล้ว รอการอนุมัติ',
  });
});

router.post('/:id/approve', authMiddleware, requireRole('super_admin', 'regional_admin', 'province_admin'), async (req, res) => {
  const user = req.user!;
  
  const batch = await prisma.voteBatch.findUnique({
    where: { id: req.params.id },
    include: {
      district: { include: { province: { include: { region: true } } } },
      partyVotes: true,
      constituencyVotes: true,
      referendumVotes: true,
    },
  });

  if (!batch) {
    res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    return;
  }

  if (batch.status !== 'PENDING') {
    res.status(400).json({ success: false, error: 'ข้อมูลนี้ได้รับการดำเนินการแล้ว' });
    return;
  }

  const districtInfo = {
    districtId: batch.districtId,
    provinceId: batch.district.provinceId,
    regionId: batch.district.province.regionId,
  };

  if (user.role === 'province_admin' && user.scope?.provinceId !== districtInfo.provinceId) {
    res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์อนุมัติข้อมูลเขตนี้' });
    return;
  }

  if (user.role === 'regional_admin' && user.scope?.regionId !== districtInfo.regionId) {
    res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์อนุมัติข้อมูลภาคนี้' });
    return;
  }

  const updatedBatch = await prisma.voteBatch.update({
    where: { id: req.params.id },
    data: {
      status: 'APPROVED',
      approvedById: user.id,
    },
  });

  res.json({
    success: true,
    data: updatedBatch,
    message: 'อนุมัติข้อมูลผลคะแนนเรียบร้อยแล้ว',
  });
});

router.post('/:id/reject', authMiddleware, requireRole('super_admin', 'regional_admin', 'province_admin'), async (req, res) => {
  const { reason } = req.body;
  const user = req.user!;

  if (!reason) {
    res.status(400).json({ success: false, error: 'กรุณาระบุเหตุผลในการปฏิเสธ' });
    return;
  }

  const batch = await prisma.voteBatch.findUnique({
    where: { id: req.params.id },
    include: {
      district: { include: { province: { include: { region: true } } } },
    },
  });

  if (!batch) {
    res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    return;
  }

  if (batch.status !== 'PENDING') {
    res.status(400).json({ success: false, error: 'ข้อมูลนี้ได้รับการดำเนินการแล้ว' });
    return;
  }

  if (user.role === 'province_admin' && user.scope?.provinceId !== batch.district.provinceId) {
    res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ปฏิเสธข้อมูลเขตนี้' });
    return;
  }

  if (user.role === 'regional_admin' && user.scope?.regionId !== batch.district.province.regionId) {
    res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ปฏิเสธข้อมูลภาคนี้' });
    return;
  }

  const updatedBatch = await prisma.voteBatch.update({
    where: { id: req.params.id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      approvedById: user.id,
    },
  });

  res.json({
    success: true,
    data: updatedBatch,
    message: 'ปฏิเสธข้อมูลผลคะแนนแล้ว',
  });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const user = req.user!;

  const batch = await prisma.voteBatch.findUnique({
    where: { id: req.params.id },
  });

  if (!batch) {
    res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    return;
  }

  if (batch.submittedById !== user.id && user.role !== 'super_admin') {
    res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ลบข้อมูลนี้' });
    return;
  }

  if (batch.status !== 'PENDING') {
    res.status(400).json({ success: false, error: 'ไม่สามารถลบข้อมูลที่ดำเนินการแล้ว' });
    return;
  }

  await prisma.voteBatch.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'ลบข้อมูลเรียบร้อยแล้ว',
  });
});

export default router;
