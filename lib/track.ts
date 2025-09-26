// lib/track.ts
// ----------------------------------------------------
// Tracking utilisateur (Option A = on travaille avec des slugs)
// - Fiche consultée      -> table: user_fiche_views     (colonnes: user_id, fiche_slug, view_day)
// - Conseil lu           -> table: user_conseil_reads   (colonnes: user_id, conseil_slug, read_day)
// - Produit scanné       -> table: user_product_scans   (colonnes: user_id, product_gtin, scan_day)
//
// Prérequis côté DB : index uniques par (user_id, …, *_day) + trigger tg_set_user_id + RLS INSERT/SELECT.
// Ces fonctions sont idempotentes à la journée grâce aux unique indexes.
// ----------------------------------------------------

import { supabase } from './supabase';

type TrackResult = { ok: true } | { ok: false; error: string };

async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/** Log : fiche produit consultée (1 fois / jour / utilisateur / fiche) */
export async function logFicheView(ficheSlug: string): Promise<TrackResult> {
  if (!ficheSlug?.trim()) return { ok: false, error: 'ficheSlug manquant' };
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.info('[track] skip fiche view (no session)');
    return { ok: true }; // Pas d'erreur, juste pas de tracking
  }

  try {
    const { error } = await supabase
      .from('user_fiche_views')
      .upsert(
        { fiche_slug: ficheSlug }, // sans user_id, sans view_day (trigger les pose)
        { onConflict: 'user_id,fiche_slug,view_day' }
      );
    
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

/** Log : conseil lu (1 fois / jour / utilisateur / conseil) — Option A: slug */
export async function logConseilRead(conseilSlug: string): Promise<TrackResult> {
  if (!conseilSlug?.trim()) return { ok: false, error: 'conseilSlug manquant' };
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.info('[track] skip conseil read (no session)');
    return { ok: true }; // Pas d'erreur, juste pas de tracking
  }

  try {
    const { error } = await supabase
      .from('user_conseil_reads')
      .upsert(
        { 
          conseil_slug: conseilSlug,
          read_at: new Date().toISOString()
        }, // sans user_id, sans read_day (trigger les pose)
        { onConflict: 'user_id,conseil_slug,read_day' }
      );
    
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

/** Log : produit scanné (1 fois / jour / utilisateur / GTIN) */
export async function logProductScan(gtin: string): Promise<TrackResult> {
  if (!gtin?.trim()) return { ok: false, error: 'GTIN manquant' };
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.info('[track] skip product scan (no session)');
    return { ok: true }; // Pas d'erreur, juste pas de tracking
  }

  try {
    const { error } = await supabase
      .from('user_product_scans')
      .upsert(
        { 
          product_gtin: gtin,
          scanned_at: new Date().toISOString()
        }, // sans user_id, sans scan_day (trigger les pose)
        { onConflict: 'user_id,product_gtin,scan_day' }
      );
    
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}
