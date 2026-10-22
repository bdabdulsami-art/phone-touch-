import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { listMyOrders } from "@/lib/api";
import { Gate, Shell, usePhone } from "@/components/phone";
import { errMsg, formatWhen, STATUS_LABEL, type OrderView } from "@/lib/domain";

export const Route = createFileRoute("/orders/")({ component: OrdersPage });

function OrdersPage() {
  return (
    <Gate>
      <Shell>
        <OrdersBody />
      </Shell>
    </Gate>
  );
}

function OrdersBody() {
  const { mode } = usePhone();
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    listMyOrders()
      .then((rows) => {
        if (!cancel) setOrders(rows);
      })
      .catch((e) => {
        if (!cancel) setError(errMsg(e));
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="rise space-y-4">
      <h1 className="text-2xl font-semibold">طلباتي</h1>
      {mode === "tech" ? (
        <p className="text-sm text-muted">دي الطلبات اللي أنت عملتها كعميل. طلبات محلك في الرئيسية وضع المحل.</p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {orders == null && !error ? <div className="h-24 animate-pulse rounded-xl bg-line" /> : null}
      {orders && orders.length === 0 ? (
        <p className="text-sm text-muted">لسه مفيش طلبات. اختار محل من الرئيسية وابدأ بصيانة أو إكسسوار.</p>
      ) : null}
      <ul className="space-y-3">
        {(orders ?? []).map((order) => (
          <li key={order.id}>
            <Link
              to="/orders/$orderId"
              params={{ orderId: String(order.id) }}
              className="block rounded-xl border border-line bg-bg-elev p-4"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-semibold">{order.kind === "accessory" ? order.productName : order.shopName}</span>
                <span className="text-xs text-muted">{formatWhen(order.createdAt)}</span>
              </span>
              <span className="mt-1 block text-sm text-muted">
                {order.kind === "repair" ? order.problem : order.shopName}
              </span>
              <span className="mt-2 block text-sm font-medium">{STATUS_LABEL[order.status] ?? order.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
