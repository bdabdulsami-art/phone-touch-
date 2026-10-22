import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { getShop } from "@/lib/api";
import { Gate, Shell } from "@/components/phone";
import { Discount, Stars } from "@/components/ui";
import { errMsg, formatMoney, formatWhen, type Product, type Review, type Shop } from "@/lib/domain";

export const Route = createFileRoute("/shop/$shopId")({ component: ShopPage });

function ShopPage() {
  return (
    <Gate>
      <Shell>
        <ShopBody />
      </Shell>
    </Gate>
  );
}

function ShopBody() {
  const { shopId } = Route.useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    getShop({ data: Number(shopId) })
      .then((data) => {
        if (cancel) return;
        setShop(data.shop);
        setProducts(data.products);
        setReviews(data.reviews);
      })
      .catch((e) => {
        if (!cancel) setError(errMsg(e));
      });
    return () => {
      cancel = true;
    };
  }, [shopId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!shop) return <div className="h-40 animate-pulse rounded-xl bg-line" />;

  return (
    <div className="rise space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted">
        <ChevronRight className="size-4" />
        المحلات
      </Link>
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{shop.shopName}</h1>
          <Discount value={shop.discount} />
        </div>
        <p className="text-sm text-muted">
          {shop.area} · {shop.address}
        </p>
        <Stars value={shop.rating} count={shop.reviewCount} />
        <p className="text-sm">{shop.about}</p>
        <p className="text-sm text-muted">تليفون المحل {shop.phone}</p>
        {shop.isDemo ? (
          <p className="rounded-lg border border-line bg-bg-elev p-3 text-sm text-muted">
            محل تجريبي عشان تجرب الطلب. بعد التأكيد تقدر تحرّك خطوات التتبع بنفسك.
          </p>
        ) : null}
      </header>
      <Link
        to="/order/new"
        search={{ shop: shop.id }}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-pine text-sm font-medium text-pine-ink"
      >
        اطلب صيانة
      </Link>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">الإكسسوارات</h2>
        {products.length === 0 ? <p className="text-sm text-muted">مفيش منتجات معروضة دلوقتي.</p> : null}
        <ul className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <li key={product.id} className="overflow-hidden rounded-xl border border-line bg-bg-elev">
              <img src={product.imageUrl} alt="" className="aspect-square w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-sm tabular-nums">
                  <s className="text-subtle">{formatMoney(product.price)}</s>{" "}
                  <span className="font-medium">{formatMoney(product.discountPrice)}</span>
                </p>
                <Link
                  to="/order/new"
                  search={{ shop: shop.id, product: product.id }}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line text-sm"
                >
                  اطلبه
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">آراء العملاء</h2>
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-line bg-bg-elev p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{review.authorName}</p>
                <Stars value={review.stars} />
              </div>
              <p className="mt-2 text-sm">{review.comment}</p>
              <p className="mt-2 text-xs text-subtle">{formatWhen(review.createdAt)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
