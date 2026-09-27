import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AppRole = "admin" | "servant";

async function getAuthState(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, deleted_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.is_active || profile.deleted_at) {
    return { role: null as AppRole | null, canAccessAdmin: false };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return {
    role: profile.role as AppRole,
    canAccessAdmin: isAdmin === true,
  };
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/login" || path === "/admin/login";
  const isAdminArea = path.startsWith("/admin") && !isLogin;
  const isBookArea =
    path.startsWith("/book") || path.startsWith("/my-bookings");

  const state = user ? await getAuthState(supabase, user.id) : null;
  const role = state?.role ?? null;
  const canAccessAdmin = state?.canAccessAdmin ?? false;

  if ((isBookArea || isAdminArea) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if ((isBookArea || isAdminArea) && user && !role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "inactive");
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminArea && user && role && !canAccessAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/book";
    return NextResponse.redirect(redirectUrl);
  }

  if (isLogin && user && role) {
    const redirectUrl = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      if (next.startsWith("/admin") && !canAccessAdmin) {
        redirectUrl.pathname = "/book";
        redirectUrl.search = "";
      } else {
        redirectUrl.pathname = next;
        redirectUrl.search = "";
      }
    } else {
      redirectUrl.pathname = canAccessAdmin ? "/admin" : "/book";
      redirectUrl.search = "";
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/book",
    "/book/:path*",
    "/my-bookings",
    "/my-bookings/:path*",
    "/login",
  ],
};
