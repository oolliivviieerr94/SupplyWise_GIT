import { supabase } from '@/lib/supabase';
import { searchSupplementsByGroups, type Supplement } from '@/lib/queries';

export type RecoItem = {
  id: string;
  slug?: string | null;
  name: string;
  category?: string | null;
  score_global?: number | null;
  research_count?: number | null;
  price_eur_month?: number | null;
  quality_level?: string | null;
  evidenceLevel: 'A' | 'B' | 'C';
  evidenceLabel: string;
  dosage: string;
  timing: string;
  costPerDay: number;
  certified: boolean;
  supplement_id?: string;
};
export type RecoResult = { items: RecoItem[]; usedGoals: string[]; banner?: string };

const evidenceLabels = { A: 'Preuve Forte', B: 'Preuve Modérée', C: 'Preuve Limitée' } as const;

function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)); }
function qualityToScore(q?: string | null) {
  const s = (q || '').toLowerCase();
  if (s.startsWith('élev') || s.startsWith('ele')) return 1;
  if (s.startsWith('moy')) return 0.6;
  if (s.startsWith('fai')) return 0.3;
  return 0.5;
}
function researchToEvidence(n?: number | null): 'A' | 'B' | 'C' {
  const v = Number(n || 0);
  if (v >= 100) return 'A';
  if (v >= 40) return 'B';
  return 'C';
}
function priceScore(priceMonth?: number | null, budgetMonth?: number | null) {
  if (!budgetMonth || budgetMonth >= 1000 || !priceMonth) return 0.6;
  const r = priceMonth / budgetMonth;
  if (r <= 0.6) return 1;
  if (r <= 1.0) return 0.9;
  if (r <= 1.5) return 0.6;
  if (r <= 2.0) return 0.4;
  return 0.25;
}
function computeRankScore(s: Supplement, budget?: number | null) {
  const wScore = 0.45, wResearch = 0.18, wQuality = 0.18, wPrice = 0.19;
  const g = clamp((Number(s.score_global || 0) / 20), 0, 1);
  const r = clamp((Math.min(Number(s.research_count || 0), 300) / 300), 0, 1);
  const q = qualityToScore(s.quality_level);
  const p = priceScore(s.price_eur_month, budget);
  return wScore * g + wResearch * r + wQuality * q + wPrice * p;
}
function formatDoseTimingFallback(name: string) {
  return {
    dosage: 'Selon recommandations',
    timing: /créatine|creatine/i.test(name)
      ? 'Quotidien (post-entraînement)'
      : 'Quotidien (timing flexible)',
  };
}
async function tryGetDoseTimingFromDb(s: Supplement) {
  try {
    const { data } = await supabase
      .from('ingredients')
      .select('name,evidence,dose_usual_min,dose_usual_max,dose_unit,timing')
      .ilike('name', `%${s.name}%`)
      .maybeSingle();

    if (!data) return null;

    const min = data.dose_usual_min ?? null;
    const max = data.dose_usual_max ?? null;
    const unit = data.dose_unit ?? '';
    let dosage = 'Selon recommandations';
    if (min && max) dosage = `${min}-${max}${unit}`;
    else if (min) dosage = `${min}${unit}`;

    const timing = data.timing || formatDoseTimingFallback(s.name).timing;
    const ev = (String(data.evidence || '').toUpperCase() as 'A' | 'B' | 'C') || researchToEvidence(s.research_count);
    return { dosage, timing, evidenceLevel: ev };
  } catch { return null; }
}
function perDayFromMonth(m?: number | null) { return Math.round(((Number(m || 0) / 30) || 0) * 100) / 100; }

/** Récupère les slugs d’objectifs (groups) avec fallback si la table n’existe pas */
export async function getUserObjectiveSlugs(userId: string): Promise<string[]> {
  // 1) essayer user_objective_group
  try {
    const r1 = await supabase
      .from('user_objective_group')
      .select('group_slug')
      .eq('user_id', userId);

    if (!r1.error && r1.data?.length) {
      return r1.data.map((x: any) => x.group_slug).filter(Boolean);
    }
  } catch (e: any) {
    // PGRST205 -> table absente : on ignore
    if (e?.code !== 'PGRST205') console.warn('[recoEngine] user_objective_group error:', e?.message || e);
  }

  // 2) fallback historique (objectifs unitaires)
  try {
    const r2 = await supabase
      .from('user_objective')
      .select('objective_slug')
      .eq('user_id', userId);

    if (!r2.error && r2.data?.length) {
      return r2.data.map((x: any) => x.objective_slug).filter(Boolean);
    }
  } catch (e) {
    console.warn('[recoEngine] user_objective error:', (e as any)?.message || e);
  }

  return [];
}

export async function generateRecommendationsForCurrentUser(limit = 15): Promise<RecoResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], usedGoals: [], banner: 'Utilisateur non connecté.' };

  const [{ data: profile }, goalSlugs] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('monthly_budget_eur,dietary_constraints,competition_mode')
      .eq('user_id', user.id)
      .maybeSingle(),
    getUserObjectiveSlugs(user.id),
  ]);

  const budget = profile?.monthly_budget_eur ?? null;
  const constraints: string[] = Array.isArray(profile?.dietary_constraints) ? profile!.dietary_constraints : [];
  const competitionMode = !!profile?.competition_mode;

  let supplements: Supplement[] = [];
  let banner: string | undefined;

  if (goalSlugs.length === 0) {
    const { data } = await supabase
      .from('supplement')
      .select('*')
      .eq('is_active', true)
      .order('score_global', { ascending: false })
      .order('research_count', { ascending: false })
      .limit(60);
    supplements = data || [];
    banner = "Astuce : nous n'avons pas reçu vos objectifs. Voici un top des meilleurs produits.";
  } else {
    supplements = await searchSupplementsByGroups(goalSlugs, true);
  }

  let filtered = supplements;

  if (budget && budget < 1000) {
    filtered = filtered.filter(s => !s.price_eur_month || Number(s.price_eur_month) <= budget);
  }
  if (constraints.some(c => /caféine|cafeine|caffeine/i.test(c))) {
    filtered = filtered.filter(s => !/caféine|cafeine|caffeine/i.test(String(s.name)));
  }

  const ranked = filtered
    .map(s => ({ s, score: computeRankScore(s, budget) + (competitionMode ? 0.05 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.s);

  const items: RecoItem[] = [];
  for (const s of ranked) {
    const meta = await tryGetDoseTimingFromDb(s);
    const ev: 'A' | 'B' | 'C' = meta?.evidenceLevel ?? researchToEvidence(s.research_count);
    items.push({
      id: s.id,
      supplement_id: s.id,
      slug: (s as any).slug ?? null,
      name: s.name,
      category: (s as any).category ?? null,
      score_global: s.score_global ?? null,
      research_count: s.research_count ?? null,
      price_eur_month: s.price_eur_month ?? null,
      quality_level: s.quality_level ?? null,
      evidenceLevel: ev,
      evidenceLabel: evidenceLabels[ev],
      dosage: meta?.dosage ?? formatDoseTimingFallback(s.name).dosage,
      timing: meta?.timing ?? formatDoseTimingFallback(s.name).timing,
      costPerDay: perDayFromMonth(s.price_eur_month),
      certified: !!(s as any).is_certified || competitionMode,
    });
  }

  return { items, usedGoals: goalSlugs, banner };
}
