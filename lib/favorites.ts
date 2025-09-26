// lib/favorites.ts
import { supabase } from '@/lib/supabase';

export type FavoriteRow = {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string | null;
  created_at: string;
};

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listFavorites(): Promise<FavoriteRow[]> {
  const uid = await getUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function isFavorite(product_id: string): Promise<boolean> {
  const uid = await getUserId();
  if (!uid) return false;
  const { data } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', uid)
    .eq('product_id', product_id)
    .maybeSingle();
  return !!data;
}

export async function addFavorite(product_id: string, product_name?: string) {
  const uid = await getUserId();
  if (!uid) return;
  await supabase
    .from('user_favorites')
    .upsert({ user_id: uid, product_id, product_name }, { onConflict: 'user_id,product_id' });
}

export async function removeFavorite(product_id: string) {
  const uid = await getUserId();
  if (!uid) return;
  await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', uid)
    .eq('product_id', product_id);
}
