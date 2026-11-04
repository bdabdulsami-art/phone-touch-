/**
 * Central merchant service. Server-only: the service key is read from
 * MERCHANT_SERVICE_KEY and is never returned to the browser or the logs.
 */

export type MerchantStatus = "pending" | "active" | "suspended" | "banned" | "rejected";

export type MerchantSnapshot = {
  status: MerchantStatus;
  dues: number | null;
};

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: MerchantSnapshot }>();

const STATUSES = new Set<MerchantStatus>(["pending", "active", "suspended", "banned", "rejected"]);

export const MERCHANT_KEY_MSG = "مفتاح الخدمة غير صالح";
export const MERCHANT_URL_MSG = "رابط الخدمة غير مضبوط";
export const MERCHANT_INVITE_MSG = "كود الدعوة خاطئ أو مستخدم";
const LATER_MSG = "حاول لاحقاً";

export function merchantStatusOf(value: unknown): MerchantStatus | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return STATUSES.has(raw as MerchantStatus) ? (raw as MerchantStatus) : null;
}

function logMerchant(reason: string, detail: Record<string, unknown>) {
  console.error("[merchant]", reason, JSON.stringify(detail));
}

function hostOf(base: string) {
  try {
    return new URL(base).host;
  } catch {
    return "invalid";
  }
}

function config() {
  const rawUrl = process.env.MERCHANT_API_URL;
  const rawKey = process.env.MERCHANT_SERVICE_KEY;
  const base = rawUrl?.trim().replace(/\/$/, "") ?? "";
  const key = rawKey?.trim() ?? "";
  const hasUrl = base.length > 0;
  const hasKey = key.length > 0;
  if (!hasUrl || /\s/.test(base)) {
    logMerchant("url_not_configured", { hasUrl, hasKey, keyLength: key.length });
    throw new Error(MERCHANT_URL_MSG);
  }
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    logMerchant("url_not_configured", { hasUrl: true, invalid: true, hasKey, keyLength: key.length });
    throw new Error(MERCHANT_URL_MSG);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    logMerchant("url_not_configured", { protocol: parsed.protocol, host: parsed.host });
    throw new Error(MERCHANT_URL_MSG);
  }
  if (!hasKey) {
    logMerchant("service_key_invalid", { host: parsed.host, keyLength: 0, reason: "missing" });
    throw new Error(MERCHANT_KEY_MSG);
  }
  return { base, key, host: parsed.host };
}

function looksLikeHtml(text: string) {
  const head = text.trim().slice(0, 48).toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<head");
}

function claimFailure(status: number, body: string, host: string, keyLength: number) {
  const html = looksLikeHtml(body);
  const snippet = html ? "html" : body.replace(/\s+/g, " ").slice(0, 180);
  if (status === 401 || status === 403) {
    logMerchant("service_key_invalid", { status, host, keyLength, path: "claim" });
    return new Error(MERCHANT_KEY_MSG);
  }
  if (html && (status === 404 || status === 405)) {
    logMerchant("url_not_configured", { status, host, body: "html", path: "claim" });
    return new Error(MERCHANT_URL_MSG);
  }
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    logMerchant("invite_rejected", { status, host, body: snippet, path: "claim" });
    return new Error(MERCHANT_INVITE_MSG);
  }
  logMerchant("upstream_error", { status, host, body: snippet, path: "claim" });
  return new Error(LATER_MSG);
}

function duesOf(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function snapshotFromBody(body: unknown): MerchantSnapshot | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const nested =
    root.merchant && typeof root.merchant === "object"
      ? (root.merchant as Record<string, unknown>)
      : root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : root;
  const status = merchantStatusOf(nested.status ?? root.status);
  if (!status) return null;
  const dues = duesOf(
    nested.dues ?? nested.balance ?? nested.payable ?? nested.amountDue ?? root.dues ?? root.balance,
  );
  return { status, dues };
}

async function merchantFetch(path: string, method: "GET" | "POST", body?: string) {
  const cfg = config();
  try {
    return {
      res: await fetch(`${cfg.base}${path}`, {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-service-key": cfg.key,
        },
        body,
        signal: AbortSignal.timeout(8000),
      }),
      host: cfg.host,
      keyLength: cfg.key.length,
    };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    const message = err instanceof Error ? err.message : "fetch failed";
    const timedOut = name === "TimeoutError" || name === "AbortError";
    logMerchant(timedOut ? "upstream_timeout" : "url_not_configured", {
      host: cfg.host,
      path,
      error: name,
      message: message.slice(0, 180),
    });
    throw new Error(timedOut ? LATER_MSG : MERCHANT_URL_MSG);
  }
}

export async function claimMerchant(input: {
  inviteCode: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
}) {
  const { res, host, keyLength } = await merchantFetch(
    "/api/v1/service/merchants/claim",
    "POST",
    JSON.stringify({
      inviteCode: input.inviteCode,
      name: input.name,
      businessName: input.businessName,
      email: input.email,
      phone: input.phone,
      app: "phone-touch",
    }),
  );
  const text = await res.text();
  if (!res.ok) throw claimFailure(res.status, text, host, keyLength);
  if (!text) return;
  try {
    const json = JSON.parse(text) as { ok?: boolean; success?: boolean };
    if (json.ok === false || json.success === false) {
      logMerchant("invite_rejected", { status: res.status, host, body: "ok:false", path: "claim" });
      throw new Error(MERCHANT_INVITE_MSG);
    }
  } catch (err) {
    if (err instanceof Error && err.message === MERCHANT_INVITE_MSG) throw err;
    logMerchant("upstream_error", { status: res.status, host, body: "invalid-json", path: "claim" });
    throw new Error(LATER_MSG);
  }
}

export async function readMerchantStatus(email: string): Promise<MerchantSnapshot> {
  const key = email.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const { res, host, keyLength } = await merchantFetch(
    `/api/v1/service/merchants/status?email=${encodeURIComponent(key)}`,
    "GET",
  );
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      logMerchant("service_key_invalid", { status: res.status, host, keyLength, path: "status" });
      throw new Error(MERCHANT_KEY_MSG);
    }
    if (looksLikeHtml(text) && (res.status === 404 || res.status === 405)) {
      logMerchant("url_not_configured", { status: res.status, host, body: "html", path: "status" });
      throw new Error(MERCHANT_URL_MSG);
    }
    logMerchant("upstream_error", {
      status: res.status,
      host,
      path: "status",
      body: looksLikeHtml(text) ? "html" : text.replace(/\s+/g, " ").slice(0, 180),
    });
    throw new Error(LATER_MSG);
  }
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    logMerchant("upstream_error", { status: res.status, host, path: "status", body: "invalid-json" });
    throw new Error(LATER_MSG);
  }
  const snap = snapshotFromBody(body);
  if (!snap) {
    logMerchant("upstream_error", { status: res.status, host, path: "status", body: "missing-status" });
    throw new Error(LATER_MSG);
  }
  cache.set(key, { at: Date.now(), value: snap });
  return snap;
}
