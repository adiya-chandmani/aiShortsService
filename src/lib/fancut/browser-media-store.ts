'use client';

import type { CutImageState } from '@/types/fancut';

const DB_NAME = 'fancut-studio-media-v1';
const STORE_NAME = 'kv';
const IMAGES_BY_CUT_KEY = 'images-by-cut';

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB를 열지 못했습니다.'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 요청에 실패했습니다.'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>
) {
  const database = await openDatabase();
  if (!database) {
    return null as T;
  }

  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    return await run(store);
  } finally {
    database.close();
  }
}

export async function loadPersistedImagesByCut() {
  const stored = await withStore<Record<string, CutImageState> | undefined | null>('readonly', async (store) => {
    return await requestToPromise(store.get(IMAGES_BY_CUT_KEY));
  });

  if (!stored || typeof stored !== 'object') {
    return {} as Record<string, CutImageState>;
  }

  return stored;
}

export async function persistImagesByCut(imagesByCut: Record<string, CutImageState>) {
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.put(imagesByCut, IMAGES_BY_CUT_KEY));
    return null;
  });
}
