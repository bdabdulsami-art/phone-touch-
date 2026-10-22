import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight } from "lucide-react";
import { addReview, advanceOrder, getOrder } from "@/lib/api";
import { Gate, Shell, usePhone } from "@/components/phone";
import { Alert, Button, Stars, TextArea } from "@/components/ui";
import {
  STATUS_LABEL,
  actionLabel,
  errMsg,
  flowOf,
  formatMoney,
  formatWhen,
  techMoves,
  type OrderView,
} from "@/lib/domain";

export const Route = createFileRoute("/orders/$orderId")({ component: TrackPage });

function TrackPage() {
  return (
    <Gate>
      <Shell>
        <TrackBody />
      </Shell>
    </Gate>
  );
}

function TrackBody() {
  const { orderId } = Route.useParams();
  const { profile } = usePhone();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  async function load() {
    const next = await getOrder({ data: Number(orderId) });
    setOrder(next);
  }

  useEffect(() => {
    let cancel = false;
    getOrder({ data: Number(orderId) })
      .then((next) => {
        if (!cancel) setOrder(next);
      })
      .catch((e) => {
        if (!cancel) setError(errMsg(e));
      });
    return () => {
      cancel = true;
    };
  }, [orderId]);

  async function act(next: string) {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      await advanceOrder({ data: { orderId: order.id, next } });
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <p className="text-sm text-danger">{error}</p>;
  if (!order) return <div className="h-48 animate-pulse rounded-xl bg-line" />;

  const stopped = order.status === "rejected" || order.status === "cancelled";
  const steps = flowOf(order.serviceType);
  const current = steps.indexOf(order.status);
  const moves = techMoves(order.serviceType, order.status);
  const canDrive = order.ownedShop || (order.isDemo && !order.ownedShop);
  const isClient = !order.ownedShop || profile.shop?.id !== order.shopId;

  return (
    <div className="rise space-y-5">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted">
        <ChevronRight className="size-4" />
        طلباتي
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{order.kind === "accessory" ? order.productName : "طلب صيانة"}</h1>
        <p className="mt-1 text-sm text-muted">
          {order.shopName} · {order.area} · {formatWhen(order.createdAt)}
        </p>
      </div>
      {order.deviceImage ? (
        <img src={order.deviceImage} alt="الجهاز" className="h-52 w-full rounded-xl object-cover" />
      ) : null}
      <p className="text-sm">{order.problem}</p>
      <p className="text-sm text-muted">
        {order.serviceType === "delivery"
          ? `دليفري · ${formatMoney(order.deliveryClient)} عليك و${formatMoney(order.deliveryTech)} على المحل`
          : "استلام من المحل"}
        {order.price != null ? ` · المنتج ${formatMoney(order.price)}` : ` · خصم الصيانة ${order.discount}%`}
      </p>
      {order.ownedShop ? <p className="text-sm">العميل: {order.clientName}</p> : null}

      {stopped ? (
        <p className="rounded-xl border border-line bg-danger-soft p-4 text-sm font-medium text-danger">
          {STATUS_LABEL[order.status]}
        </p>
      ) : (
        <ol className="space-y-0">
          {steps.map((step, index) => {
            const done = current > index || order.status === "completed";
            const now = step === order.status;
            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-7 place-items-center rounded-full border ${done || now ? "border-pine bg-pine text-pine-ink" : "border-line bg-bg-elev text-subtle"}`}
                  >
                    {done && !now ? <Check className="size-4" /> : <span className="text-xs tabular-nums">{index + 1}</span>}
                  </span>
                  {index < steps.length - 1 ? <span className={`w-px flex-1 ${done ? "bg-pine" : "bg-line"}`} /> : null}
                </div>
                <p className={`pb-5 text-sm ${now ? "font-semibold" : "text-muted"}`}>{STATUS_LABEL[step]}</p>
              </li>
            );
          })}
        </ol>
      )}

      {order.isDemo && !order.ownedShop && !stopped && order.status !== "completed" ? (
        <p className="text-sm text-muted">الطلب على محل تجريبي. حرّك الخطوة عشان تشوف مسار التتبع.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canDrive && (order.ownedShop || order.isDemo)
          ? moves.map((next) => (
              <Button key={next} variant={next === "rejected" ? "danger" : "primary"} disabled={busy} onClick={() => void act(next)}>
                {actionLabel(order.serviceType, next)}
              </Button>
            ))
          : null}
        {isClient && order.status === "pending" ? (
          <Button variant="danger" disabled={busy} onClick={() => void act("cancelled")}>
            إلغاء الطلب
          </Button>
        ) : null}
      </div>
      <Alert>{error}</Alert>

      {isClient && order.status === "completed" && !order.review ? (
        <form
          className="space-y-3 rounded-xl border border-line bg-bg-elev p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            void addReview({ data: { orderId: order.id, stars, comment } })
              .then(() => load())
              .catch((e) => setError(errMsg(e)))
              .finally(() => setBusy(false));
          }}
        >
          <h2 className="font-semibold">قيّم التجربة</h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                className={`size-11 rounded-md text-sm font-medium ${n <= stars ? "bg-pine text-pine-ink" : "border border-line"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <TextArea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="إيه اللي حصل بعد الإصلاح؟" />
          <Button type="submit" disabled={busy}>
            إرسال التقييم
          </Button>
        </form>
      ) : null}
      {order.review ? (
        <div className="rounded-xl border border-line bg-bg-elev p-4">
          <Stars value={order.review.stars} />
          <p className="mt-2 text-sm">{order.review.comment}</p>
        </div>
      ) : null}
    </div>
  );
}
