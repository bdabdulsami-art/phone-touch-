import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Vercel can hand Better Auth a comma-separated forwarding chain. Without an
 * explicit proxy list that chain is ignored, every visitor shares one
 * rate-limit bucket, and sign-up returns "Too many requests". Vercel overwrites
 * these headers, so the first hop is the real visitor. Collapse it in place —
 * do not `new Request()` here; TanStack's server request is not constructable
 * that way and cloning throws.
 */
function withClientIp(request: Request): Request {
  const headers = request.headers;
  if (!headers || typeof headers.get !== "function" || typeof headers.set !== "function") {
    return request;
  }
  const raw =
    headers.get("x-real-ip") ||
    headers.get("x-vercel-forwarded-for") ||
    headers.get("x-forwarded-for");
  const client = raw?.split(",")[0]?.trim();
  if (!client) return request;
  try {
    headers.set("x-forwarded-for", client);
    headers.set("x-real-ip", client);
  } catch {
    // Headers can be immutable. The auth config still prefers x-real-ip.
  }
  return request;
}

function handle({ request }: { request: Request }) {
  return auth.handler(withClientIp(request));
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
