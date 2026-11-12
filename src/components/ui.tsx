import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Star } from "lucide-react";
import { SHOP_PLACEHOLDER, phoneOk } from "@/lib/domain";

export const fieldClass =
  "h-11 w-full rounded-md border border-line bg-bg-elev px-3 text-base text-ink outline-none placeholder:text-subtle focus-visible:border-pine";

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const look =
    variant === "primary"
      ? "bg-pine text-pine-ink"
      : variant === "danger"
        ? "bg-danger-soft text-danger"
        : "border border-line bg-bg-elev text-ink";
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity duration-150 active:opacity-80 disabled:opacity-50 ${look} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function AreaSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full rounded-md border border-line bg-bg-elev px-3 py-3 text-base text-ink outline-none placeholder:text-subtle focus-visible:border-pine ${props.className ?? ""}`}
    />
  );
}

export function Stars({ value, count }: { value: number | null; count?: number }) {
  const shown = value ?? 0;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`size-3.5 ${i <= Math.round(shown) && value != null ? "fill-pine text-pine" : "text-line"}`}
            strokeWidth={1.75}
          />
        ))}
      </span>
      <span className="tabular-nums text-muted">
        {value == null ? "جديد" : value.toFixed(1)}
        {count != null ? ` · ${count}` : ""}
      </span>
    </span>
  );
}

export function Discount({ value }: { value: number }) {
  return (
    <span className="inline-flex h-7 items-center rounded-md bg-pine px-2 text-xs font-medium text-pine-ink">
      خصم {value}%
    </span>
  );
}

export function PhoneActions({ phone }: { phone: string }) {
  const local = phoneOk(phone);
  if (!local) return null;
  const wa = `20${local.slice(1)}`;
  const look =
    "inline-flex h-11 items-center justify-center rounded-md border border-line bg-bg-elev px-4 text-sm font-medium";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${local}`} className={look}>
        اتصال
      </a>
      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={look}>
        واتساب
      </a>
    </div>
  );
}

export function ShopPhoto({ src, alt = "", className }: { src: string | null; alt?: string; className?: string }) {
  return (
    <img src={src || SHOP_PLACEHOLDER} alt={alt} className={className ?? "size-12 shrink-0 rounded-md object-cover"} />
  );
}

export function Alert({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-danger">{children}</p>;
}

export function HouseMark() {
  return (
    <div className="bg-pine text-pine-ink">
      <div className="mx-auto flex h-9 max-w-xl items-center justify-center gap-2 px-4 text-xs">
        <span aria-hidden className="size-2 shrink-0 rounded-sm bg-pine-ink" />
        <span className="font-semibold">عبد السميع</span>
        <span aria-hidden className="opacity-70">
          &
        </span>
        <span className="font-semibold">أحمد شوقي</span>
      </div>
    </div>
  );
}

export function Boot() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#1F4D3A] px-6 text-[#F1EFE9]">
      <div className="text-center">
        <img src="/icons/icon-512.png" alt="" className="mx-auto size-24 rounded-2xl" />
        <p className="mt-4 text-2xl font-semibold tracking-tight">لمسة</p>
        <p className="mt-1 text-sm text-[#F1EFE9]/80">Phone Touch</p>
      </div>
    </main>
  );
}
