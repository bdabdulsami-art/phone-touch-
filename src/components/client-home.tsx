import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { getCatalog } from "@/lib/api";
import { usePhone } from "@/components/phone";
import { Discount, Stars } from "@/components/ui";
import {
  AREAS,
  areaByName,
  errMsg,
  formatKm,
  formatMoney,
  kmBetween,
  type Product,
  type Shop,
} from "@/lib/domain";

export function ClientHome() {
  const { profile } = usePhone();
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<"near" | "rating">("near");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoNote, setGeoNote] = useState("");

  useEffect(() => {
    let cancel = false;
    getCatalog()
      .then((data) => {
        if (cancel) return;
        setShops(data.shops);
        setProducts(data.products);
      })
      .catch((e) => {
        if (!cancel) setError(errMsg(e));
      });
    return () => {
      cancel = true;
    };
  }, []);

  const base = origin ?? areaByName(profile.area) ?? AREAS[0];

  const deals = useMemo(() => {
    const names = new Map((shops ?? []).map((s) => [s.id, s.shopName]));
    return products
      .filter((p) => p.discountPrice < p.price && names.has(p.shopId))
      .map((p) => ({ ...p, shopName: names.get(p.shopId) ?? "", off: Math.round((1 - p.discountPrice / p.price) * 100) }))
      .sort((a, b) => b.off - a.off)
      .slice(0, 8);
  }, [products, shops]);

  const list = useMemo(() => {
    return (shops ?? [])
      .filter((s) => (area === "all" ? true : s.area === area))
      .filter((s) => (minRating ? (s.rating ?? 0) >= minRating : true))
      .filter((s) => (q.trim() ? s.shopName.includes(q.trim()) : true))
      .map((s) => ({ ...s, km: kmBetween(base.lat, base.lng, s.lat, s.lng) }))
      .sort((a, b) => (sort === "near" ? a.km - b.km : (b.rating ?? 0) - (a.rating ?? 0) || a.km - b.km));
  }, [shops, area, minRating, q, sort, base.lat, base.lng]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoNote("الموقع مش متاح من المتصفح");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoNote("الترتيب حسب موقعك دلوقتي");
      },
      () => setGeoNote("مقدرناش نقرأ الموقع. الترتيب حسب منطقتك."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="rise space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight">أقرب محل يصلح موبايلك</h1>
        <p className="mt-1 text-sm text-muted">خصم الصيانة مكتوب قبل الطلب، والدليفري ٢٠ جنيه لو مش هتروح بنفسك.</p>
      </div>

      <div className="flex h-11 items-center gap-2 rounded-md border border-line bg-bg-elev px-3">
        <Search className="size-5 shrink-0 text-subtle" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث باسم المحل"
          aria-label="بحث"
          className="h-full w-full bg-transparent text-base text-ink outline-none placeholder:text-subtle"
        />
      </div>

      <div className="flex gap-2">
        {(
          [
            ["near", "الأقرب"],
            ["rating", "الأعلى تقييمًا"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={sort === id}
            onClick={() => setSort(id)}
            className={`h-10 rounded-md px-3 text-sm font-medium ${sort === id ? "bg-pine text-pine-ink" : "border border-line bg-bg-elev text-ink"}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={locate}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-line bg-bg-elev px-3 text-sm"
        >
          <MapPin className="size-4" strokeWidth={1.75} />
          موقعي
        </button>
      </div>
      {geoNote ? <p className="text-sm text-muted">{geoNote}</p> : null}

      <div className="scroller -mx-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip active={area === "all"} onClick={() => setArea("all")}>
          كل المناطق
        </FilterChip>
        {AREAS.map((item) => (
          <FilterChip key={item.id} active={area === item.name} onClick={() => setArea(item.name)}>
            {item.name}
          </FilterChip>
        ))}
        <FilterChip active={minRating === 4} onClick={() => setMinRating(minRating === 4 ? 0 : 4)}>
          ٤ نجوم وأكثر
        </FilterChip>
        <FilterChip active={minRating === 4.5} onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}>
          ٤٫٥ وأكثر
        </FilterChip>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">عروض الإكسسوارات</h2>
        <div className="scroller -mx-4 flex gap-3 overflow-x-auto px-4">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              to="/shop/$shopId"
              params={{ shopId: String(deal.shopId) }}
              className="w-40 shrink-0 overflow-hidden rounded-xl border border-line bg-bg-elev"
            >
              <img src={deal.imageUrl} alt="" className="aspect-square w-full object-cover" />
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-medium">{deal.name}</p>
                <p className="text-xs text-muted">{deal.shopName}</p>
                <p className="text-sm">
                  <s className="text-subtle">{formatMoney(deal.price)}</s>{" "}
                  <span className="font-medium tabular-nums">{formatMoney(deal.discountPrice)}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">المحلات والفنيين</h2>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {shops == null && !error ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-line" />
            <div className="h-24 animate-pulse rounded-xl bg-line" />
          </div>
        ) : null}
        {shops && list.length === 0 ? <p className="text-sm text-muted">مفيش محلات بالمواصفات دي.</p> : null}
        <ul className="space-y-3">
          {list.map((shop) => (
            <li key={shop.id}>
              <Link
                to="/shop/$shopId"
                params={{ shopId: String(shop.id) }}
                className="flex items-start gap-3 rounded-xl border border-line bg-bg-elev p-4"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-pine text-base font-semibold text-pine-ink">
                  {shop.shopName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{shop.shopName}</span>
                    <Discount value={shop.discount} />
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {shop.area} · {formatKm(shop.km)}
                  </span>
                  <span className="mt-2 block">
                    <Stars value={shop.rating} count={shop.reviewCount} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-md px-3 text-sm ${active ? "bg-ink text-bg" : "border border-line bg-bg-elev text-ink"}`}
    >
      {children}
    </button>
  );
}
