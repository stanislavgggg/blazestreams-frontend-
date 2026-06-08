import { createFileRoute } from "@tanstack/react-router";
import StreamApp from "@/components/StreamApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BLAZE — News that burns first" },
      {
        name: "description",
        content: "Breaking crypto, casino and esports news plus live scores in one feed.",
      },
      { property: "og:title", content: "BLAZE" },
      { property: "og:description", content: "Breaking news + live scores in one feed." },
    ],
  }),
  component: StreamApp,
});
