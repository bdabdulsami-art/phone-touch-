export const DELIVERY_FEE = 20;

export const DISCOUNTS = [10, 15, 20, 25] as const;

export const AREAS = [
  { id: "nasr", name: "مدينة نصر", lat: 30.0626, lng: 31.3301 },
  { id: "heliopolis", name: "مصر الجديدة", lat: 30.0911, lng: 31.3225 },
  { id: "maadi", name: "المعادي", lat: 29.9603, lng: 31.2569 },
  { id: "tagamoa", name: "التجمع الخامس", lat: 30.0074, lng: 31.4913 },
  { id: "dokki", name: "الدقي", lat: 30.0385, lng: 31.212 },
  { id: "mohandessin", name: "المهندسين", lat: 30.0505, lng: 31.2001 },
  { id: "zayed", name: "الشيخ زايد", lat: 30.0305, lng: 30.9765 },
  { id: "october", name: "٦ أكتوبر", lat: 29.972, lng: 30.942 },
  { id: "asyut", name: "أسيوط", lat: 27.1809, lng: 31.1837 },
  { id: "kafr", name: "كفر الشيخ", lat: 31.1107, lng: 30.9388 },
] as const;

export type ServiceType = "delivery" | "walk_in";
export type OrderKind = "repair" | "accessory";
export type Mode = "client" | "tech";

export type Shop = {
  id: number;
  shopName: string;
  area: string;
  address: string;
  phone: string;
  discount: number;
  lat: number;
  lng: number;
  isDemo: boolean;
  about: string;
  rating: number | null;
  reviewCount: number;
};

export type Product = {
  id: number;
  shopId: number;
  name: string;
  price: number;
  discountPrice: number;
  imageUrl: string;
};

export type Review = {
  id: number;
  authorName: string;
  stars: number;
  comment: string;
  createdAt: string;
};

export type Profile = {
  name: string;
  phone: string;
  address: string;
  area: string;
  role: "client" | "technician";
  shop: null | {
    id: number;
    shopName: string;
    area: string;
    address: string;
    phone: string;
    discount: number;
    about: string;
  };
};

export type OrderView = {
  id: number;
  shopId: number;
  shopName: string;
  area: string;
  isDemo: boolean;
  discount: number;
  kind: OrderKind;
  productName: string | null;
  price: number | null;
  problem: string;
  serviceType: ServiceType;
  deliveryClient: number;
  deliveryTech: number;
  status: string;
  createdAt: string;
  deviceImage: string | null;
  clientName: string;
  ownedShop: boolean;
  review: null | { stars: number; comment: string };
};

const FLOW: Record<ServiceType, string[]> = {
  delivery: ["pending", "courier_pickup", "repairing", "courier_return", "completed"],
  walk_in: ["pending", "accepted", "repairing", "ready", "completed"],
};

export function flowOf(service: ServiceType): string[] {
  return FLOW[service];
}

export function techMoves(service: ServiceType, status: string): string[] {
  if (status === "pending") {
    return service === "delivery" ? ["courier_pickup", "rejected"] : ["accepted", "rejected"];
  }
  const flow = FLOW[service];
  const i = flow.indexOf(status);
  if (i < 0 || i >= flow.length - 1) return [];
  return [flow[i + 1]!];
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "تم إرسال الطلب",
  rejected: "الطلب اترفض",
  cancelled: "الطلب اتلغى",
  courier_pickup: "الدليفري في الطريق لاستلام الجهاز",
  accepted: "المحل قبل الطلب",
  repairing: "الجهاز في المحل وجاري الإصلاح",
  courier_return: "تم الإصلاح والدليفري راجع لك",
  ready: "الجهاز جاهز للاستلام من المحل",
  completed: "تم التسليم",
};

export function actionLabel(service: ServiceType, next: string): string {
  if (next === "cancelled") return "إلغاء الطلب";
  if (next === "rejected") return "رفض الطلب";
  if (next === "accepted") return "قبول الطلب";
  if (next === "courier_pickup") return "الدليفري خرج يستلم";
  if (next === "repairing") return service === "walk_in" ? "بدأ الإصلاح" : "الجهاز وصل وبدأ الإصلاح";
  if (next === "courier_return") return "الإصلاح خلص والدليفري راجع";
  if (next === "ready") return "الجهاز جاهز للاستلام";
  if (next === "completed") return "تم التسليم";
  return next;
}

export function areaByName(name: string) {
  return AREAS.find((a) => a.name === name) ?? null;
}

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 =
    Math.cos((aLat * Math.PI) / 180) *
    Math.cos((bLat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(s1 + s2)));
}

export function formatKm(km: number) {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} م`;
  return `${km.toFixed(1)} كم`;
}

export function formatMoney(n: number) {
  return `${n} ج.م`;
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function isSafeImage(src: string) {
  return (
    src.startsWith("/catalog/") ||
    src.startsWith("data:image/jpeg") ||
    src.startsWith("data:image/png") ||
    src.startsWith("data:image/webp")
  );
}

export function errMsg(e: unknown) {
  const m = e instanceof Error ? e.message : "حصل خطأ";
  if (m === "Unauthorized") return "سجّل الدخول الأول";
  return m;
}

export function phoneOk(raw: string) {
  let n = raw.replace(/[^\d+]/g, "");
  if (n.startsWith("+20")) n = `0${n.slice(3)}`;
  else if (n.startsWith("20") && n.length === 12) n = `0${n.slice(2)}`;
  return /^01[0125]\d{8}$/.test(n) ? n : null;
}
