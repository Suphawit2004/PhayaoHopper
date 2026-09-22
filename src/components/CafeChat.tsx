"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/i18n/LangProvider";
import { DAY_KEYS } from "@/i18n/dictionaries";

type LocalizedText = { th: string; en: string };

type CafeSummary = {
  slug: string;
  name: LocalizedText | string;
  openTime: string;
  closeTime: string;
  closedDays: number[];
  address: LocalizedText | string;
};

type Reply = {
  message: string;
  mode: string;
  provider?: string | null;
  fallbackReason?: string;
  cafes: CafeSummary[];
};

export default function CafeChat() {
  const { lang, t, tr } = useLang();
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<{ question: string; reply: Reply }[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const quickPrompts = [
    t("chat.prompt1"),
    t("chat.prompt2"),
    t("chat.prompt3"),
  ];

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/cafe-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, lang }),
        signal: AbortSignal.timeout(35000),
      });

      if (!response.ok) throw new Error();
      const reply: Reply = await response.json();
      setTurns((old) => [...old.slice(-19), { question: trimmed, reply }]);
      setQuery("");
    } catch {
      setError(t("chat.error"));
    } finally {
      setPending(false);
    }
  }

  const resolveText = (val: LocalizedText | string): string => {
    if (!val) return "";
    return typeof val === "object" ? tr(val) : val;
  };

  return (
    <div className="feature-page chat-page mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-espresso">{t("chat.title")}</h1>
        <p className="mt-2 text-espresso/70">{t("chat.subtitle")}</p>
      </header>

      {/* Quick Prompts */}
      <div className="mt-4 flex flex-wrap gap-2">
        {quickPrompts.map((q) => (
          <button
            key={q}
            type="button"
            className="rounded-full border border-[#d9c9ac] bg-white/80 px-4 py-2 text-xs font-semibold text-coffee shadow-xs transition hover:border-coffee hover:bg-sand/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            onClick={() => void send(q)}
          >
            ✨ {q}
          </button>
        ))}
      </div>

      {/* Chat Log */}
      <div role="log" aria-live="polite" className="my-6 space-y-6">
        {turns.map((turn, index) => (
          <div key={index} className="space-y-3">
            {/* User Question */}
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl bg-coffee px-5 py-3.5 text-sm leading-relaxed text-cream shadow-sm">
                {turn.question}
              </p>
            </div>

            {/* Assistant Response */}
            <div className="feature-card !mt-0 rounded-2xl border border-[#eadfcd] bg-white p-5 shadow-xs">
              <p className="text-sm leading-relaxed text-espresso/90">{turn.reply.message}</p>
              <p className="mt-2 text-xs font-medium text-coffee">
                {turn.reply.mode === "ai" ? t("chat.sourceAi") : t("chat.sourceCatalog")}
              </p>

              {turn.reply.cafes && turn.reply.cafes.length > 0 && (
                <ul className="mt-4 divide-y divide-[#eadfcd] border-t border-[#eadfcd]">
                  {turn.reply.cafes.map((c) => (
                    <li key={c.slug} className="py-3.5">
                      <Link
                        className="font-semibold text-espresso transition hover:text-coffee hover:underline"
                        href={`/cafes/${c.slug}`}
                      >
                        {resolveText(c.name)} →
                      </Link>
                      <p className="mt-1 text-xs text-espresso/70">
                        🕒 {c.openTime} – {c.closeTime}
                        {c.closedDays && c.closedDays.length > 0
                          ? ` · ${t("chat.closedOn")}${c.closedDays.map((d) => t(DAY_KEYS[d])).join(", ")}`
                          : ""}
                      </p>
                      {c.address && (
                        <p className="mt-0.5 text-xs text-espresso/60">
                          📍 {resolveText(c.address)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {pending && (
          <div className="flex items-center gap-2 rounded-2xl border border-[#eadfcd] bg-white/70 p-4 text-xs font-semibold text-coffee">
            <span className="inline-block size-2 animate-ping rounded-full bg-coffee" />
            <span>{t("chat.searching")}</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        className="feature-form feature-card mt-6 rounded-2xl border border-[#eadfcd] bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void send(query);
        }}
      >
        <label className="block text-sm font-semibold text-espresso">
          {t("chat.questionLabel")}
          <textarea
            className="mt-2 block w-full rounded-xl border border-[#d9c9ac] bg-[#faf8f3] p-3 text-sm text-espresso placeholder-espresso/40 transition focus:border-coffee focus:outline-hidden focus:ring-2 focus:ring-coffee/20 disabled:opacity-60"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            maxLength={500}
            required
            placeholder={t("chat.placeholder")}
            disabled={pending}
          />
        </label>
        <div className="mt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={pending || !query.trim()}
            className="rounded-xl bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? t("chat.searching") : t("chat.submit")}
          </button>
          {error && (
            <p role="status" className="text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
