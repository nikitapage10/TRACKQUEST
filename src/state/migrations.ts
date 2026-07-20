import { SCHEMA_VERSION } from '../config';
import type { RootState } from '../types';

export function migrate(raw: RootState): RootState {
  const version = raw?.meta?.schemaVersion ?? 0;
  let state = raw;
  if (version < 1) {
    state = {
      ...state,
      meta: {
        schemaVersion: SCHEMA_VERSION,
        createdAt: state.meta?.createdAt ?? Date.now(),
        lastOpenedAt: state.meta?.lastOpenedAt ?? Date.now(),
      },
      reports: state.reports ?? [],
    };
  }
  // future migrations go here — never wipe
  return {
    ...state,
    meta: { ...state.meta, schemaVersion: SCHEMA_VERSION },
  };
}
