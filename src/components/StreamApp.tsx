import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type AppConfig,
  type NewsItem,
  type BackendMatch,
  trackEvent,
  openChannel,
} from "@/lib/funnel";
import { BRAND } from "@/lib/brand";
import { useLang, t, relTime, LANG_OPTIONS, type Lang } from "@/lib/i18n";
import { tgReady, tgUserId, haptic, openExternal } from "@/lib/telegram";
import heroFemme from "@/assets/hero-femme.jpg";
import interstitialCasino from "@/assets/interstitial-casino.jpg";
import lockMoney from "@/assets/lock-money.jpg";
import marketsTrader from "@/assets/markets-trader.jpg";

type Filter = "hot" | "news" | "live" | "markets";
type NewsCat = "all" | "crypto" | "casino" | "esports";

function pct(n: number | null | undefined, digits = 2) {
  if (n == null || !isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
function fmtPrice(n: number | null | undefined) {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(4)}`;
}

function Wordmark() {
  return (
    <span
      className="font-display text-[28px] leading-none tracking-tight ember-text-glow"
      style={{ color: "var(--ember)" }}
    >
      {BRAND.wordmark}
    </span>
  );
}

function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
      {LANG_OPTIONS.map((l) => (
        <button
          key={l}
          onClick={() => {
            haptic("select");
            setLang(l);
          }}
          className={`px-2 py-1 rounded-md transition ${
            lang === l
              ? "bg-[var(--ember)] text-[var(--primary-foreground)] font-bold"
              : "text-[var(--muted-foreground)] hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function FilterRail({
  filter,
  setFilter,
  lang,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  lang: Lang;
}) {
  const tabs: { id: Filter; label: string; emoji: string }[] = [
    { id: "hot", label: t("hot", lang), emoji: "🔥" },
    { id: "news", label: t("news", lang), emoji: "📰" },
    { id: "live", label: t("live", lang), emoji: "🎮" },
    { id: "markets", label: t("markets", lang), emoji: "📈" },
  ];
  return (
    <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const active = filter === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              haptic("select");
              setFilter(tab.id);
            }}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold tap-95 active:press-95 ${
              active
                ? "bg-[var(--ember)] text-[var(--primary-foreground)] ember-glow"
                : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]"
            }`}
          >
            <span className="mr-1">{tab.emoji}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function NewsThumb({ src, alt }: { src: string | null; alt: string }) {
  const [ok, setOk] = useState(!!src);
  if (!src || !ok) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setOk(false)}
      className="w-20 h-20 rounded-lg object-cover shrink-0 border border-[var(--border)]"
    />
  );
}

function CategoryTag({ cat, lang }: { cat: NewsItem["category"]; lang: Lang }) {
  const map: Record<NewsItem["category"], string> = {
    crypto: t("crypto", lang),
    casino: t("casino", lang),
    esports: t("esports", lang),
  };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{
        background: "color-mix(in oklab, var(--ember) 18%, transparent)",
        color: "var(--ember-hot)",
      }}
    >
      {map[cat]}
    </span>
  );
}

function NewsCard({
  item,
  lang,
  onOpen,
  delayMs,
}: {
  item: NewsItem;
  lang: Lang;
  onOpen: (item: NewsItem) => void;
  delayMs: number;
}) {
  return (
    <button
      onClick={() => onOpen(item)}
      className="surface-card reveal w-full text-left p-3 flex gap-3 tap-95 active:press-95"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <NewsThumb src={item.image} alt={item.title} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <CategoryTag cat={item.category} lang={lang} />
          <span className="text-[11px] text-[var(--muted-foreground)] truncate">
            {item.source} · {relTime(item.published_at, lang)}
          </span>
        </div>
        <h3 className="text-[15px] font-bold leading-snug text-white line-clamp-2">
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-[12.5px] text-[var(--muted-foreground)] mt-1 line-clamp-2">
            {item.summary}
          </p>
        )}
      </div>
    </button>
  );
}

function LockCard({
  cfg,
  lang,
  delayMs,
  fakeTitle,
}: {
  cfg: AppConfig | null;
  lang: Lang;
  delayMs: number;
  fakeTitle: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const fired = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !fired.current) {
            fired.current = true;
            trackEvent("cta_view", { surface: "feed_lock" });
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="reveal surface-card p-4 relative overflow-hidden"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `url(${lockMoney})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(8px) saturate(1.1)",
          transform: "scale(1.1)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--background) 55%, transparent), color-mix(in oklab, var(--background) 85%, transparent)), radial-gradient(circle at 80% 0%, color-mix(in oklab, var(--ember) 30%, transparent), transparent 60%)",
        }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ember-glow"
          style={{
            background: "color-mix(in oklab, var(--ember) 35%, transparent)",
            color: "white",
          }}
        >
          🔒
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--ember-hot)] mb-1 ember-text-glow">
            {t("locked", lang)}
          </div>
          <div
            className="text-[15px] font-bold text-white leading-snug select-none"
            style={{ filter: "blur(5px)" }}
          >
            {fakeTitle}
          </div>
          <button
            onClick={() => {
              haptic("medium");
              openChannel(cfg, "feed_lock");
            }}
            className="mt-3 w-full py-2.5 rounded-xl bg-[var(--ember)] text-[var(--primary-foreground)] font-bold text-sm tap-95 active:press-95 ember-glow"
          >
            {t("unlock", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveChip({ lang }: { lang: Lang }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest"
      style={{ background: "color-mix(in oklab, var(--magenta) 22%, transparent)", color: "var(--magenta)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: "var(--magenta)" }} />
      {t("liveNow", lang)}
    </span>
  );
}

function MatchCard({
  m,
  isLive,
  lang,
  cfg,
  delayMs,
}: {
  m: BackendMatch;
  isLive: boolean;
  lang: Lang;
  cfg: AppConfig | null;
  delayMs: number;
}) {
  const when = m.begin_at ? relTime(m.begin_at, lang) : "";
  return (
    <div className="surface-card reveal p-3.5" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="flex items-center justify-between mb-2 text-[11px] text-[var(--muted-foreground)]">
        <span className="font-semibold uppercase tracking-wider">
          {m.game} {m.league ? `· ${m.league}` : ""}
        </span>
        {isLive ? <LiveChip lang={lang} /> : when && <span>{when}</span>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-right font-display text-lg text-white truncate">{m.team1}</div>
        <div className="px-3 py-1 rounded-lg font-display text-2xl tabular-nums"
          style={{
            background: isLive
              ? "color-mix(in oklab, var(--magenta) 14%, transparent)"
              : "color-mix(in oklab, var(--ember) 10%, transparent)",
            color: "white",
          }}
        >
          {m.score1 ?? "–"} : {m.score2 ?? "–"}
        </div>
        <div className="flex-1 font-display text-lg text-white truncate">{m.team2}</div>
      </div>
      <button
        onClick={() => {
          haptic("medium");
          openChannel(cfg, "live_match");
        }}
        className="mt-3 w-full py-2.5 rounded-xl bg-[var(--ember)] text-[var(--primary-foreground)] font-bold text-sm tap-95 active:press-95 ember-glow"
      >
        {t("joinChannel", lang)} →
      </button>
    </div>
  );
}

function ValueStrip({ lang }: { lang: Lang }) {
  return (
    <div
      className="mx-3 mb-3 px-3 py-2 rounded-xl text-[12px] font-semibold text-center"
      style={{
        background: "color-mix(in oklab, var(--ember) 12%, transparent)",
        color: "var(--ember-hot)",
        border: "1px solid color-mix(in oklab, var(--ember) 28%, transparent)",
      }}
    >
      ✦ {t("whatMembersGet", lang)}
    </div>
  );
}

function MarketsBlock({
  market,
  lang,
  cfg,
}: {
  market: import("@/lib/funnel").NewsMarket | undefined;
  lang: Lang;
  cfg: AppConfig | null;
}) {
  if (!market) return null;
  const fng = market.fng;
  const fngPct = fng ? Math.max(0, Math.min(100, fng.value)) : 0;
  return (
    <div className="px-3 space-y-3">
      <div
        className="reveal relative overflow-hidden rounded-2xl border border-[var(--border)] aspect-[16/9]"
        style={{
          backgroundImage: `url(${marketsTrader})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 30%, color-mix(in oklab, var(--background) 95%, transparent) 100%), radial-gradient(ellipse at 80% 0%, color-mix(in oklab, var(--ember) 25%, transparent), transparent 60%)",
          }}
        />
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--ember-hot)] ember-text-glow">
            {t("markets", lang)}
          </div>
          <div className="font-display text-2xl text-white leading-tight ember-text-glow">
            {t("fearGreed", lang)}
          </div>
        </div>
      </div>

      <div className="surface-card reveal p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
            {t("fearGreed", lang)}
          </span>
          {fng && (
            <span className="font-display text-3xl text-white">
              {fng.value}
              <span className="text-sm text-[var(--ember-hot)] ml-2 font-sans">{fng.label}</span>
            </span>
          )}
        </div>
        <div className="h-2.5 rounded-full overflow-hidden bg-[var(--muted)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${fngPct}%`,
              background: "linear-gradient(90deg, var(--magenta), var(--ember), var(--yellow))",
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
              {t("mcap24h", lang)}
            </div>
            <div
              className="font-display text-lg"
              style={{
                color: (market.mcap_change_24h ?? 0) >= 0 ? "var(--ember)" : "var(--magenta)",
              }}
            >
              {pct(market.mcap_change_24h)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
              {t("btcDom", lang)}
            </div>
            <div className="font-display text-lg text-white">
              {market.btc_dominance != null ? `${market.btc_dominance.toFixed(2)}%` : "—"}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            haptic("medium");
            openChannel(cfg, "markets");
          }}
          className="mt-4 w-full py-2.5 rounded-xl bg-[var(--ember)] text-[var(--primary-foreground)] font-bold text-sm tap-95 active:press-95 ember-glow"
        >
          {t("joinChannel", lang)} →
        </button>
      </div>
      {market.coins?.length > 0 && (
        <div className="surface-card p-2">
          {market.coins.slice(0, 12).map((c, i) => (
            <div
              key={c.symbol + i}
              className="flex items-center justify-between px-2 py-2.5 border-b last:border-b-0 border-[var(--border)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {c.image ? (
                  <img src={c.image} alt={c.symbol} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--muted)]" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white">{c.symbol}</div>
                  {c.name && (
                    <div className="text-[10.5px] text-[var(--muted-foreground)] truncate">
                      {c.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm tabular-nums text-white">
                  {fmtPrice(c.price)}
                </div>
                <div
                  className="text-[11px] font-bold tabular-nums"
                  style={{
                    color:
                      (c.change_24h ?? 0) >= 0 ? "var(--ember)" : "var(--magenta)",
                  }}
                >
                  {pct(c.change_24h)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StickyBar({
  cfg,
  lang,
  show,
}: {
  cfg: AppConfig | null;
  lang: Lang;
  show: boolean;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (show && !fired.current) {
      fired.current = true;
      trackEvent("cta_view", { surface: "sticky" });
    }
  }, [show]);
  if (!show) return null;
  const label =
    (cfg?.cta?.label?.[lang] as string | undefined) ?? t("subscribeArrow", lang);
  return (
    <div
      className="fixed left-0 right-0 z-40 px-3 pt-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      <button
        onClick={() => {
          haptic("heavy");
          openChannel(cfg, "sticky");
        }}
        className="animate-heat w-full max-w-[480px] mx-auto block py-4 rounded-2xl text-[17px] font-extrabold tracking-wide text-[var(--primary-foreground)] ember-glow"
        style={{
          background: "linear-gradient(180deg, var(--ember-hot), var(--ember))",
        }}
      >
        {label}
      </button>
    </div>
  );
}

function Interstitial({
  cfg,
  lang,
  onClose,
}: {
  cfg: AppConfig | null;
  lang: Lang;
  onClose: () => void;
}) {
  useEffect(() => {
    trackEvent("cta_view", { surface: "interstitial" });
  }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${interstitialCasino})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--background) 65%, transparent), color-mix(in oklab, var(--background) 92%, transparent))",
        }}
      />
      <div
        className="relative w-full max-w-[480px] celebrate m-3 p-6 text-center rounded-2xl border ember-glow"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--card) 92%, transparent), color-mix(in oklab, var(--background) 95%, transparent))",
          borderColor: "color-mix(in oklab, var(--ember) 40%, var(--border))",
        }}
      >
        <div className="text-5xl mb-3">🔥</div>
        <h2 className="font-display text-2xl sm:text-3xl text-white mb-2 ember-text-glow">
          {t("joinToKeepReading", lang)}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-5">
          {t("whatMembersGet", lang)}
        </p>
        <button
          onClick={() => {
            haptic("heavy");
            trackEvent("cta_tap", { surface: "interstitial" });
            openChannel(cfg, "interstitial");
            onClose();
          }}
          className="w-full py-4 rounded-2xl bg-[var(--ember)] text-[var(--primary-foreground)] font-extrabold ember-glow animate-heat"
        >
          {t("subscribeArrow", lang)}
        </button>
        <button
          onClick={onClose}
          className="mt-3 text-xs text-[var(--muted-foreground)] underline"
        >
          {t("maybeLater", lang)}
        </button>
      </div>
    </div>
  );
}

function Onboarding({ lang, onEnter }: { lang: Lang; onEnter: () => void }) {
  useEffect(() => {
    trackEvent("cta_view", { surface: "onboarding" });
  }, []);
  return (
    <div className="min-h-[100dvh] relative overflow-hidden flex flex-col items-center justify-end px-6 pb-12 text-center">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${heroFemme})`,
          backgroundSize: "cover",
          backgroundPosition: "center 20%",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--background) 35%, transparent) 0%, color-mix(in oklab, var(--background) 55%, transparent) 45%, var(--background) 90%), radial-gradient(ellipse at 50% 100%, color-mix(in oklab, var(--ember) 35%, transparent), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="celebrate inline-block">
          <Wordmark />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-white mt-6 mb-3 ember-text-glow leading-[1.05]">
          {t("onboardTitle", lang)}
        </h1>
        <p className="text-[14px] sm:text-[15px] text-[var(--muted-foreground)] mb-8">
          {t("onboardBody", lang)}
        </p>
        <button
          onClick={() => {
            haptic("heavy");
            onEnter();
          }}
          className="animate-heat w-full px-8 py-4 rounded-2xl bg-[var(--ember)] text-[var(--primary-foreground)] font-extrabold text-lg ember-glow"
        >
          {t("enter", lang)} →
        </button>
        <p className="mt-8 text-[11px] text-[var(--muted-foreground)]">{t("disclaimer", lang)}</p>
      </div>
    </div>
  );
}

function UnlockedToast({ lang, show }: { lang: Lang; show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed top-3 left-0 right-0 z-[70] flex justify-center pointer-events-none px-3">
      <div
        className="celebrate ember-glow px-4 py-2.5 rounded-full font-bold text-sm"
        style={{ background: "var(--ember)", color: "var(--primary-foreground)" }}
      >
        🎉 {t("unlockedToast", lang)}
      </div>
    </div>
  );
}

function Skeletons() {
  return (
    <div className="px-3 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="surface-card p-3 animate-pulse">
          <div className="h-3 w-24 bg-[var(--muted)] rounded mb-2" />
          <div className="h-4 w-full bg-[var(--muted)] rounded mb-1.5" />
          <div className="h-4 w-2/3 bg-[var(--muted)] rounded" />
        </div>
      ))}
    </div>
  );
}

const FAKE_HEADLINES = [
  "Insider leak: major exchange to list new token at midnight",
  "Top esports org signs star player — full breakdown inside",
  "Casino regulator drops surprise ruling that changes the game",
  "Whale wallet moves $480M — what it means for the next 24h",
];

export default function StreamApp() {
  const qc = useQueryClient();
  const [lang, setLang] = useLang();
  const [filter, setFilter] = useState<Filter>("hot");
  const [newsCat, setNewsCat] = useState<NewsCat>("all");
  const [onboarded, setOnboarded] = useState(false);
  const [opensCount, setOpensCount] = useState(0);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [interstitialShown, setInterstitialShown] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [unlockToast, setUnlockToast] = useState(false);

  useEffect(() => {
    tgReady();
    try {
      setOnboarded(window.localStorage.getItem("mp_onboarded") === "1");
    } catch {}
  }, []);

  const cfgQ = useQuery({ queryKey: ["config"], queryFn: api.config, staleTime: 5 * 60_000 });
  const cfg = cfgQ.data ?? null;

  const newsQ = useQuery({
    queryKey: ["news", filter === "news" ? newsCat : "all"],
    queryFn: () => api.news(filter === "news" ? newsCat : "all", 40),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
    enabled: filter !== "live",
  });
  const liveQ = useQuery({
    queryKey: ["live"],
    queryFn: api.live,
    refetchInterval: 60_000,
    enabled: filter === "hot" || filter === "live",
  });
  const upQ = useQuery({
    queryKey: ["upcoming"],
    queryFn: api.upcoming,
    refetchInterval: 5 * 60_000,
    enabled: filter === "live",
  });

  const uid = tgUserId();
  const memQ = useQuery({
    queryKey: ["membership", uid],
    queryFn: () => api.membership(uid),
    refetchInterval: 2 * 60_000,
    staleTime: 30_000,
  });

  const prevMember = useRef<boolean | null>(null);
  useEffect(() => {
    const isMember = memQ.data?.member === true;
    if (prevMember.current === false && isMember) {
      setUnlockToast(true);
      haptic("success");
      setTimeout(() => setUnlockToast(false), 3000);
    }
    if (memQ.data) prevMember.current = isMember;
  }, [memQ.data]);

  // Unlock-on-return: re-check membership on focus/visibility
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: ["membership"] });
      }
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [qc]);

  // Gating decision (client-side only)
  const gateOn = !!(cfg?.cta?.gate ?? memQ.data?.gate?.enabled);
  const isMember = uid != null && memQ.data?.gate?.is_member === true;
  const gated = gateOn && !isMember;

  // Interstitial trigger
  useEffect(() => {
    if (
      gated &&
      !interstitialShown &&
      (opensCount >= 3 || scrollDepth >= 8)
    ) {
      setShowInterstitial(true);
      setInterstitialShown(true);
    }
  }, [opensCount, scrollDepth, gated, interstitialShown]);

  const openItem = useCallback((item: NewsItem) => {
    haptic("light");
    trackEvent("cta_tap", { surface: "feed_item", source: item.source });
    setOpensCount((n) => n + 1);
    openExternal(item.url);
  }, []);

  // Pull-to-refresh (simple touch)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullY, setPullY] = useState(0);
  const startY = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    haptic("medium");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["news"] }),
      qc.invalidateQueries({ queryKey: ["live"] }),
      qc.invalidateQueries({ queryKey: ["upcoming"] }),
      qc.invalidateQueries({ queryKey: ["membership"] }),
    ]);
    setRefreshing(false);
    setPullY(0);
  }, [qc]);

  const onTouchStart = (e: React.TouchEvent) => {
    if ((window.scrollY || document.documentElement.scrollTop) <= 0)
      startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPullY(Math.min(80, dy * 0.5));
  };
  const onTouchEnd = () => {
    if (pullY > 60) refreshAll();
    else setPullY(0);
    startY.current = null;
  };

  // Window scroll depth (the page scrolls on body, not the inner container)
  useEffect(() => {
    const onScroll = () => {
      const total = window.scrollY + window.innerHeight;
      const depth = Math.floor(total / 220);
      setScrollDepth((d) => (depth > d ? depth : d));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!onboarded) {
    return (
      <>
        <Onboarding
          lang={lang}
          onEnter={() => {
            try {
              window.localStorage.setItem("mp_onboarded", "1");
            } catch {}
            setOnboarded(true);
          }}
        />
        <div className="fixed top-3 right-3">
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>
      </>
    );
  }

  const newsItems = newsQ.data?.items ?? [];
  const liveMatches = liveQ.data?.matches ?? [];
  const upcoming = upQ.data?.matches ?? [];
  const updatedAt = newsQ.data?.updated_at;

  function renderHot() {
    if (newsQ.isLoading && liveQ.isLoading) return <Skeletons />;
    const cards: React.ReactNode[] = [];
    let idx = 0;
    let visibleCount = 0;
    liveMatches.slice(0, 3).forEach((m, i) => {
      cards.push(
        <MatchCard
          key={`l${i}`}
          m={m}
          isLive
          lang={lang}
          cfg={cfg}
          delayMs={idx++ * 40}
        />,
      );
      visibleCount++;
    });
    const news = newsItems;
    news.forEach((n, i) => {
      const lockedHere = gated && visibleCount >= 2 && (visibleCount - 2) % 4 === 0 && visibleCount > 2;
      if (lockedHere) {
        cards.push(
          <LockCard
            key={`lk${i}`}
            cfg={cfg}
            lang={lang}
            delayMs={idx++ * 40}
            fakeTitle={FAKE_HEADLINES[i % FAKE_HEADLINES.length]}
          />,
        );
        visibleCount++;
      }
      cards.push(
        <NewsCard key={n.id} item={n} lang={lang} onOpen={openItem} delayMs={idx++ * 40} />,
      );
      visibleCount++;
    });
    if (cards.length === 0) {
      return <Empty label={t("noNews", lang)} />;
    }
    return <div className="px-3 space-y-3">{cards}</div>;
  }

  function renderNews() {
    if (newsQ.isLoading) return <Skeletons />;
    if (newsQ.isError) return <Empty label={t("loadError", lang)} />;
    if (newsItems.length === 0) return <Empty label={t("noNews", lang)} />;
    const cards: React.ReactNode[] = [];
    let idx = 0;
    let visibleCount = 0;
    newsItems.forEach((n, i) => {
      const lockedHere = gated && visibleCount >= 2 && (visibleCount - 2) % 4 === 0 && visibleCount > 2;
      if (lockedHere) {
        cards.push(
          <LockCard
            key={`lk${i}`}
            cfg={cfg}
            lang={lang}
            delayMs={idx++ * 40}
            fakeTitle={FAKE_HEADLINES[i % FAKE_HEADLINES.length]}
          />,
        );
        visibleCount++;
      }
      cards.push(
        <NewsCard key={n.id} item={n} lang={lang} onOpen={openItem} delayMs={idx++ * 40} />,
      );
      visibleCount++;
    });
    return <div className="px-3 space-y-3">{cards}</div>;
  }

  function renderLive() {
    if (liveQ.isLoading && upQ.isLoading) return <Skeletons />;
    if (liveMatches.length === 0 && upcoming.length === 0)
      return <Empty label={t("noMatches", lang)} />;
    let idx = 0;
    return (
      <div className="px-3 space-y-3">
        {liveMatches.map((m, i) => (
          <MatchCard key={`l${i}`} m={m} isLive lang={lang} cfg={cfg} delayMs={idx++ * 40} />
        ))}
        {upcoming.length > 0 && (
          <div className="pt-3 pb-1 px-1 text-[11px] uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
            {t("upcoming", lang)}
          </div>
        )}
        {upcoming.map((m, i) => (
          <MatchCard key={`u${i}`} m={m} isLive={false} lang={lang} cfg={cfg} delayMs={idx++ * 40} />
        ))}
      </div>
    );
  }

  function renderMarkets() {
    if (newsQ.isLoading) return <Skeletons />;
    return <MarketsBlock market={newsQ.data?.market} lang={lang} cfg={cfg} />;
  }

  function NewsSubChips() {
    if (filter !== "news") return null;
    const chips: { id: NewsCat; label: string }[] = [
      { id: "all", label: t("all", lang) },
      { id: "crypto", label: t("crypto", lang) },
      { id: "casino", label: t("casino", lang) },
      { id: "esports", label: t("esports", lang) },
    ];
    return (
      <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
        {chips.map((c) => {
          const active = newsCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                haptic("select");
                setNewsCat(c.id);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12.5px] font-semibold ${
                active
                  ? "bg-white text-black"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)]"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="min-h-[100dvh] max-w-[480px] mx-auto pb-36 relative"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[color-mix(in_oklab,var(--background)_85%,transparent)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <Wordmark />
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>
        <FilterRail filter={filter} setFilter={setFilter} lang={lang} />
        <NewsSubChips />
        {updatedAt && (
          <div className="px-3 pb-2 text-[10.5px] text-[var(--muted-foreground)] flex items-center justify-between">
            <span>
              {t("updated", lang)} {relTime(updatedAt, lang)}
            </span>
            {refreshing && <span>{t("refreshing", lang)}</span>}
          </div>
        )}
      </header>

      {/* Pull indicator */}
      {pullY > 0 && (
        <div
          className="flex items-center justify-center text-[var(--ember)] text-xl font-display"
          style={{ height: pullY, transition: refreshing ? "height .2s" : undefined }}
        >
          🔥
        </div>
      )}

      {gated && <ValueStrip lang={lang} />}

      {filter === "hot" && renderHot()}
      {filter === "news" && renderNews()}
      {filter === "live" && renderLive()}
      {filter === "markets" && renderMarkets()}

      <footer className="mt-8 px-4 text-center text-[11px] text-[var(--muted-foreground)] space-y-2">
        <div>{t("disclaimer", lang)}</div>
        <div>
          <a href="/privacy" className="underline">
            {t("privacy", lang)}
          </a>
        </div>
        <div className="opacity-50">© {new Date().getFullYear()} {BRAND.name}</div>
      </footer>

      <StickyBar cfg={cfg} lang={lang} show={gated} />
      {showInterstitial && gated && (
        <Interstitial cfg={cfg} lang={lang} onClose={() => setShowInterstitial(false)} />
      )}
      <UnlockedToast lang={lang} show={unlockToast} />
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="mx-3 surface-card p-8 text-center text-[var(--muted-foreground)]">
      {label}
    </div>
  );
}
