// hooks/useFavorites.ts
import { useEffect, useState, useCallback } from 'react';
import { addFavorite, removeFavorite, listFavorites, isFavorite } from '@/lib/favorites';

export function useFavorites() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await listFavorites();
    setIds(new Set(rows.map(r => r.product_id)));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const check = useCallback(async (productId: string) => {
    if (ids.size === 0) return await isFavorite(productId);
    return ids.has(productId);
  }, [ids]);

  const add = useCallback(async (productId: string, name?: string) => {
    await addFavorite(productId, name);
    setIds(prev => new Set(prev).add(productId));
  }, []);

  const remove = useCallback(async (productId: string) => {
    await removeFavorite(productId);
    setIds(prev => {
      const n = new Set(prev);
      n.delete(productId);
      return n;
    });
  }, []);

  const toggle = useCallback(async (productId: string, name?: string) => {
    if (await check(productId)) {
      await remove(productId);
      return false;
    } else {
      await add(productId, name);
      return true;
    }
  }, [add, remove, check]);

  return { loading, ids, refresh, check, add, remove, toggle };
}
