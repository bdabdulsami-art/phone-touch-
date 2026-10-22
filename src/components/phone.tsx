import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Home, UserRound } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { createProfile, getProfile } from "@/lib/api";
import { AREAS, DISCOUNTS, errMsg, type Mode, type Profile } from "@/lib/domain";
import { Alert, AreaSelect, Boot, Button, Field, HouseMark, TextInput } from "@/components/ui";

type Ctx = {
  profile: Profile | null;
  loading: boolean;
  failed: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  refresh: () => Promise<Profile | null>;
};

const PhoneCtx = createContext<Ctx | null>(null);
const MODE_KEY = "pt-mode";

export function PhoneProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [mode, setModeState] = useState<Mode>("client");
  const userId = user?.id ?? null;

  const refresh = useCallback(async () => {
    const next = await getProfile();
    setProfile(next);
    setFailed(false);
    return next;
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setProfile(null);
      setFailed(false);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    getProfile()
      .then((next) => {
        if (cancel) return;
        setProfile(next);
        setFailed(false);
        if (!next) return;
        const stored = localStorage.getItem(MODE_KEY);
        if (stored === "tech" && next.shop) setModeState("tech");
        else if (stored === "client") setModeState("client");
        else setModeState(next.role === "technician" && next.shop ? "tech" : "client");
      })
      .catch(() => {
        if (!cancel) {
          setProfile(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [isPending, userId]);

  const setMode = (next: Mode) => {
    setModeState(next);
    localStorage.setItem(MODE_KEY, next);
  };

  return (
    <PhoneCtx.Provider value={{ profile, loading: isPending || loading, failed, mode, setMode, refresh }}>
      {children}
    </PhoneCtx.Provider>
  );
}

export function usePhone() {
  const ctx = useContext(PhoneCtx);
  if (!ctx?.profile) throw new Error("profile");
  return { ...ctx, profile: ctx.profile };
}

export function Gate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const ctx = useContext(PhoneCtx);
  if (isPending || !ctx || ctx.loading) return <Boot />;
  if (!user) return <RedirectToSignIn />;
  if (ctx.failed) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-xl place-items-center px-4 text-center">
        <div className="space-y-3">
          <p className="text-lg font-semibold">تعذر تحميل الحساب</p>
          <p className="text-sm text-muted">جرّب تسجيل الدخول من جديد.</p>
          <Link to="/login" className="inline-flex h-11 items-center rounded-md bg-pine px-4 text-sm font-medium text-pine-ink">
            تسجيل الدخول
          </Link>
        </div>
      </main>
    );
  }
  if (!ctx.profile) return <Onboarding />;
  return children;
}

function Onboarding() {
  const user = useCurrentUser();
  const ctx = useContext(PhoneCtx);
  const [role, setRole] = useState<"client" | "technician" | null>(null);
  const [name, setName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState<string>(AREAS[0].name);
  const [address, setAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [discount, setDiscount] = useState<number>(15);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!role || !ctx) return;
    setBusy(true);
    setError("");
    try {
      await createProfile({
        data: { role, name, phone, address, area, shopName, discount },
      });
      const next = await ctx.refresh();
      if (next?.shop) ctx.setMode("tech");
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-8 pb-16">
      <p className="text-sm text-muted">Phone Touch</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">لمسة</h1>
      <p className="mt-2 text-muted">قبل الطلبات، نحتاج اسمك ورقم تليفونك وعنوانك.</p>
      {role == null ? (
        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium">هتستخدم لمسة إزاي؟</p>
          <button
            type="button"
            className="w-full rounded-xl border border-line bg-bg-elev p-4 text-start transition-opacity duration-150 active:opacity-80"
            onClick={() => setRole("client")}
          >
            <span className="block text-base font-semibold">عايز أصلّح موبايلي</span>
            <span className="mt-1 block text-sm text-muted">دور على محل قريب، اطلب صيانة أو إكسسوار، وتابع الطلب.</span>
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-line bg-bg-elev p-4 text-start transition-opacity duration-150 active:opacity-80"
            onClick={() => setRole("technician")}
          >
            <span className="block text-base font-semibold">عندي محل أو بشتغل فني</span>
            <span className="mt-1 block text-sm text-muted">استقبل الطلبات، حدّد الخصم، واعرض الإكسسوارات.</span>
          </button>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={(e) => void submit(e)}>
          <Field label="الاسم">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
          <Field label="رقم التليفون">
            <TextInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
              required
            />
          </Field>
          <Field label="المنطقة">
            <AreaSelect value={area} onChange={(e) => setArea(e.target.value)}>
              {AREAS.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </AreaSelect>
          </Field>
          <Field label="العنوان">
            <TextInput value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" required />
          </Field>
          {role === "technician" ? (
            <>
              <Field label="اسم المحل">
                <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} required />
              </Field>
              <Field label="خصم الصيانة">
                <AreaSelect value={discount} onChange={(e) => setDiscount(Number(e.target.value))}>
                  {DISCOUNTS.map((n) => (
                    <option key={n} value={n}>
                      {n}%
                    </option>
                  ))}
                </AreaSelect>
              </Field>
            </>
          ) : null}
          <Alert>{error}</Alert>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setRole(null)} disabled={busy}>
              رجوع
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? "لحظة..." : "حفظ وبدء"}
            </Button>
          </div>
        </form>
      )}
      <footer className="fixed inset-x-0 bottom-0 z-20">
        <HouseMark />
      </footer>
    </main>
  );
}

const NAV = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/orders", label: "طلباتي", icon: ClipboardList },
  { to: "/account", label: "حسابي", icon: UserRound },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { mode, setMode, profile } = usePhone();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-3 px-4">
          <Link to="/" className="leading-none">
            <span className="block text-lg font-semibold tracking-tight">لمسة</span>
            <span className="block text-xs text-muted">Phone Touch</span>
          </Link>
          {profile.shop ? (
            <div className="flex rounded-md border border-line bg-bg-elev p-1">
              {(
                [
                  ["client", "عميل"],
                  ["tech", "المحل"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mode === id}
                  className={`h-8 rounded-sm px-3 text-sm font-medium ${mode === id ? "bg-pine text-pine-ink" : "text-muted"}`}
                  onClick={() => {
                    setMode(id);
                    void navigate({ to: "/" });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted">{profile.area}</span>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-40">{children}</main>
      <nav className="dock fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg-elev">
        <HouseMark />
        <div className="mx-auto flex max-w-xl">
          {NAV.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${active ? "text-pine" : "text-muted"}`}
              >
                <Icon className="size-5" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
