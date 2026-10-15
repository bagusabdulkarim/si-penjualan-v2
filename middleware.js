import { NextResponse } from 'next/server';
import { verifyRoleCookie, SESSION_COOKIE, ROLE_COOKIE } from './lib/session';

/**
 * Penjaga halaman (berjalan di Edge — tanpa panggil GAS).
 * Peran dibaca dari cookie bertanda tangan; otorisasi FINAL tetap di GAS
 * untuk setiap aksi API (pertahanan berlapis).
 */
export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const roleCookie = req.cookies.get(ROLE_COOKIE)?.value;
  const role = session && roleCookie ? await verifyRoleCookie(roleCookie) : null;
  const loggedIn = !!(session && role);

  // Halaman login: yang sudah login dilempar ke beranda.
  if (pathname === '/login') {
    if (loggedIn) return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.next();
  }

  // Selain /login: wajib login.
  if (!loggedIn) {
    const url = new URL('/login', req.url);
    return NextResponse.redirect(url);
  }

  // Batasan peran di level UI (server tetap menegakkan ulang).
  const adminOnly = ['/master/pengguna'];
  const adminOwnerOnly = ['/dashboard', '/laporan'];
  if (adminOwnerOnly.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
  if (adminOnly.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
