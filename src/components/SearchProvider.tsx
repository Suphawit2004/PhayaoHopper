"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  Suspense,
} from "react";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  INITIAL_FILTERS,
  filtersToQuery,
  parseFilters,
  type FilterState,
} from "@/lib/filters-url";

interface SearchContextValue {
  filters: FilterState;
  patch: (p: Partial<FilterState>) => void;
  reset: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

// External store so the URL can seed the state on first client render
// without a cascading setState-in-effect.
const listeners = new Set<() => void>();

let state: FilterState =
  typeof window === "undefined" ? INITIAL_FILTERS : parseFilters(window.location.search);

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): FilterState {
  return state;
}

function getServerSnapshot(): FilterState {
  return INITIAL_FILTERS;
}

function commit(next: FilterState): void {
  state = next;
  for (const notify of listeners) notify();
}

// Small component that reads searchParams; wrapped in Suspense so static
// pages can prerender while this piece defers to client.
function SearchSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== "/cafes" && pathname !== "/map") return;
    const search = searchParams.toString();
    const incoming = parseFilters(`?${search}`);
    if (filtersToQuery(incoming) !== filtersToQuery(state)) {
      commit(incoming);
    }
  }, [pathname, searchParams]);

  return null;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const filters = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const patch = useCallback((p: Partial<FilterState>) => {
    const next = { ...state, ...p };
    commit(next);
    if (window.location.pathname === "/cafes" || window.location.pathname === "/map") {
      const qs = filtersToQuery(next);
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  }, []);

  // Only user edits on the listing write its URL. Navigation reads the URL;
  // it must never replace a detail route or overwrite an incoming shared link.
  const reset = useCallback(() => patch(INITIAL_FILTERS), [patch]);

  const value = useMemo<SearchContextValue>(
    () => ({ filters, patch, reset }),
    [filters, patch, reset]
  );

  return (
    <SearchContext.Provider value={value}>
      <Suspense fallback={null}><SearchSync /></Suspense>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
