import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { appWasInstalled, dismissInstallBanner, installBannerDismissed } from "@/lib/pwa-install";

export function InstallBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (appWasInstalled() || installBannerDismissed()) return;
    setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div className="border-b border-line bg-bg-elev">
      <div className="mx-auto flex h-12 max-w-xl items-center gap-3 px-4">
        <Link to="/install" className="min-w-0 flex-1 text-sm font-medium text-pine">
          ثبّت التطبيق
        </Link>
        <button
          type="button"
          className="shrink-0 text-sm text-muted"
          aria-label="إغلاق"
          onClick={() => {
            dismissInstallBanner();
            setOpen(false);
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
