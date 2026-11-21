import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { HouseMark } from "@/components/ui";
import { isStandaloneDisplay, markInstalled } from "@/lib/pwa-install";

const SHARE_BLURB = "ثبّت لمسة على موبايلك: أقرب محل صيانة، خصم واضح، وتتبع للطلب لحد ما الجهاز يرجع.";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Phase = "ready" | "installing" | "installed";

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
  const [phase, setPhase] = useState<Phase>("ready");
  const [promptEvent, setPromptEvent] = useState<InstallPrompt | null>(null);
  const [url, setUrl] = useState("https://phone-touch.vercel.app/install");
  const waitRef = useRef(0);

  useEffect(() => {
    const pageUrl = `${window.location.origin}/install`;
    setUrl(pageUrl);
    let cancel = false;

    if (isStandaloneDisplay()) setPhase("installed");

    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<unknown[]>;
    };
    if (nav.getInstalledRelatedApps) {
      nav
        .getInstalledRelatedApps()
        .then((apps) => {
          if (cancel || !Array.isArray(apps) || apps.length === 0) return;
          markInstalled();
          setPhase("installed");
        })
        .catch(() => {});
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
    };
    const onInstalled = () => {
      window.clearTimeout(waitRef.current);
      markInstalled();
      setPromptEvent(null);
      setPhase("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancel = true;
      window.clearTimeout(waitRef.current);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (phase !== "ready") return;
    if (!promptEvent) {
      document.getElementById("ios-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome !== "accepted") return;
    setPhase((current) => (current === "installed" ? current : "installing"));
    waitRef.current = window.setTimeout(() => {
      setPhase("installed");
    }, 10_000);
  }

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

        {phase === "installed" ? (
          <div className="space-y-2 rounded-md bg-pine px-4 py-4 text-center text-pine-ink">
            <p className="text-base font-medium">تم التثبيت ✓</p>
            <p className="text-sm">افتح لمسة من شاشتك الرئيسية</p>
            <p className="text-xs text-pine-ink/80">أو من قائمة Chrome ⋮ ثم «فتح في التطبيق» لو ظهرت</p>
          </div>
        ) : (
          <button
            type="button"
            disabled={phase === "installing"}
            onClick={() => void install()}
            className="inline-flex h-14 w-full items-center justify-center rounded-md bg-pine text-base font-medium text-pine-ink disabled:opacity-80"
          >
            {phase === "installing" ? "جارٍ التثبيت... ثواني" : "ثبّت التطبيق"}
          </button>
        )}

        <Link
          to="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-bg-elev text-sm font-medium"
        >
          افتح الموقع في المتصفح
        </Link>

        <section id="ios-steps" className="space-y-3 rounded-lg border border-line bg-bg-elev p-4">
          <h2 className="text-base font-semibold">على الآيفون</h2>
          <ol className="space-y-2 text-sm leading-6 text-ink">
            <li>1. افتح الصفحة في Safari.</li>
            <li>2. اضغط زر المشاركة.</li>
            <li>3. اختار «إضافة إلى الشاشة الرئيسية».</li>
          </ol>
        </section>

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
