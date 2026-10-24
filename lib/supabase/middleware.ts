import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applyFlashAlert } from '@/lib/alerts/flash'
import {
  AUTH_NEXT_COOKIE,
  authNextCookieOptions,
  safeInternalPath,
} from '@/lib/supabase/auth-next'

function hasAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes('-auth-token'))
}

function redirectToLogin(
  request: NextRequest,
  redirect: (url: URL) => NextResponse = (url) => NextResponse.redirect(url),
) {
  const next = safeInternalPath(request.nextUrl.pathname) ?? '/dashboard'
  const url = request.nextUrl.clone()
  url.pathname = '/auth/login'
  url.search = ''
  url.searchParams.set('next', next)
  const response = redirect(url)
  response.cookies.set(AUTH_NEXT_COOKIE, next, authNextCookieOptions())
  return response
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/auth')
  const isCronRoute = pathname.startsWith('/api/cron/')
  const isTermsRoute = pathname === '/terms'
  const isPublicRoute =
    pathname === '/' || isAuthRoute || isCronRoute || isTermsRoute
  const sessionCookiePresent = hasAuthCookie(request)
  const hasOAuthCode = request.nextUrl.searchParams.has('code')
  const hasOAuthError =
    request.nextUrl.searchParams.has('error_code') ||
    request.nextUrl.searchParams.has('error')

  // PKCE exchange must own this request. Session refresh here can race the
  // one-time code and trigger flow_state_already_used.
  if (
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/confirm')
  ) {
    return NextResponse.next({ request })
  }

  // No session cookie: skip Auth network work on public routes, and redirect
  // protected routes without calling getClaims().
  if (!sessionCookiePresent) {
    if (pathname === '/' && hasOAuthCode) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/callback'
      if (!url.searchParams.has('next')) {
        const saved = safeInternalPath(request.cookies.get(AUTH_NEXT_COOKIE)?.value)
        url.searchParams.set('next', saved ?? '/dashboard')
      }
      return NextResponse.redirect(url)
    }

    if (pathname === '/' && hasOAuthError) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.search = ''
      const response = NextResponse.redirect(url)
      const description =
        request.nextUrl.searchParams.get('error_description') ??
        request.nextUrl.searchParams.get('error')
      if (description) applyFlashAlert(response, description)
      return response
    }

    if (pathname.startsWith('/auth/error')) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.search = ''
      const response = NextResponse.redirect(url)
      const description = request.nextUrl.searchParams.get('error')
      if (description) applyFlashAlert(response, description)
      return response
    }

    if (isPublicRoute) {
      return NextResponse.next({ request })
    }

    return redirectToLogin(request)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  function redirectWithSession(url: URL) {
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (request.nextUrl.pathname === '/' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return redirectWithSession(url)
  }

  // Unauthenticated users cannot access protected routes (e.g. /dashboard)
  if (!user && !isPublicRoute) {
    return redirectToLogin(request, redirectWithSession)
  }

  // Signed-in users skip login/sign-up; keep onboarding + session routes reachable
  const authPassthrough =
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/confirm') ||
    pathname.startsWith('/auth/update-password') ||
    pathname.startsWith('/auth/details')

  if (user && isAuthRoute && !authPassthrough) {
    const requested =
      safeInternalPath(request.nextUrl.searchParams.get('next')) ??
      safeInternalPath(request.cookies.get(AUTH_NEXT_COOKIE)?.value)
    const url = request.nextUrl.clone()
    const destination = requested
      ? new URL(requested, url.origin)
      : url
    if (!requested) {
      destination.pathname = '/dashboard'
      destination.search = ''
    }
    const redirectResponse = redirectWithSession(destination)
    redirectResponse.cookies.set(AUTH_NEXT_COOKIE, '', authNextCookieOptions(0))
    return redirectResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
