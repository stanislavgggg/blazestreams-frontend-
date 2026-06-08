// Single backend module. No component fetches the API directly.
import { BRAND } from "./brand";
import { tgUserId, openTelegram } from "./telegram";

const API_BASE = BRAND.apiBase || "";

function url(path: string): string {
  if (!API_BASE) return path;
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

export type Lang = "en" | "ru" | "es";

export interface AppConfig {
  brand: string;
  display_name: string;
  mode: "product" | "channel";
  cta: {
    label: Partial<Record<Lang, string>>;
    url: string;
    channel: string;
    channel_url: string;
    gate: boolean;
    bot_username: string;
    partner_name: string;
  };
  privacy_url?: string;
}

export interface NewsCoin {
  symbol: string;
  name?: string;
  price: number | null;
  change_24h: number | null;
  image?: string | null;
}
export interface NewsMarket {
  coins: NewsCoin[];
  fng: { value: number; label: string } | null;
  mcap_change_24h: number | null;
  btc_dominance: number | null;
}
export interface NewsItem {
  id: string | number;
  title: string;
  url: string;
  source: string;
  category: "crypto" | "casino" | "esports";
  published_at: string;
  image: string | null;
  summary: string;
}
export interface NewsResponse {
  items: NewsItem[];
  market: NewsMarket;
  updated_at: string;
}

export interface BackendMatch {
  game: string;
  team1: string;
  team2: string;
  league?: string;
  score1?: number | null;
  score2?: number | null;
  begin_at?: string;
  format?: string;
  id?: number | string;
}

export interface BackendGate {
  enabled: boolean;
  locked: boolean;
  is_member: boolean;
  channel: string;
}

export interface MembershipResp {
  uid: number | null;
  member: boolean;
  gate: BackendGate;
  channel: string;
  configured: boolean;
}

async function safeJson<T>(path: string): Promise<T> {
  const res = await fetch(url(path), { credentials: "omit" });
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  config: () => safeJson<AppConfig>("/api/config"),
  news: (category: "all" | "crypto" | "casino" | "esports" = "all", limit = 40) =>
    safeJson<NewsResponse>(`/api/news?category=${category}&limit=${limit}`),
  live: () => safeJson<{ matches: BackendMatch[] }>("/api/live"),
  upcoming: () => safeJson<{ matches: BackendMatch[] }>("/api/upcoming"),
  membership: (uid: number | null) =>
    safeJson<MembershipResp>(`/api/membership${uid != null ? `?uid=${uid}` : ""}`),
  stats: () =>
    safeJson<{ correct: number; total: number; rate: number | null; note: "accumulating" | "real" }>(
      "/api/stats",
    ),
};

export type EventName = "cta_view" | "cta_tap" | "channel_open";
export interface EventMeta {
  surface: "sticky" | "feed_lock" | "interstitial" | "live_match" | "feed_item" | "markets" | "onboarding";
  [k: string]: unknown;
}

// Fire-and-forget event. Never throws.
export function trackEvent(event: EventName, meta: EventMeta) {
  try {
    const body = JSON.stringify({ event, uid: tgUserId() ?? undefined, meta });
    fetch(url("/api/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// Open channel. Fires channel_open first, then prefers config.cta.channel_url
// via Telegram.WebApp.openTelegramLink; falls back to bot start link.
export function openChannel(
  cfg: AppConfig | null,
  surface: EventMeta["surface"],
) {
  trackEvent("channel_open", { surface });
  trackEvent("cta_tap", { surface });
  const channelUrl = cfg?.cta?.channel_url;
  const botUser = cfg?.cta?.bot_username || BRAND.botUsername;
  const target = channelUrl || `https://t.me/${botUser}?start=join`;
  openTelegram(target);
}
