import { Router } from 'express';
import prisma from '../db/index.js';

const router = Router();

router.get('/regions', async (_req, res) => {
  const regions = await prisma.region.findMany({
    include: {
      _count: { select: { provinces: true } },
    },
  });

  res.json({
    success: true,
    data: regions.map(r => ({
      ...r,
      provinceCount: r._count.provinces,
    })),
  });
});

router.get('/provinces', async (req, res) => {
  const { regionId } = req.query;

  const provinces = await prisma.province.findMany({
    where: regionId ? { regionId: regionId as string } : undefined,
    include: {
      region: true,
      _count: { select: { districts: true } },
    },
    orderBy: { nameTh: 'asc' },
  });

  res.json({
    success: true,
    data: provinces.map(p => ({
      ...p,
      districtCount: p._count.districts,
    })),
  });
});

router.get('/provinces/:id', async (req, res) => {
  const province = await prisma.province.findUnique({
    where: { id: req.params.id },
    include: {
      region: true,
      districts: { orderBy: { zoneNumber: 'asc' } },
    },
  });

  if (!province) {
    res.status(404).json({ success: false, error: 'Province not found' });
    return;
  }

  res.json({ success: true, data: province });
});

router.get('/districts', async (req, res) => {
  const { provinceId, regionId } = req.query;

  const districts = await prisma.district.findMany({
    where: {
      ...(provinceId ? { provinceId: provinceId as string } : {}),
      ...(regionId ? { province: { regionId: regionId as string } } : {}),
    },
    include: {
      province: { include: { region: true } },
    },
    orderBy: [{ province: { nameTh: 'asc' } }, { zoneNumber: 'asc' }],
  });

  res.json({ success: true, data: districts });
});

router.get('/districts/:id', async (req, res) => {
  const district = await prisma.district.findUnique({
    where: { id: req.params.id },
    include: {
      province: { include: { region: true } },
    },
  });

  if (!district) {
    res.status(404).json({ success: false, error: 'District not found' });
    return;
  }

  res.json({ success: true, data: district });
});

router.get('/stats', async (_req, res) => {
  const [regions, provinces, districts, totalVoters] = await Promise.all([
    prisma.region.count(),
    prisma.province.count(),
    prisma.district.count(),
    prisma.district.aggregate({ _sum: { voterCount: true } }),
  ]);

  res.json({
    success: true,
    data: {
      totalRegions: regions,
      totalProvinces: provinces,
      totalDistricts: districts,
      totalVoters: totalVoters._sum.voterCount || 0,
    },
  });
});

export default router;
