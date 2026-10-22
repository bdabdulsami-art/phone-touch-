import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, ChevronRight, ShieldAlert, Store, Truck } from "lucide-react";
import { createOrder, getShop } from "@/lib/api";
import { Gate, Shell } from "@/components/phone";
import { Alert, Button, TextArea } from "@/components/ui";
import { DELIVERY_FEE, errMsg, formatMoney, type Product, type ServiceType, type Shop } from "@/lib/domain";
import { fileToJpeg } from "@/lib/image";

export const Route = createFileRoute("/order/new")({
  validateSearch: (search: Record<string, unknown>): { shop: number; product?: number } => {
    const shop = Number(search.shop);
    const productRaw = search.product;
    const product = productRaw == null || productRaw === "" ? undefined : Number(productRaw);
    return {
      shop: Number.isInteger(shop) ? shop : 0,
      ...(product != null && Number.isInteger(product) ? { product } : {}),
    };
  },
  component: OrderPage,
});

function OrderPage() {
  return (
    <Gate>
      <Shell>
        <OrderBody />
      </Shell>
    </Gate>
  );
}

function OrderBody() {
  const { shop: shopId, product: productId } = Route.useSearch();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [problem, setProblem] = useState("");
  const [service, setService] = useState<ServiceType>("delivery");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    let cancel = false;
    getShop({ data: shopId })
      .then((data) => {
        if (cancel) return;
        setShop(data.shop);
        setProduct(productId ? (data.products.find((item) => item.id === productId) ?? null) : null);
      })
      .catch((e) => {
        if (!cancel) setError(errMsg(e));
      });
    return () => {
      cancel = true;
    };
  }, [shopId, productId]);

  const accessory = Boolean(product);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setBusy(true);
    setError("");
    try {
      const created = await createOrder({
        data: {
          shopId: shop.id,
          kind: accessory ? "accessory" : "repair",
          productId: product?.id,
          problem: accessory ? problem || product?.name || "" : problem,
          serviceType: service,
          deviceImage: image || undefined,
        },
      });
      void navigate({ to: "/orders/$orderId", params: { orderId: String(created.id) } });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  if (!shopId) return <p className="text-sm text-danger">اختار محل الأول.</p>;
  if (error && !shop) return <p className="text-sm text-danger">{error}</p>;
  if (!shop) return <div className="h-40 animate-pulse rounded-xl bg-line" />;

  const delivery = service === "delivery";
  const goods = accessory ? product!.discountPrice : 0;
  const totalKnown = goods + (delivery ? DELIVERY_FEE : 0);

  return (
    <form className="rise space-y-5" onSubmit={(e) => void submit(e)}>
      <Link to="/shop/$shopId" params={{ shopId: String(shop.id) }} className="inline-flex items-center gap-1 text-sm text-muted">
        <ChevronRight className="size-4" />
        {shop.shopName}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{accessory ? "طلب إكسسوار" : "طلب صيانة"}</h1>
        <p className="mt-1 text-sm text-muted">
          {accessory
            ? `${product?.name} · ${formatMoney(product?.discountPrice ?? 0)}`
            : `خصم الصيانة في ${shop.shopName}: ${shop.discount}% على أجرة الإصلاح بعد الفحص.`}
        </p>
      </div>

      {accessory ? null : (
        <>
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-bg-elev text-sm font-medium">
            <Camera className="size-4" strokeWidth={1.75} />
            {image ? "تغيير صورة الجهاز" : "صوّر الجهاز أو اختار صورة"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void fileToJpeg(file)
                  .then(setImage)
                  .catch((err) => setError(errMsg(err)));
              }}
            />
          </label>
          {image ? <img src={image} alt="صورة الجهاز" className="h-44 w-full rounded-xl object-cover" /> : null}
          <TextArea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="مثال: الشاشة مكسورة والجهاز مش بيفتح"
            required
          />
        </>
      )}

      <div className="grid gap-2">
        <ServiceCard
          active={service === "delivery"}
          icon={<Truck className="size-5" strokeWidth={1.75} />}
          title="دليفري"
          body={`توصيل ${DELIVERY_FEE} جنيه منك، و${DELIVERY_FEE} جنيه على المحل.`}
          onClick={() => setService("delivery")}
        />
        <ServiceCard
          active={service === "walk_in"}
          icon={<Store className="size-5" strokeWidth={1.75} />}
          title="هروح بنفسي"
          body="من غير تكلفة توصيل. تستلم من المحل لما يخلّص."
          onClick={() => setService("walk_in")}
        />
      </div>

      {delivery && !accessory ? (
        <div className="flex gap-3 rounded-lg border border-line bg-bg-elev p-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
          <p className="text-sm">
            قبل ما تسلّم الجهاز للدليفري، حط باسورد أو قفل للشاشة. كده خصوصيتك تفضل معاك لحد ما تستلم الموبايل.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-line bg-bg-elev p-4 text-sm">
        {accessory ? <p>سعر المنتج {formatMoney(goods)}</p> : <p>تكلفة الإصلاح تتحدد بعد الفحص، والخصم {shop.discount}%.</p>}
        <p className="mt-1">{delivery ? `توصيل ${formatMoney(DELIVERY_FEE)}` : "من غير توصيل"}</p>
        {accessory ? <p className="mt-2 font-semibold tabular-nums">المطلوب الآن {formatMoney(totalKnown)}</p> : null}
      </div>
      <Alert>{error}</Alert>
      <Button type="submit" className="w-full" disabled={busy || (!accessory && !image)}>
        {busy ? "بنبعت الطلب..." : "تأكيد الطلب"}
      </Button>
    </form>
  );
}

function ServiceCard({
  active,
  icon,
  title,
  body,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-start ${active ? "border-pine bg-bg-elev" : "border-line bg-bg-elev"}`}
    >
      <span className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-sm text-muted">{body}</span>
    </button>
  );
}
