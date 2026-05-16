import React, { createContext, useContext, useEffect, useState } from 'react';

import bundled from '@/data/libraryInfo.json';
import { api } from '@/lib/api';
import type { LibraryInfoJson } from '@/lib/libraryInfoTypes';

const LibraryInfoContext = createContext<LibraryInfoJson>(bundled as LibraryInfoJson);

export function LibraryInfoProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<LibraryInfoJson>(bundled as LibraryInfoJson);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await api.publicLibraryInfo();
        if (!cancelled && next) setInfo(next);
      } catch {
        /* keep bundled snapshot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <LibraryInfoContext.Provider value={info}>{children}</LibraryInfoContext.Provider>;
}

export function useLibraryInfo(): LibraryInfoJson {
  return useContext(LibraryInfoContext);
}
