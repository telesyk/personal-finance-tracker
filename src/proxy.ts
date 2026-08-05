import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

// Route handlers and PWA fallback that live outside locale routing
const BYPASS_PREFIXES = ['/auth/callback', '/sign-out', '/~offline']

// Public paths (locale-stripped) — accessible without authentication
const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/invite']

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/'
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  }
  return pathname
}

function currentLocale(pathname: string): string {
  return routing.locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  ) ?? routing.defaultLocale
}

function copyAuthCookies(from: NextResponse, to: NextResponse): void {
  // Preserve full Set-Cookie headers (including httpOnly, secure, etc.)
  for (const value of from.headers.getSetCookie()) {
    to.headers.append('set-cookie', value)
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Route handlers that live outside the [locale] tree — only need session refresh
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { response } = await updateSession(request)
    return response
  }

  // Refresh Supabase session on every request
  const { response: supabaseResponse, user } = await updateSession(request)

  const bare = stripLocale(pathname)
  const locale = currentLocale(pathname)
  const isPublic = bare === '/' || PUBLIC_PATHS.some((p) => bare === p || bare.startsWith(`${p}/`))

  // Unauthenticated access to a protected route → sign-in
  if (!user && !isPublic) {
    const dest = new URL(`/${locale}/sign-in`, request.url)
    const res = NextResponse.redirect(dest)
    copyAuthCookies(supabaseResponse, res)
    return res
  }

  // Authenticated user landing on an auth page → dashboard
  if (user && (bare === '/sign-in' || bare === '/sign-up')) {
    const dest = new URL(`/${locale}/dashboard`, request.url)
    const res = NextResponse.redirect(dest)
    copyAuthCookies(supabaseResponse, res)
    return res
  }

  // Let next-intl handle locale detection and path prefixing
  const intlResponse = intlMiddleware(request)
  copyAuthCookies(supabaseResponse, intlResponse)
  return intlResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
