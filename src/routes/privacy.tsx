import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang, t } from "@/lib/i18n";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Privacy` },
      { name: "description", content: "Privacy policy for the BLAZE Telegram Mini App." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const [lang] = useLang();
  return (
    <div className="min-h-[100dvh] max-w-[480px] mx-auto px-5 py-8">
      <Link to="/" className="text-[var(--ember)] text-sm font-semibold">
        ← {t("back", lang)}
      </Link>
      <h1 className="font-display text-3xl mt-4 text-white ember-text-glow">
        {t("privacyTitle", lang)}
      </h1>
      <p className="mt-4 text-[14px] text-[var(--muted-foreground)] leading-relaxed">
        {t("privacyBody", lang)}
      </p>
      <p className="mt-8 text-[11px] text-[var(--muted-foreground)]">{t("disclaimer", lang)}</p>
    </div>
  );
}
