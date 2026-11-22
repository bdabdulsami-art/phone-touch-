import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { HouseMark } from "@/components/ui";
import { clearInstalled, installedFlag, isStandaloneDisplay, markInstalled } from "@/lib/pwa-install";

const SHARE_BLURB = "ثبّت لمسة على موبايلك: أقرب محل صيانة، خصم واضح، وتتبع للطلب لحد ما الجهاز يرجع.";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "ثبّت لمسة — Phone Touch" },
      { name: "description", content: SHARE_BLURB },
    ],
  }),
  component: InstallPage,
});

function InstallPage() {
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(false);
  const [url, setUrl] = useState("https://phone-touch.vercel.app/install");
  const promptSeen = useRef(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/install`);
    let cancel = false;

    if (isStandaloneDisplay()) markInstalled();
    if (installedFlag()) setInstalled(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptSeen.current = true;
      clearInstalled();
      setInstalled(false);
      setPending(false);
      setRetry(false);
      setPromptEvent(event as InstallPrompt);
      setReady(true);
    };
    const onInstalled = () => {
      markInstalled();
      setPromptEvent(null);
      setPending(false);
      setRetry(false);
      setInstalled(true);
      setReady(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => setReady(true), 1000);

    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<unknown[]>;
    };
    if (typeof nav.getInstalledRelatedApps === "function") {
      nav
        .getInstalledRelatedApps()
        .then((apps) => {
          if (cancel || promptSeen.current) return;
          if (Array.isArray(apps) && apps.length > 0) setInstalled(true);
        })
        .catch(() => {});
    }

    return () => {
      cancel = true;
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome === "accepted") setPending(true);
    } catch {
      setPromptEvent(null);
    }
  }

  const knownInstalled = installed && !promptEvent;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${SHARE_BLURB}\n${url}`)}`;

  return (
    <div className="min-h-dvh bg-bg">
      <HouseMark />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center gap-3">
          <img src="/icons/icon-512.png" alt="" className="size-16 rounded-2xl" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">ثبّت لمسة</h1>
            <p className="text-sm text-muted">Phone Touch على الشاشة الرئيسية، من غير شريط المتصفح.</p>
          </div>
        </header>

        {knownInstalled ? (
          <div className="space-y-3">
            <div className="space-y-2 rounded-md bg-pine px-4 py-4 text-center text-pine-ink">
              <p className="text-base font-medium">✓ لمسة مثبّت على جهازك</p>
              <p className="text-sm">افتحه من أيقونة لمسة على الشاشة الرئيسية</p>
            </div>
            <button
              type="button"
              onClick={() => setRetry(true)}
              className="mx-auto block text-sm text-muted underline"
            >
              مش لاقيه؟ ثبّته تاني
            </button>
            {retry ? <InstallSteps /> : null}
          </div>
        ) : promptEvent ? (
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex h-14 w-full items-center justify-center rounded-md bg-pine text-base font-medium text-pine-ink"
          >
            ثبّت التطبيق
          </button>
        ) : pending ? (
          <p className="text-center text-sm text-muted">جارٍ التثبيت... ثواني</p>
        ) : ready ? (
          <InstallSteps />
        ) : (
          <div className="h-14" />
        )}

        <Link
          to="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-bg-elev text-sm font-medium"
        >
          افتح الموقع في المتصفح
        </Link>

        <p className="text-xs leading-5 text-muted">
          لو فتحت لمسة من رابط وفتح في المتصفح: إعدادات الموبايل ← التطبيقات ← لمسة ← الفتح حسب الإعداد
          الافتراضي ← فتح الروابط المدعومة
        </p>

        <section className="space-y-3 rounded-lg border border-line bg-bg-elev p-4 text-center">
          <h2 className="text-base font-semibold">رابط التثبيت</h2>
          <InstallQr value={url} />
          <p className="break-all text-sm text-muted" dir="ltr">
            {url}
          </p>
          <a
            href={whatsapp}
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-bg-elev text-sm font-medium"
          >
            مشاركة على واتساب
          </a>
        </section>
      </main>
    </div>
  );
}

function InstallSteps() {
  return (
    <div className="space-y-3">
      <section className="space-y-3 rounded-lg border border-line bg-bg-elev p-4">
        <h2 className="text-base font-semibold">على أندرويد</h2>
        <ol className="space-y-2 text-sm leading-6 text-ink">
          <li>1. من Chrome اضغط ⋮</li>
          <li>2. اختار «تثبيت التطبيق».</li>
        </ol>
      </section>
      <section className="space-y-3 rounded-lg border border-line bg-bg-elev p-4">
        <h2 className="text-base font-semibold">على الآيفون</h2>
        <ol className="space-y-2 text-sm leading-6 text-ink">
          <li>1. افتح الصفحة في Safari.</li>
          <li>2. اضغط زر المشاركة.</li>
          <li>3. اختار «إضافة إلى الشاشة الرئيسية».</li>
        </ol>
      </section>
    </div>
  );
}

function InstallQr({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancel = false;
    QRCode.toDataURL(value, {
      width: 280,
      margin: 1,
      color: { dark: "#1F4D3A", light: "#FBFAF6" },
    })
      .then((data) => {
        if (!cancel) setSrc(data);
      })
      .catch(() => {
        if (!cancel) setSrc("");
      });
    return () => {
      cancel = true;
    };
  }, [value]);

  if (!src) return <div className="mx-auto size-52 rounded-md bg-line/60" aria-hidden />;
  return <img src={src} alt="رمز QR لرابط التثبيت" className="mx-auto size-52 rounded-md" />;
}
