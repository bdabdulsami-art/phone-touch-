const INSTALLED_KEY = "pt-installed";
const DISMISS_KEY = "pt-install-banner";

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function appWasInstalled() {
  if (typeof window === "undefined") return false;
  return isStandaloneDisplay() || localStorage.getItem(INSTALLED_KEY) === "1";
}

export function markInstalled() {
  localStorage.setItem(INSTALLED_KEY, "1");
}

export function installBannerDismissed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissInstallBanner() {
  localStorage.setItem(DISMISS_KEY, "1");
}
