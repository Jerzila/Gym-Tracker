"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/types";

export type Units = "metric" | "imperial";

const UnitsContext = createContext<Units>("metric");

export function UnitsProvider({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  const units = profile?.units ?? "metric";
  return (
    <UnitsContext.Provider value={units}>{children}</UnitsContext.Provider>
  );
}

export function useUnits(): Units {
  return useContext(UnitsContext);
}
