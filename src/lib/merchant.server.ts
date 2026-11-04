/**
 * Central merchant service. Server-only: the service key is read from
 * MERCHANT_SERVICE_KEY and is never returned to the browser.
 */

export type MerchantStatus = "pending" | "active" | "suspended" | "banned" | "rejected";

export type MerchantSnapshot = {
  status: MerchantStatus;
  dues: number | null;
};

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: MerchantSnapshot }>();

const STATUSES = new Set<MerchantStatus>(["pending", "active", "suspended", "banned", "rejected"]);

export function merchantStatusOf(value: unknown): MerchantStatus | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return STATUSES.has(raw as MerchantStatus) ? (raw as MerchantStatus) : null;
}

function config() {
  const base = process.env.MERCHANT_API_URL?.trim().replace(/\/$/, "");
  const key = process.env.MERCHANT_SERVICE_KEY?.trim();
  if (!base || !key) return null;
  return { base, key };
}

function unavailable() {
  return new Error("حاول لاحقاً");
}

function claimError(status: number) {
  if (status === 400 || status === 404 || status === 422) return new Error("كود الدعوة غير صالح");
  if (status === 409) return new Error("الحساب ده متسجل كتاجر");
  return unavailable();
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
  if (!cfg) throw unavailable();
  try {
    return await fetch(`${cfg.base}${path}`, {
      method,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-service-key": cfg.key,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw unavailable();
  }
}

export async function claimMerchant(input: {
  inviteCode: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
}) {
  const res = await merchantFetch("/api/v1/service/merchants/claim", "POST", JSON.stringify({
    inviteCode: input.inviteCode,
    name: input.name,
    businessName: input.businessName,
    email: input.email,
    phone: input.phone,
    app: "phone-touch",
  }));
  if (!res.ok) throw claimError(res.status);
  const text = await res.text();
  if (!text) return;
  try {
    const json = JSON.parse(text) as { ok?: boolean; success?: boolean };
    if (json.ok === false || json.success === false) throw claimError(400);
  } catch (err) {
    if (err instanceof Error && err.message === "كود الدعوة غير صالح") throw err;
  }
}

export async function readMerchantStatus(email: string): Promise<MerchantSnapshot> {
  const key = email.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const res = await merchantFetch(
    `/api/v1/service/merchants/status?email=${encodeURIComponent(key)}`,
    "GET",
  );
  if (!res.ok) throw unavailable();
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw unavailable();
  }
  const snap = snapshotFromBody(body);
  if (!snap) throw unavailable();
  cache.set(key, { at: Date.now(), value: snap });
  return snap;
}
