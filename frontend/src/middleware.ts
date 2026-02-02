import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');

  if (isAdminPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
         throw new Error('Invalid token');
      }
      const payload = JSON.parse(atob(parts[1]));
      
      const allowedRoles = ['super_admin', 'regional_admin', 'province_admin', 'district_official'];
      if (!allowedRoles.includes(payload.role)) {
         return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (e) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (isLoginPage && token) {
     try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const allowedRoles = ['super_admin', 'regional_admin', 'province_admin', 'district_official'];
        if (allowedRoles.includes(payload.role)) {
           return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
    } catch (e) {
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
