import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errMsg } from "@/lib/domain";
import { Alert, Boot, Button, Field, HouseMark, TextInput } from "@/components/ui";

export const Route = createFileRoute("/login")({ component: Login });

function authError(err: unknown): string {
  const message = errMsg(err);
  if (/too many requests/i.test(message)) return "محاولات كتير في وقت قصير. استنى دقيقة وجرب تاني.";
  if (/invalid origin/i.test(message)) return "الموقع مش مسموح له يسجّل الدخول من العنوان ده.";
  if (/invalid email or password|invalid credentials/i.test(message)) return "الإيميل أو كلمة السر غير صحيحة.";
  if (/user already exists/i.test(message)) return "الإيميل ده متسجل قبل كده. ادخل بدل ما تعمل حساب جديد.";
  return message || "تعذر الدخول";
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [emailMode, setEmailMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return <Boot />;
  if (user) return <Navigate to="/" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        emailMode === "up"
          ? await authClient.signUp.email({ email, password, name, callbackURL: "/" })
          : await authClient.signIn.email({ email, password, callbackURL: "/" });
      if (result.error) {
        setError(authError(result.error.message));
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError(authError(err));
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
        <form className="mt-8 space-y-3 rounded-xl border border-line bg-bg-elev p-4" onSubmit={(e) => void onEmail(e)}>
          <div className="flex gap-2">
            <Button variant={emailMode === "up" ? "primary" : "ghost"} onClick={() => setEmailMode("up")}>
              حساب جديد
            </Button>
            <Button variant={emailMode === "in" ? "primary" : "ghost"} onClick={() => setEmailMode("in")}>
              دخول
            </Button>
          </div>
          {emailMode === "up" ? (
            <Field label="الاسم">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </Field>
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
