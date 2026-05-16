import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Routes publiques : pas de vérification
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/migrate-v3') ||
    pathname === '/login' ||
    pathname === '/setup'
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Non connecté → rediriger vers /login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Lecteur : bloquer toutes les mutations sauf changement de son propre mot de passe
  if (
    token.role === 'lecteur' &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/profil/password')
  ) {
    return NextResponse.json(
      { error: "Accès en lecture seule. Contactez l'administrateur pour obtenir des droits de modification." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/((?!auth|setup).*)',
  ],
};
