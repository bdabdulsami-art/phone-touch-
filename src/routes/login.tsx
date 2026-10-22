import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errMsg } from "@/lib/domain";
import { Alert, Boot, Button, Field, HouseMark, TextInput } from "@/components/ui";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [emailMode, setEmailMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);

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
        setError(result.error.message ?? "تعذر الدخول");
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError(errMsg(err));
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
        <div className="mt-8 space-y-3">
          {GROK_PROVIDERS.map((provider, index) => (
            <Button
              key={provider.providerId}
              variant={index === 0 ? "primary" : "ghost"}
              className="w-full"
              onClick={() => {
                setError("");
                void signIn(provider.providerId, { callbackURL: "/" }).catch((e) => setError(errMsg(e)));
              }}
            >
              {provider.providerId === "grok-google" ? "الدخول بجوجل" : "الدخول بـ X"}
            </Button>
          ))}
          <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => setOpenEmail((v) => !v)}>
            أو بالإيميل
          </button>
          {openEmail ? (
            <form className="space-y-3 rounded-xl border border-line bg-bg-elev p-4" onSubmit={(e) => void onEmail(e)}>
              <div className="flex gap-2">
                <Button variant={emailMode === "in" ? "primary" : "ghost"} onClick={() => setEmailMode("in")}>
                  دخول
                </Button>
                <Button variant={emailMode === "up" ? "primary" : "ghost"} onClick={() => setEmailMode("up")}>
                  حساب جديد
                </Button>
              </div>
              {emailMode === "up" ? (
                <Field label="الاسم">
                  <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
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
            </form>
          ) : null}
          <Alert>{error}</Alert>
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">تسجيل الدخول غير مفعّل.</p>
      )}
      <footer className="fixed inset-x-0 bottom-0 z-20">
        <HouseMark />
      </footer>
    </main>
  );
}
