import { Request, Response, NextFunction } from 'express';
import { hasPermission, canAccessDistrict } from '@election/shared';
import type { Permission, UserRole } from '@election/shared';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient role permissions' });
      return;
    }

    next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const hasAllPermissions = permissions.every(p => hasPermission(req.user!.role, p));

    if (!hasAllPermissions) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function requireDistrictAccess(getDistrictInfo: (req: Request) => Promise<{
  districtId: string;
  provinceId: string;
  regionId: string;
} | null>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    const districtInfo = await getDistrictInfo(req);

    if (!districtInfo) {
      res.status(404).json({ success: false, error: 'District not found' });
      return;
    }

    const hasAccess = canAccessDistrict(
      req.user.role,
      req.user.scope,
      districtInfo.districtId,
      districtInfo.provinceId,
      districtInfo.regionId
    );

    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'Access denied for this district' });
      return;
    }

    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'super_admin') {
    res.status(403).json({ success: false, error: 'Super admin access required' });
    return;
  }

  next();
}
