import { supabase } from './supabaseClient'

export type Supplement = {
  id: string
  slug: string
  name: string
  category: string | null
  score_global: number | null
  scores: Record<string, number> | null
  price_eur_month: number | null
  research_count: number | null
  quality_level: string | null
}

export async function fetchSupplements(limit = 500) {
  const { data, error } = await supabase
    .from('supplement')
    .select('id, slug, name, category, score_global, scores, price_eur_month, research_count, quality_level')
    .order('score_global', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as Supplement[]
}

export async function fetchSupplementBySlug(slug: string) {
  const { data, error } = await supabase
    .from('supplement')
    .select('id, slug, name, category, score_global, scores, price_eur_month, research_count, quality_level')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data as Supplement
}

export async function fetchFicheMarkdown(slug: string) {
  const { data, error } = await supabase
    .from('supplement_fiche')
    .select('markdown')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return (data as { markdown: string }).markdown
}