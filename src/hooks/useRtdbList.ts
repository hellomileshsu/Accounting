import { useEffect, useMemo, useState } from 'react';
import {
  onValue,
  ref,
  push,
  update,
  remove,
  set,
} from 'firebase/database';
import { db } from '../firebase';

export interface RtdbListApi<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  add: (value: Omit<T, 'id'>) => Promise<string | null>;
  updateItem: (id: string, patch: Partial<Omit<T, 'id'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setAll: (records: Record<string, Omit<T, 'id'>>) => Promise<void>;
}

/** Firebase RTDB 不接受 undefined，寫入前先把 undefined 的 key 拔掉 */
function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export function useRtdbList<T extends { id: string }>(path: string | null): RtdbListApi<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !path) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const r = ref(db, path);
    const off = onValue(
      r,
      (snap) => {
        const val = snap.val() as Record<string, Omit<T, 'id'>> | null;
        const list: T[] = val
          ? Object.entries(val).map(([id, v]) => ({ id, ...(v as object) }) as T)
          : [];
        setItems(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => off();
  }, [path]);

  const api = useMemo<RtdbListApi<T>>(() => {
    const throwIfNoDb = () => {
      if (!db || !path) throw new Error('Firebase 未設定或路徑無效');
    };
    return {
      items,
      loading,
      error,
      add: async (value) => {
        throwIfNoDb();
        const r = push(ref(db!, path!));
        await set(r, stripUndefined(value as object));
        return r.key;
      },
      updateItem: async (id, patch) => {
        throwIfNoDb();
        await update(ref(db!, `${path}/${id}`), stripUndefined(patch as object));
      },
      remove: async (id) => {
        throwIfNoDb();
        await remove(ref(db!, `${path}/${id}`));
      },
      setAll: async (records) => {
        throwIfNoDb();
        await set(ref(db!, path!), records);
      },
    };
  }, [items, loading, error, path]);

  return api;
}
