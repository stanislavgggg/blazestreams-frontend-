// Telegram WebApp helpers — degrade gracefully outside Telegram.
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initDataUnsafe?: { user?: { id?: number; language_code?: string } };
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string) => void;
        HapticFeedback?: {
          impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          selectionChanged?: () => void;
          notificationOccurred?: (type: "error" | "success" | "warning") => void;
        };
        themeParams?: Record<string, string>;
        colorScheme?: "light" | "dark";
        onEvent?: (event: string, cb: () => void) => void;
      };
    };
  }
}

export function tgWebApp() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

export function tgUserId(): number | null {
  const id = tgWebApp()?.initDataUnsafe?.user?.id;
  return typeof id === "number" ? id : null;
}

export function tgReady() {
  const w = tgWebApp();
  try {
    w?.ready?.();
    w?.expand?.();
  } catch {}
}

export function haptic(kind: "light" | "medium" | "heavy" | "select" | "success" = "light") {
  try {
    const hf = tgWebApp()?.HapticFeedback;
    if (!hf) return;
    if (kind === "select") hf.selectionChanged?.();
    else if (kind === "success") hf.notificationOccurred?.("success");
    else hf.impactOccurred?.(kind);
  } catch {}
}

export function openTelegram(url: string) {
  const w = tgWebApp();
  try {
    if (w?.openTelegramLink) w.openTelegramLink(url);
    else if (typeof window !== "undefined") window.open(url, "_blank");
  } catch {
    if (typeof window !== "undefined") window.open(url, "_blank");
  }
}

export function openExternal(url: string) {
  const w = tgWebApp();
  try {
    if (w?.openLink) w.openLink(url);
    else if (typeof window !== "undefined") window.open(url, "_blank");
  } catch {
    if (typeof window !== "undefined") window.open(url, "_blank");
  }
}
