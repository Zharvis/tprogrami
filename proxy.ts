import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from './lib/prisma';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  if (path === '/login' || path === '/waiting-room' || path.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  // Check for the mock Playwright token first
  const mockToken = request.cookies.get('sb-access-token')?.value;
  if (mockToken) {
    if (mockToken === 'mock-unverified-token') {
      return NextResponse.redirect(new URL('/waiting-room', request.url));
    }
    if (mockToken === 'mock-verified-token' || mockToken === 'mock-admin-token') {
      return NextResponse.next();
    }
    if (mockToken.startsWith('mock-user-')) {
      const userId = mockToken.replace('mock-user-', '');
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.status === 'UNVERIFIED') {
          return NextResponse.redirect(new URL('/waiting-room', request.url));
        }
        return NextResponse.next();
      } catch (error) {
        console.error('Error fetching mock user in proxy:', error);
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check user status in Prisma for real OAuth users
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!dbUser || dbUser.status === 'UNVERIFIED') {
      return NextResponse.redirect(new URL('/waiting-room', request.url));
    }
  } catch (error) {
    console.error('Error checking user status in proxy:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};

