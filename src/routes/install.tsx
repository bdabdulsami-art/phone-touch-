import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { HouseMark } from "@/components/ui";
import { appWasInstalled, markInstalled } from "@/lib/pwa-install";

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
  const [url, setUrl] = useState("https://phone-touch.vercel.app/install");

  useEffect(() => {
    const pageUrl = `${window.location.origin}/install`;
    setUrl(pageUrl);
    setInstalled(appWasInstalled());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPrompt);
      setInstalled(false);
    };
    const onInstalled = () => {
      markInstalled();
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installed) return;
    if (!promptEvent) {
      document.getElementById("ios-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") {
      markInstalled();
      setInstalled(true);
    }
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

        {installed ? (
          <Link
            to="/"
            className="inline-flex h-14 w-full items-center justify-center rounded-md bg-pine text-base font-medium text-pine-ink"
          >
            افتح التطبيق
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void install()}
            className="inline-flex h-14 w-full items-center justify-center rounded-md bg-pine text-base font-medium text-pine-ink"
          >
            ثبّت التطبيق
          </button>
        )}

        <Link
          to="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-bg-elev text-sm font-medium"
        >
          افتح الموقع
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
