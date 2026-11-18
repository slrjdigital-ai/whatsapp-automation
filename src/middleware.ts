import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_EXACT_PATHS = [
  '/login',
  '/consent',
  '/optin',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/webhooks/whatsapp',
  '/api/consent',
  '/api/contacts/sample-template',
  '/api/cron/campaigns',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public assets and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // images, icons, robots.txt, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Allow exact public routes
  if (PUBLIC_EXACT_PATHS.includes(pathname)) {
    // If user is already logged in and attempts to access /login, redirect to dashboard
    if (pathname === '/login') {
      const token = request.cookies.get('slrj_auth_token')?.value;
      if (token) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Check for auth cookie
  const token = request.cookies.get('slrj_auth_token')?.value;

  // Unauthenticated requests
  if (!token) {
    // Return 401 for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication token required.' },
        { status: 401 }
      );
    }

    // Redirect to login for UI pages
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
