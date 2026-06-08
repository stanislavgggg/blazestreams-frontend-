// Single source of truth for brand-level values. Rename everything here.
export const BRAND = {
  name: "BLAZE",
  wordmark: "BLAZE",
  tagline: { en: "News that burns first.", ru: "Новости — первыми.", es: "Noticias al rojo vivo." },
  // Hex tokens (kept in sync with src/styles.css ember theme)
  colors: {
    canvas: "#0E0A07",
    orange: "#FF6A00",
    orangeHot: "#FF7A1A",
    magenta: "#FF2D78",
    yellow: "#FFD23F",
  },
  // Build-time fallbacks. Runtime /api/config wins.
  channelHandle: (import.meta.env.VITE_CHANNEL_HANDLE as string | undefined) ?? "blaze_news",
  botUsername: (import.meta.env.VITE_BOT_USERNAME as string | undefined) ?? "blaze_bot",
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? "",
} as const;
