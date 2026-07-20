import { get, set, del, createStore } from 'idb-keyval';
import type { RootState } from '../types';
import { SCHEMA_VERSION } from '../config';
import { migrate } from './migrations';

const metaStore = createStore('trackquest-meta', 'kv');
const blobStore = createStore('trackquest-blobs', 'blobs');

const STATE_KEY = 'root';

export async function loadState(): Promise<RootState | null> {
  const raw = await get<RootState>(STATE_KEY, metaStore);
  if (!raw) return null;
  return migrate(raw);
}

export async function saveState(state: RootState): Promise<void> {
  const serializable = sanitizeForIdb(state);
  await set(STATE_KEY, serializable, metaStore);
}

export async function clearState(): Promise<void> {
  await del(STATE_KEY, metaStore);
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  await set(id, blob, blobStore);
}

export async function loadBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, blobStore);
}

export async function deleteBlob(id: string): Promise<void> {
  await del(id, blobStore);
}

/** Strip non-cloneable fields; blobs are stored separately by id */
function sanitizeForIdb(state: RootState): RootState {
  return JSON.parse(JSON.stringify(state)) as RootState;
}

export async function exportBundle(state: RootState): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file('state.json', JSON.stringify(state));
  const blobsFolder = zip.folder('blobs')!;
  // Collect blob ids from state
  const ids = new Set<string>();
  for (const s of state.songs) {
    if (s.coverImageId) ids.add(s.coverImageId);
    for (const m of s.memos) if (m.audioId) ids.add(m.audioId);
    for (const v of s.versions) if (v.audioId) ids.add(v.audioId);
  }
  for (const id of ids) {
    const b = await loadBlob(id);
    if (b) {
      const buf = await b.arrayBuffer();
      blobsFolder.file(id, buf);
    }
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function importBundle(file: Blob): Promise<RootState> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const stateStr = await zip.file('state.json')!.async('string');
  const state = migrate(JSON.parse(stateStr) as RootState);
  const folder = zip.folder('blobs');
  if (folder) {
    const tasks: Promise<void>[] = [];
    folder.forEach((path, entry) => {
      if (entry.dir) return;
      tasks.push(
        entry.async('blob').then((b) => saveBlob(path, b)),
      );
    });
    await Promise.all(tasks);
  }
  await saveState(state);
  return state;
}

export { SCHEMA_VERSION, blobStore, metaStore };
