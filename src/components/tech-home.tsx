import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { addProduct, advanceOrder, deleteProduct, getTechBoard, setDiscount } from "@/lib/api";
import { usePhone } from "@/components/phone";
import { Alert, Button, Discount, Field, TextInput } from "@/components/ui";
import { fileToJpeg } from "@/lib/image";
import {
  DISCOUNTS,
  STATUS_LABEL,
  actionLabel,
  errMsg,
  formatMoney,
  formatWhen,
  techMoves,
  type OrderView,
  type Product,
} from "@/lib/domain";

export function TechHome() {
  const { profile, refresh } = usePhone();
  const shop = profile.shop;
  const [tab, setTab] = useState<"orders" | "discount" | "products">("orders");
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await getTechBoard();
    setOrders(data.orders);
    setProducts(data.products);
  }

  useEffect(() => {
    let cancel = false;
    getTechBoard()
      .then((data) => {
        if (cancel) return;
        setOrders(data.orders);
        setProducts(data.products);
      })
      .catch((e) => {
        if (!cancel) setError(errMsg(e));
      });
    return () => {
      cancel = true;
    };
  }, []);

  if (!shop) return null;

  return (
    <div className="rise space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{shop.shopName}</h1>
        <p className="mt-1 text-sm text-muted">
          {shop.area} · الخصم الحالي {shop.discount}%
        </p>
      </div>
      <div className="flex gap-2">
        {(
          [
            ["orders", "الطلبات"],
            ["discount", "الخصم"],
            ["products", "الإكسسوارات"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`h-10 rounded-md px-3 text-sm font-medium ${tab === id ? "bg-pine text-pine-ink" : "border border-line bg-bg-elev"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Alert>{error}</Alert>
      {tab === "orders" ? (
        <OrderList
          orders={orders}
          busy={busy}
          onAct={async (orderId, next) => {
            setBusy(true);
            setError("");
            try {
              await advanceOrder({ data: { orderId, next } });
              await load();
            } catch (e) {
              setError(errMsg(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
      {tab === "discount" ? (
        <DiscountPanel
          current={shop.discount}
          busy={busy}
          onSave={async (value) => {
            setBusy(true);
            setError("");
            try {
              await setDiscount({ data: value });
              await refresh();
            } catch (e) {
              setError(errMsg(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
      {tab === "products" ? (
        <ProductsPanel
          products={products}
          busy={busy}
          onChange={async (fn) => {
            setBusy(true);
            setError("");
            try {
              await fn();
              await load();
            } catch (e) {
              setError(errMsg(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function OrderList({
  orders,
  busy,
  onAct,
}: {
  orders: OrderView[] | null;
  busy: boolean;
  onAct: (id: number, next: string) => Promise<void>;
}) {
  if (orders == null) return <div className="h-28 animate-pulse rounded-xl bg-line" />;
  if (!orders.length) return <p className="text-sm text-muted">لسه مفيش طلبات. لما عميل يطلب، هتظهر هنا بصورة الجهاز ووصف العطل.</p>;
  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const moves = techMoves(order.serviceType, order.status);
        return (
          <li key={order.id} className="space-y-3 rounded-xl border border-line bg-bg-elev p-4">
            <div className="flex gap-3">
              {order.deviceImage ? (
                <img src={order.deviceImage} alt="" className="size-16 rounded-md object-cover" />
              ) : (
                <span className="grid size-16 place-items-center rounded-md bg-bg text-xs text-muted">
                  {order.kind === "accessory" ? "منتج" : "بدون صورة"}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-semibold">{order.kind === "accessory" ? order.productName : "صيانة"}</p>
                <p className="text-sm text-muted">
                  {order.clientName} · {order.serviceType === "delivery" ? "دليفري" : "حضور للمحل"}
                </p>
                <p className="mt-1 text-sm">{order.problem}</p>
              </div>
            </div>
            <p className="text-sm font-medium">{STATUS_LABEL[order.status] ?? order.status}</p>
            <p className="text-xs text-subtle">{formatWhen(order.createdAt)}</p>
            <div className="flex flex-wrap gap-2">
              {moves.map((next) => (
                <Button
                  key={next}
                  variant={next === "rejected" ? "danger" : "primary"}
                  disabled={busy}
                  onClick={() => void onAct(order.id, next)}
                >
                  {actionLabel(order.serviceType, next)}
                </Button>
              ))}
              <Link
                to="/orders/$orderId"
                params={{ orderId: String(order.id) }}
                className="inline-flex h-11 items-center rounded-md border border-line px-4 text-sm"
              >
                التفاصيل
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DiscountPanel({
  current,
  busy,
  onSave,
}: {
  current: number;
  busy: boolean;
  onSave: (value: number) => Promise<void>;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-bg-elev p-4">
      <h2 className="font-semibold">نسبة الخصم على الصيانة</h2>
      <p className="text-sm text-muted">العميل يشوف النسبة قبل ما يأكد الطلب. الخصم على أجرة الإصلاح، مش على قطعة الغيار إلا لو اتفقتم.</p>
      <div className="flex flex-wrap gap-2">
        {DISCOUNTS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => void onSave(n)}
            className={`h-11 rounded-md px-4 text-sm font-medium ${n === current ? "bg-pine text-pine-ink" : "border border-line bg-bg"}`}
          >
            {n}%
          </button>
        ))}
      </div>
      <Discount value={current} />
    </section>
  );
}

function ProductsPanel({
  products,
  busy,
  onChange,
}: {
  products: Product[];
  busy: boolean;
  onChange: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [image, setImage] = useState("");

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 rounded-xl border border-line bg-bg-elev p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onChange(async () => {
            await addProduct({
              data: { name, price: Number(price), discountPrice: Number(discountPrice), image },
            });
            setName("");
            setPrice("");
            setDiscountPrice("");
            setImage("");
          });
        }}
      >
        <h2 className="font-semibold">منتج جديد</h2>
        <Field label="الاسم">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="السعر">
            <TextInput inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </Field>
          <Field label="بعد الخصم">
            <TextInput
              inputMode="numeric"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              required
            />
          </Field>
        </div>
        <Field label="صورة المنتج">
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void fileToJpeg(file).then(setImage);
            }}
          />
        </Field>
        {image ? <img src={image} alt="" className="h-24 w-24 rounded-md object-cover" /> : null}
        <Button type="submit" disabled={busy || !image}>
          إضافة المنتج
        </Button>
      </form>
      <ul className="space-y-3">
        {products.map((product) => (
          <li key={product.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg-elev p-3">
            <img src={product.imageUrl} alt="" className="size-16 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm tabular-nums">
                <s className="text-subtle">{formatMoney(product.price)}</s> {formatMoney(product.discountPrice)}
              </p>
            </div>
            <Button variant="danger" disabled={busy} onClick={() => void onChange(async () => { await deleteProduct({ data: product.id }); })}>
              حذف
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
