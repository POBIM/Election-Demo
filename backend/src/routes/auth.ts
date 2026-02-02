import { Router } from 'express';
import { createHash } from 'crypto';
import prisma from '../db/index.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { verifyThaiD } from '../services/thaidMock.js';
import type { AuthUser, OfficialScope } from '@election/shared';

const router = Router();

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

router.post('/voter/login', async (req, res) => {
  const { citizenId } = req.body;

  if (!citizenId || typeof citizenId !== 'string') {
    res.status(400).json({ success: false, error: 'Citizen ID is required' });
    return;
  }

  const thaidResponse = verifyThaiD(citizenId);

  if (!thaidResponse) {
    res.status(400).json({ success: false, error: 'Invalid citizen ID format' });
    return;
  }

  let user = await prisma.user.findUnique({ where: { citizenId } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        citizenId,
        name: `${thaidResponse.firstNameTh} ${thaidResponse.lastNameTh}`,
        role: 'voter',
      },
    });
  }

  let district = await prisma.district.findFirst({
    where: { 
      nameTh: { contains: thaidResponse.eligibleProvince },
      candidates: { some: {} }
    },
    include: { province: { include: { region: true } } },
  });

  if (!district) {
    district = await prisma.district.findFirst({
      where: { candidates: { some: {} } },
      include: { province: { include: { region: true } } },
    });
  }

  const authUser: AuthUser = {
    id: user.id,
    citizenId: user.citizenId || undefined,
    name: user.name,
    role: user.role as AuthUser['role'],
    eligibleDistrictId: district?.id,
  };

  const token = generateToken(authUser);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      user: authUser,
      thaidInfo: thaidResponse,
      token,
    },
  });
});

router.post('/official/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      scopeRegion: true,
      scopeProvince: true,
      scopeDistrict: true,
    },
  });

  if (!user || !user.passwordHash) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  if (user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const scope: OfficialScope = {
    regionId: user.scopeRegionId || undefined,
    provinceId: user.scopeProvinceId || undefined,
    districtId: user.scopeDistrictId || undefined,
  };

  const authUser: AuthUser = {
    id: user.id,
    email: user.email || undefined,
    name: user.name,
    role: user.role as AuthUser['role'],
    scope,
  };

  const token = generateToken(authUser);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: { user: authUser, token },
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      scopeRegion: true,
      scopeProvince: true,
      scopeDistrict: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      citizenId: user.citizenId,
      name: user.name,
      role: user.role,
      scope: {
        region: user.scopeRegion,
        province: user.scopeProvince,
        district: user.scopeDistrict,
      },
    },
  });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

export default router;
