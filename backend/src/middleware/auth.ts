import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JWTPayload, AuthUser, UserRole, OfficialScope } from '@election/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  const payload = {
    sub: user.id,
    role: user.role,
    scope: user.scope,
    citizenId: user.citizenId,
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  req.user = {
    id: payload.sub,
    name: '',
    role: payload.role as UserRole,
    scope: payload.scope as OfficialScope,
    citizenId: (payload as any).citizenId,
  };

  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = {
        id: payload.sub,
        name: '',
        role: payload.role as UserRole,
        scope: payload.scope as OfficialScope,
        citizenId: (payload as any).citizenId,
      };
    }
  }

  next();
}
