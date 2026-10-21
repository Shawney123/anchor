import type { StoredEvent } from '../domain/events'

const DB_NAME = 'anchor'
const DB_VERSION = 1
const STORE_EVENTS = 'events'
const STORE_SNAPSHOT = 'snapshot'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const store = db.createObjectStore(STORE_EVENTS, { keyPath: 'seq', autoIncrement: true })
        store.createIndex('ts', 'ts')
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) {
        db.createObjectStore(STORE_SNAPSHOT, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 打开失败'))
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'))
      }),
  )
}

export interface Snapshot {
  id: 'current'
  at: number
  /** 已消费的事件数量 */
  count: number
  events: StoredEvent[]
}

export async function loadEvents(): Promise<StoredEvent[]> {
  const all = await tx<StoredEvent[]>(STORE_EVENTS, 'readonly', (s) => s.getAll() as IDBRequest<StoredEvent[]>)
  return all.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
}

export async function appendEvent(event: StoredEvent): Promise<number> {
  const key = await tx<IDBValidKey>(STORE_EVENTS, 'readwrite', (s) => s.add(event))
  return Number(key)
}

export async function appendEvents(events: StoredEvent[]): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE_EVENTS, 'readwrite')
    const store = t.objectStore(STORE_EVENTS)
    for (const e of events) store.add(e)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error ?? new Error('批量写入失败'))
  })
}

export async function clearEvents(): Promise<void> {
  await tx(STORE_EVENTS, 'readwrite', (s) => s.clear())
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  await tx(STORE_SNAPSHOT, 'readwrite', (s) => s.put(snapshot))
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  const snap = await tx<Snapshot | undefined>(
    STORE_SNAPSHOT,
    'readonly',
    (s) => s.get('current') as IDBRequest<Snapshot | undefined>,
  )
  return snap ?? null
}

export async function clearSnapshot(): Promise<void> {
  await tx(STORE_SNAPSHOT, 'readwrite', (s) => s.delete('current'))
}
