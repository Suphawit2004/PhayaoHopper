"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/i18n/LangProvider";

type MenuItem = { id: string; name: string; price: number | null; photo_url: string | null; available: boolean };

export default function LiveMenu({ slug }: { slug: string }) {
  const { t } = useLang();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let active = true;

    const refresh = async () => {
      try {
        const result = await sb
          .from("menu_items")
          .select("id,name:name_th,price,photo_url,available:is_available")
          .eq("cafe_slug", slug)
          .order("created_at");

        if (active) {
          setError(result.error ? t("menu.loadError") : "");
          if (!result.error) setItems(result.data ?? []);
        }
      } catch {
        if (active) setError(t("menu.connectError"));
      }
    };

    void refresh();
    const channel = sb
      .channel(`menu-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      void sb.removeChannel(channel);
    };
  }, [slug, t]);

  return (
    <section className="feature-card">
      <h2 className="text-xl font-bold">{t("menu.title")}</h2>
      {error ? (
        <p role="status" className="mt-2 text-sm text-rose-600">
          {error}
        </p>
      ) : !items.length ? (
        <p className="mt-3 text-sm text-espresso/60">{t("menu.empty")}</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl bg-[#faf8f3] p-4">
              {item.photo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.photo_url}
                  alt={item.name}
                  className="mb-3 aspect-[4/3] w-full rounded-lg object-cover"
                />
              )}
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-espresso/70">
                {item.price === null
                  ? t("menu.askPrice")
                  : `฿${Number(item.price).toLocaleString("th-TH")}`}
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  item.available ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {item.available ? t("menu.available") : t("menu.soldOut")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
