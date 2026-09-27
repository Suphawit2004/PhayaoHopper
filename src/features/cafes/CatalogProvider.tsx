"use client";
import { createContext, useContext } from "react";
import type { Cafe } from "@/features/cafes/data/cafes";

const CatalogContext = createContext<Cafe[]>([]);
export function CatalogProvider({ cafes, children }: { cafes: Cafe[]; children: React.ReactNode }) {
  return <CatalogContext.Provider value={cafes}>{children}</CatalogContext.Provider>;
}
export const useCatalog = () => useContext(CatalogContext);
