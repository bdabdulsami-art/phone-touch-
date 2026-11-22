const INSTALLED_KEY = "lamsa_installed";
const LEGACY_KEY = "pt-installed";
const DISMISS_KEY = "pt-install-banner";

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function installedFlag() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INSTALLED_KEY) === "1" || localStorage.getItem(LEGACY_KEY) === "1";
}

export function appWasInstalled() {
  return isStandaloneDisplay() || installedFlag();
}

export function markInstalled() {
  localStorage.setItem(INSTALLED_KEY, "1");
}

export function clearInstalled() {
  localStorage.removeItem(INSTALLED_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

export function installBannerDismissed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissInstallBanner() {
  localStorage.setItem(DISMISS_KEY, "1");
}
