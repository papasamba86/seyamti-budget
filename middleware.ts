import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (pathname.startsWith('/dashboard') && !token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Lecteurs : lecture seule — bloquer toutes les mutations sauf profil/password
    if (
      token?.role === 'lecteur' &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      pathname.startsWith('/api/') &&
      !pathname.startsWith('/api/auth') &&
      !pathname.startsWith('/api/setup') &&
      !pathname.startsWith('/api/profil/password')
    ) {
      return NextResponse.json(
        { error: 'Accès en lecture seule. Contactez l\'administrateur pour obtenir des droits de modification.' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith('/dashboard')) return !!token;
        if (
          pathname.startsWith('/api/') &&
          !pathname.startsWith('/api/auth') &&
          !pathname.startsWith('/api/setup')
        ) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/api/((?!auth|setup).*)'],
};
