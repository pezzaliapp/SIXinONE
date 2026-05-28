/**
 * Tiny rolling log of the last cassette imports/exports, kept in IndexedDB
 * so users can see what tape they last ran. Bounded to the most recent N
 * entries (default 3 — what the Memorymoog Plus could realistically
 * remember on the tape jack).
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'sixinone-bank';
const DB_VERSION = 1;
const STORE = 'history';
const MAX_ENTRIES = 3;

export interface BankHistoryEntry {
  id?: number;
  kind: 'import' | 'export';
  at: number;
  count: number;
}

interface Schema {
  [STORE]: { key: number; value: BankHistoryEntry };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveBankHistory(entry: BankHistoryEntry): Promise<void> {
  const database = await db();
  await database.add(STORE, entry);
  // Trim to last MAX_ENTRIES (oldest first).
  const all = await database.getAll(STORE);
  if (all.length > MAX_ENTRIES) {
    const toDelete = all
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      .slice(0, all.length - MAX_ENTRIES);
    for (const row of toDelete) {
      if (row.id !== undefined) await database.delete(STORE, row.id);
    }
  }
}

export async function loadBankHistory(): Promise<BankHistoryEntry[]> {
  const database = await db();
  const all = await database.getAll(STORE);
  return all.sort((a, b) => b.at - a.at).slice(0, MAX_ENTRIES);
}
