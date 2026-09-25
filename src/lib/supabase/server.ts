import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Actions and Route
 * Handlers. Must be created fresh per request (cookies() is request-scoped).
 *
 * Note: Server Components can't write cookies, so a call to `setAll` there
 * is a no-op wrapped in try/catch. Session refresh is instead handled by
 * `src/middleware.ts`, which runs before every request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component - middleware refreshes the
            // session instead, so this can be safely ignored.
          }
        },
      },
    },
  );
}
