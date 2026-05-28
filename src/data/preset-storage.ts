/**
 * IndexedDB persistence for user-modified presets. Uses `idb` for a
 * promise-friendly wrapper. One object store keyed by preset number.
 *
 * The factory bank is the floor; whatever is in storage rides on top.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Preset } from './preset';
import { deserializePreset, serializePreset } from './preset';

const DB_NAME = 'sixinone';
const DB_VERSION = 1;
const STORE = 'user-presets';

interface DBSchema {
  [STORE]: { key: number; value: { number: number; modifiedAt: number; payload: ReturnType<typeof serializePreset> } };
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

function db(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'number' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveUserPreset(p: Preset): Promise<void> {
  const database = await db();
  await database.put(STORE, {
    number: p.number,
    modifiedAt: Date.now(),
    payload: serializePreset(p),
  });
}

export async function loadUserPreset(number: number): Promise<Preset | null> {
  const database = await db();
  const row = await database.get(STORE, number);
  if (!row) return null;
  try {
    return deserializePreset(row.payload);
  } catch (err) {
    console.warn(`Stored preset ${number} failed to load`, err);
    return null;
  }
}

export async function loadAllUserPresets(): Promise<Preset[]> {
  const database = await db();
  const rows = await database.getAll(STORE);
  return rows
    .map((r) => {
      try {
        return deserializePreset(r.payload);
      } catch {
        return null;
      }
    })
    .filter((p): p is Preset => p !== null);
}

export async function deleteUserPreset(number: number): Promise<void> {
  const database = await db();
  await database.delete(STORE, number);
}

export async function exportAllAsJson(): Promise<string> {
  const presets = await loadAllUserPresets();
  return JSON.stringify(
    {
      schema: 'sixinone-user-presets-v1',
      exportedAt: new Date().toISOString(),
      presets: presets.map(serializePreset),
    },
    null,
    2,
  );
}

export async function importFromJson(json: string): Promise<number> {
  const data = JSON.parse(json) as { schema?: string; presets?: ReturnType<typeof serializePreset>[] };
  if (data.schema !== 'sixinone-user-presets-v1' || !data.presets) {
    throw new Error('Unsupported import format');
  }
  let count = 0;
  for (const ser of data.presets) {
    const p = deserializePreset(ser);
    await saveUserPreset(p);
    count++;
  }
  return count;
}
