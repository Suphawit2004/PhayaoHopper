"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, useEffect } from "react";
import type { ReactNode } from "react";
import type { Lang, LocalText } from "@/features/cafes/data/cafes";
import { dictionaries } from "./dictionaries";
import type { DictKey } from "./dictionaries";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: DictKey) => string;
  tr: (text: LocalText) => string;
}

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = "tnl-lang";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Lang {
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "th";
}

function getServerSnapshot(): Lang {
  return "th";
}

function persist(lang: Lang) {
  window.localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  for (const notify of listeners) notify();
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback((next: Lang) => persist(next), []);
  const toggle = useCallback(() => {
    persist(getSnapshot() === "th" ? "en" : "th");
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      toggle,
      t: (key) => dictionaries[lang][key],
      tr: (text) => text[lang],
    }),
    [lang, setLang, toggle]
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
