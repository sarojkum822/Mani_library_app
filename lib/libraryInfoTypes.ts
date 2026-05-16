import type bundled from '@/data/libraryInfo.json';

/** Canonical public library profile (bundled + optional live refresh from website API). */
export type LibraryInfoJson = typeof bundled;
