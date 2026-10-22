import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Star } from "lucide-react";

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
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-tight">لمسة</p>
        <p className="mt-1 text-sm text-muted">Phone Touch</p>
        <div className="mx-auto mt-4 h-0.5 w-16 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/2 animate-pulse bg-pine" />
        </div>
      </div>
    </main>
  );
}
