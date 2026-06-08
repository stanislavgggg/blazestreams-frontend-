import { useEffect, useState } from "react";

export type Lang = "en" | "ru" | "es";
const LANGS: Lang[] = ["en", "ru", "es"];
const STORAGE_KEY = "mp_lang";

export function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("lang");
    if (q && LANGS.includes(q as Lang)) return q as Lang;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LANGS.includes(stored as Lang)) return stored as Lang;
    const tg = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code as
      | string
      | undefined;
    if (tg) {
      const short = tg.slice(0, 2).toLowerCase();
      if (LANGS.includes(short as Lang)) return short as Lang;
    }
    const nav = navigator.language?.slice(0, 2).toLowerCase();
    if (nav && LANGS.includes(nav as Lang)) return nav as Lang;
  } catch {}
  return "en";
}

type Dict = Record<string, { en: string; ru: string; es: string }>;
export const DICT: Dict = {
  hot: { en: "Hot", ru: "Огонь", es: "En llamas" },
  news: { en: "News", ru: "Новости", es: "Noticias" },
  live: { en: "Live", ru: "Лайв", es: "En vivo" },
  markets: { en: "Markets", ru: "Рынки", es: "Mercados" },
  subscribe: { en: "Subscribe", ru: "Подписаться", es: "Suscribirse" },
  subscribeArrow: { en: "Subscribe →", ru: "Подписаться →", es: "Suscribirse →" },
  joinChannel: { en: "Join the channel", ru: "Войти в канал", es: "Unirse al canal" },
  locked: { en: "Members only", ru: "Только для участников", es: "Solo miembros" },
  unlock: { en: "Unlock with one tap", ru: "Откройте в один тап", es: "Desbloquea con un toque" },
  joinToKeepReading: {
    en: "Join to keep reading",
    ru: "Подпишитесь, чтобы продолжить",
    es: "Únete para seguir leyendo",
  },
  maybeLater: { en: "maybe later", ru: "позже", es: "quizás luego" },
  whatMembersGet: {
    en: "Full reads · Live insights · First alerts",
    ru: "Полные статьи · Лайв-аналитика · Первые алерты",
    es: "Lecturas completas · Análisis en vivo · Alertas primero",
  },
  updated: { en: "Updated", ru: "Обновлено", es: "Actualizado" },
  pullToRefresh: { en: "Pull to refresh", ru: "Потяните, чтобы обновить", es: "Tira para actualizar" },
  refreshing: { en: "Refreshing…", ru: "Обновляем…", es: "Actualizando…" },
  crypto: { en: "Crypto", ru: "Крипто", es: "Cripto" },
  casino: { en: "Casino", ru: "Казино", es: "Casino" },
  esports: { en: "Esports", ru: "Киберспорт", es: "Esports" },
  all: { en: "All", ru: "Все", es: "Todo" },
  liveNow: { en: "LIVE", ru: "ЛАЙВ", es: "EN VIVO" },
  upcoming: { en: "Upcoming", ru: "Скоро", es: "Próximos" },
  noMatches: { en: "No matches right now", ru: "Сейчас нет матчей", es: "Sin partidos ahora" },
  noNews: { en: "No headlines yet", ru: "Пока нет новостей", es: "Aún no hay titulares" },
  loadError: { en: "Couldn't load. Try again.", ru: "Не удалось. Попробуйте ещё.", es: "No se pudo cargar." },
  fearGreed: { en: "Fear & Greed", ru: "Страх и жадность", es: "Miedo y codicia" },
  mcap24h: { en: "Market Cap 24h", ru: "Капа 24ч", es: "Cap. mercado 24h" },
  btcDom: { en: "BTC Dominance", ru: "Доминация BTC", es: "Dominio BTC" },
  unlockedToast: {
    en: "You're in — full access unlocked",
    ru: "Готово — полный доступ открыт",
    es: "Listo — acceso completo activado",
  },
  privacy: { en: "Privacy", ru: "Конфиденциальность", es: "Privacidad" },
  privacyTitle: { en: "Privacy Policy", ru: "Политика конфиденциальности", es: "Política de privacidad" },
  privacyBody: {
    en: "We process minimal Telegram data (user id and language) to personalize the experience. No personal data is sold. Analytics is anonymous and used only to improve the product.",
    ru: "Мы обрабатываем минимум данных Telegram (id пользователя и язык) для персонализации. Личные данные не продаются. Аналитика анонимна.",
    es: "Procesamos datos mínimos de Telegram (id de usuario e idioma) para personalizar. No vendemos datos personales. Las analíticas son anónimas.",
  },
  disclaimer: {
    en: "18+ · Informational only. Not financial or betting advice.",
    ru: "18+ · Только информация. Не финансовый и не беттинг совет.",
    es: "18+ · Solo informativo. No es asesoría financiera ni de apuestas.",
  },
  back: { en: "Back", ru: "Назад", es: "Atrás" },
  onboardTitle: {
    en: "Breaking news. Live scores. One feed.",
    ru: "Срочные новости. Лайв-счёт. Одна лента.",
    es: "Noticias urgentes. Marcadores en vivo. Un feed.",
  },
  onboardBody: {
    en: "Crypto, casino, esports — the moment it happens. Subscribe to unlock the full firehose in our Telegram channel.",
    ru: "Крипто, казино, киберспорт — в момент события. Подпишитесь, чтобы открыть полный поток в нашем Telegram-канале.",
    es: "Cripto, casino, esports — al instante. Suscríbete para abrir el flujo completo en nuestro canal de Telegram.",
  },
  enter: { en: "Enter BLAZE", ru: "Войти в BLAZE", es: "Entrar a BLAZE" },
  now: { en: "now", ru: "сейчас", es: "ahora" },
};

export function t(key: keyof typeof DICT, lang: Lang): string {
  return DICT[key]?.[lang] ?? DICT[key]?.en ?? String(key);
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    setLangState(detectLang());
    const onStorage = () => setLangState(detectLang());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const setLang = (l: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    setLangState(l);
  };
  return [lang, setLang];
}

export function relTime(iso: string, lang: Lang): string {
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("now", lang);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export const LANG_OPTIONS: Lang[] = LANGS;
