import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createProfile } from "@/lib/api";
import { AREAS, errMsg } from "@/lib/domain";
import { Alert, AreaSelect, Boot, Button, Field, HouseMark, TextInput } from "@/components/ui";

export const Route = createFileRoute("/login")({ component: Login });

function authError(message: string) {
  if (/too many requests/i.test(message)) {
    return "محاولات كتير في وقت قصير. استنى دقيقة وجرب تاني.";
  }
  if (/invalid origin/i.test(message)) {
    return "المتصفح رفض الطلب. حدّث الصفحة وجرب تاني.";
  }
  if (/invalid email or password/i.test(message)) return "الإيميل أو كلمة السر مش صح.";
  if (/user already exists/i.test(message)) return "الحساب ده موجود. ادخل بالإيميل وكلمة السر.";
  return message || "تعذر الدخول";
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [emailMode, setEmailMode] = useState<"in" | "up">("up");
  const [kind, setKind] = useState<"client" | "shop">("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopArea, setShopArea] = useState<string>(AREAS[0].name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stay, setStay] = useState(false);

  if (isPending) return <Boot />;
  if (user && !stay) return <Navigate to="/" />;

  async function claimShop() {
    await createProfile({
      data: {
        role: "technician",
        name,
        phone: shopPhone,
        address: shopAddress,
        area: shopArea,
        shopName,
        discount: 15,
        inviteCode,
      },
    });
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (emailMode === "up" && kind === "shop" && stay && user) {
        await claimShop();
        window.location.href = "/";
        return;
      }
      const result =
        emailMode === "up"
          ? await authClient.signUp.email({ email, password, name, callbackURL: "/" })
          : await authClient.signIn.email({ email, password, callbackURL: "/" });
      if (result.error) {
        setError(authError(result.error.message ?? "تعذر الدخول"));
        setBusy(false);
        return;
      }
      if (emailMode === "up" && kind === "shop") {
        try {
          await claimShop();
        } catch (err) {
          setStay(true);
          setError(errMsg(err));
          setBusy(false);
          return;
        }
      }
      window.location.href = "/";
    } catch (err) {
      setError(authError(errMsg(err)));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4 py-10 pb-16">
      <p className="text-sm text-muted">Phone Touch</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight">صيانة الموبايل، من غير ما تلف.</h1>
      <p className="mt-3 max-w-md text-muted">
        أقرب محل، خصم واضح على الإصلاح، وتتبع للطلب لحد ما الجهاز يرجع. بعد الدخول هتسجّل رقم تليفونك وعنوانك.
      </p>
      {authEnabled ? (
        <form className="mt-8 space-y-3" onSubmit={(e) => void onEmail(e)}>
          <div className="flex gap-2">
            <Button type="button" variant={emailMode === "up" ? "primary" : "ghost"} onClick={() => setEmailMode("up")}>
              حساب جديد
            </Button>
            <Button type="button" variant={emailMode === "in" ? "primary" : "ghost"} onClick={() => setEmailMode("in")}>
              دخول
            </Button>
          </div>
          {emailMode === "up" ? (
            <div className="flex gap-2">
              <Button type="button" variant={kind === "client" ? "primary" : "ghost"} onClick={() => setKind("client")}>
                عميل
              </Button>
              <Button type="button" variant={kind === "shop" ? "primary" : "ghost"} onClick={() => setKind("shop")}>
                محل
              </Button>
            </div>
          ) : null}
          {emailMode === "up" ? (
            <Field label="الاسم">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </Field>
          ) : null}
          {emailMode === "up" && kind === "shop" ? (
            <>
              <Field label="كود الدعوة">
                <TextInput value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoComplete="off" required />
              </Field>
              <Field label="اسم المحل">
                <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} required />
              </Field>
              <Field label="العنوان">
                <TextInput value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} autoComplete="street-address" required />
              </Field>
              <Field label="التليفون">
                <TextInput
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01xxxxxxxxx"
                  required
                />
              </Field>
              <Field label="المنطقة">
                <AreaSelect value={shopArea} onChange={(e) => setShopArea(e.target.value)}>
                  {AREAS.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </AreaSelect>
              </Field>
            </>
          ) : null}
          <Field label="الإيميل">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
          <Field label="كلمة السر">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={emailMode === "up" ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "لحظة..." : emailMode === "up" ? "إنشاء الحساب" : "دخول"}
          </Button>
          <Alert>{error}</Alert>
        </form>
      ) : (
        <p className="mt-8 text-sm text-muted">تسجيل الدخول غير مفعّل.</p>
      )}
      <footer className="fixed inset-x-0 bottom-0 z-20">
        <HouseMark />
      </footer>
    </main>
  );
}
