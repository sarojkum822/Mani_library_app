import React, { createContext, useMemo } from 'react';

type Ctx = {
  resolvedScheme: 'light';
};

export const AppColorSchemeContext = createContext<Ctx | null>(null);

/** App uses light mode only (no user theme picker for now). */
export function AppColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ resolvedScheme: 'light' as const }), []);
  return <AppColorSchemeContext.Provider value={value}>{children}</AppColorSchemeContext.Provider>;
}
