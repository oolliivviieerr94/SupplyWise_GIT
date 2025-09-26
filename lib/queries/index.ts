// /home/project/lib/queries/index.ts
import { supabase } from '@/lib/supabase';

export type Supplement = {
  id: string | number;
  slug: string;
  name: string;
  category?: string | null;

  // normalized/scored fields used by the UI/algorithm
  score_global?: number | null;
  research_count?: number | null;      // nb_etudes
  price_eur_month?: number | null;     // cout_moyen_mensuel_eur
  quality_level?: string | null;       // 'A' | 'B' | 'C' or 'high/medium/low'
  is_active?: boolean | null;

  // detailed scores (jsonb) — utile pour library & reco
  scores?: Record<string, number> | null;

  // optional extra fields (kept if present in DB)
  dose_usual_min?: number | null;
  dose_usual_max?: number | null;
  dose_unit?: string | null;
  timing_label?: string | null;

  // French CSV fallbacks (we keep them on the object for UI helpers)
  dosage_recommande?: string | null;
  frequence?: string | null;
  cout_moyen_mensuel_eur?: number | null;
  nb_etudes?: number | null;
  score_global_adapte?: number | null;
  qualite_etudes?: string | null;
};

export type ObjectiveGroup = {
  slug: string;
  label: string;
  emoji?: string | null;
  supplements_count: number;
};

/* ---------- Introspection helpers ---------- */
async function tableExists(name: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(name).select('*', { head: true, count: 'exact' }).limit(0);
    return !error;
  } catch {
    return false;
  }
}
async function sampleRow(table: string): Promise<Record<string, any> | null> {
  try {
    const { data } = await supabase.from(table).select('*').limit(1);
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}
function firstKey<K extends string>(row: Record<string, any> | null, candidates: K[]): K | null {
  if (!row) return null;
  for (const c of candidates) if (c in row) return c;
  return null;
}
function sortSupps(meta: Supplement[]) {
  meta.sort((a, b) => {
    const sa = a.score_global ?? 0;
    const sb = b.score_global ?? 0;
    if (sb !== sa) return sb - sa;
    const ra = a.research_count ?? 0;
    const rb = b.research_count ?? 0;
    return rb - ra;
  });
  return meta;
}

/** Cache du SELECT réel disponible dans `supplement` */
let cachedSuppSelect = '';
let cachedHasIsActive = false;

function translateQuality(q: string | null | undefined): string | null {
  if (!q) return null;
  const v = q.toString().toLowerCase();
  if (['a', 'élevée', 'elevee', 'elevée', 'eleve', 'high', 'forte', 'strong'].some(x => v.includes(x))) return 'A';
  if (['b', 'moyenne', 'medium', 'modérée', 'moderee'].some(x => v.includes(x))) return 'B';
  if (['c', 'faible', 'low', 'limitée', 'limitee'].some(x => v.includes(x))) return 'C';
  return null;
}

async function getSupplementSelect(): Promise<{ select: string; hasIsActive: boolean }> {
  if (cachedSuppSelect) return { select: cachedSuppSelect, hasIsActive: cachedHasIsActive };

  const sample = await sampleRow('supplement');

  // Add both English + French CSV column candidates
  const candidates = [
    // ids/slugs/names
    'id', 'slug', 'name', 'nom', 'nom_normalise',
    // taxonomy
    'category', 'categorie',
    // scoring
    'score_global', 'score_global_adapte',
    'research_count', 'nb_etudes',
    'price_eur_month', 'cout_moyen_mensuel_eur',
    'quality_level', 'qualite_etudes',
    'is_active',
    // detailed json scores
    'scores',
    // dosage / timing
    'dose_usual_min', 'dose_usual_max', 'dose_unit', 'timing_label',
    'dosage_recommande', 'frequence',
  ];

  const present = candidates.filter(c => sample && c in sample);
  cachedHasIsActive = present.includes('is_active');
  cachedSuppSelect = present.join(',');
  return { select: cachedSuppSelect, hasIsActive: cachedHasIsActive };
}

function normalizeSupplement(row: Record<string, any>): Supplement {
  const slug = (row.slug ?? row.nom_normalise ?? '').toString();
  const name = (row.name ?? row.nom ?? slug).toString();
  const category = (row.category ?? row.categorie ?? null) as string | null;

  const score_global =
    (row.score_global ?? row.score_global_adapte ?? null) as number | null;

  const research_count =
    (row.research_count ?? row.nb_etudes ?? null) as number | null;

  const price_eur_month =
    (row.price_eur_month ?? row.cout_moyen_mensuel_eur ?? null) as number | null;

  const quality_level =
    (row.quality_level as string | null) ?? translateQuality(row.qualite_etudes);

  const s: Supplement = {
    id: row.id,
    slug,
    name,
    category,
    score_global,
    research_count,
    price_eur_month,
    quality_level,
    is_active: row.is_active ?? null,

    // detailed scores if present
    scores: (row.scores ?? null) as Record<string, number> | null,

    // keep optional fields if present
    dose_usual_min: row.dose_usual_min ?? null,
    dose_usual_max: row.dose_usual_max ?? null,
    dose_unit: row.dose_unit ?? null,
    timing_label: row.timing_label ?? null,

    dosage_recommande: row.dosage_recommande ?? null,
    frequence: row.frequence ?? null,
    cout_moyen_mensuel_eur: row.cout_moyen_mensuel_eur ?? null,
    nb_etudes: row.nb_etudes ?? null,
    score_global_adapte: row.score_global_adapte ?? null,
    qualite_etudes: row.qualite_etudes ?? null,
  };

  return s;
}

async function fetchSupplementsByKeys(keys: string[], keyType: 'id' | 'slug'): Promise<Supplement[]> {
  if (!keys.length) return [];
  const { select, hasIsActive } = await getSupplementSelect();

  let q = supabase.from('supplement').select(select);
  if (hasIsActive) q = q.eq('is_active', true);

  const { data, error } =
    keyType === 'id' ? await q.in('id', keys) : await q.in('slug', keys);

  if (error) throw error;
  return ((data || []) as any[]).map(normalizeSupplement);
}

/* ---------- API ---------- */
export async function listObjectiveGroups(): Promise<ObjectiveGroup[]> {
  const { data, error } = await supabase
    .from('v_objective_groups')
    .select('slug,label,emoji,supplements_count')
    .order('label', { ascending: true });
  if (error) throw error;
  return (data || []) as ObjectiveGroup[];
}

/**
 * Algo “comme avant” — priorité à v_supplement_group_link (AND strict),
 * repli v_supplement_grouped_tags, puis mapping objective_tag.
 * Limite: 15 max.
 */
export async function searchSupplementsByGroups(groupSlugs: string[], andMode: boolean): Promise<Supplement[]> {
  if (!groupSlugs || groupSlugs.length === 0) return [];

  // 1) Source prioritaire : v_supplement_group_link (supplement_id/slug, group_slug)
  if (await tableExists('v_supplement_group_link')) {
    const sample = await sampleRow('v_supplement_group_link');
    const kSupp = firstKey(sample, ['supplement_id', 'supplement_slug', 'supplement']);
    const kGroup = firstKey(sample, ['group_slug', 'objective_group_slug', 'group']);
    if (kSupp && kGroup) {
      const { data, error } = await supabase
        .from('v_supplement_group_link')
        .select(`${kSupp}, ${kGroup}`)
        .in(kGroup, groupSlugs);
      if (error) throw error;

      const cover = new Map<string, Set<string>>();
      (data || []).forEach((row: any) => {
        const sid = String(row[kSupp]);
        const grp = String(row[kGroup]);
        if (!cover.has(sid)) cover.set(sid, new Set());
        cover.get(sid)!.add(grp);
      });

      const wanted = Array.from(cover.entries())
        .filter(([, set]) => (andMode ? set.size === groupSlugs.length : set.size > 0))
        .map(([sid]) => sid);

      const keyType: 'id' | 'slug' = kSupp === 'supplement_slug' ? 'slug' : 'id';
      const meta = await fetchSupplementsByKeys(wanted, keyType);
      return sortSupps(meta).slice(0, 15);
    }
  }

  // 2) Repli : ancienne vue v_supplement_grouped_tags si elle existe encore
  if (await tableExists('v_supplement_grouped_tags')) {
    const sample = await sampleRow('v_supplement_grouped_tags');
    const kSupp = firstKey(sample, ['supplement_id', 'supplement', 'supplement_slug']);
    const kGroup = firstKey(sample, ['group_slug', 'objective_group_slug', 'group']);
    if (kSupp && kGroup) {
      const { data, error } = await supabase
        .from('v_supplement_grouped_tags')
        .select(`${kSupp}, ${kGroup}`)
        .in(kGroup, groupSlugs);
      if (error) throw error;

      const cover = new Map<string, Set<string>>();
      (data || []).forEach((row: any) => {
        const sid = String(row[kSupp]);
        const grp = String(row[kGroup]);
        if (!cover.has(sid)) cover.set(sid, new Set());
        cover.get(sid)!.add(grp);
      });

      const wanted = Array.from(cover.entries())
        .filter(([, set]) => (andMode ? set.size === groupSlugs.length : set.size > 0))
        .map(([sid]) => sid);

      const keyType: 'id' | 'slug' = kSupp === 'supplement_slug' ? 'slug' : 'id';
      const meta = await fetchSupplementsByKeys(wanted, keyType);
      return sortSupps(meta).slice(0, 15);
    }
  }

  // 3) Fallback : objective_tag + supplement_objective_tag
  if (!(await tableExists('objective_tag')) || !(await tableExists('supplement_objective_tag'))) {
    return [];
  }

  const otSample = await sampleRow('objective_tag');
  const kOTSlug = firstKey(otSample, ['slug', 'objective_tag_slug']);
  const kOTGroup = firstKey(otSample, ['group_slug', 'objective_group_slug', 'group']);
  if (!kOTSlug || !kOTGroup) return [];

  const { data: tags, error: otErr } = await supabase
    .from('objective_tag')
    .select(`${kOTSlug}, ${kOTGroup}`)
    .in(kOTGroup, groupSlugs);
  if (otErr) throw otErr;

  const allTagSlugs = (tags || []).map((t: any) => String(t[kOTSlug]));
  if (!allTagSlugs.length) return [];

  const sotSample = await sampleRow('supplement_objective_tag');
  const kSOTSupp = firstKey(sotSample, ['supplement_id', 'supplement', 'supplement_slug']);
  const kSOTTag = firstKey(sotSample, ['objective_tag_slug', 'tag_slug', 'objective_slug', 'tag']);
  if (!kSOTSupp || !kSOTTag) return [];

  const { data: maps, error: mapErr } = await supabase
    .from('supplement_objective_tag')
    .select(`${kSOTSupp}, ${kSOTTag}`)
    .in(kSOTTag, allTagSlugs);
  if (mapErr) throw mapErr;

  const groupOfTag = new Map<string, string>();
  (tags || []).forEach((t: any) => groupOfTag.set(String(t[kOTSlug]), String(t[kOTGroup])));

  const cover = new Map<string, Set<string>>();
  (maps || []).forEach((m: any) => {
    const suppKey = String(m[kSOTSupp]);
    const grp = groupOfTag.get(String(m[kSOTTag]));
    if (!grp) return;
    if (!cover.has(suppKey)) cover.set(suppKey, new Set());
    cover.get(suppKey)!.add(grp);
  });

  const wanted = Array.from(cover.entries())
    .filter(([, set]) => (andMode ? set.size === groupSlugs.length : set.size > 0))
    .map(([sid]) => sid);

  const keyType: 'id' | 'slug' = kSOTSupp === 'supplement_slug' ? 'slug' : 'id';
  const meta = await fetchSupplementsByKeys(wanted, keyType);
  return sortSupps(meta).slice(0, 15);
}

/* ---------- NEW: lecture robuste des groupes objectifs utilisateur ---------- */
export async function getUserObjectiveGroupSlugs(userId?: string | null): Promise<{ slugs: string[]; source: string }> {
  // si userId non fourni, on regarde la session
  let uid = userId ?? null;
  if (!uid) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      uid = user?.id ?? null;
    } catch {}
  }
  if (!uid) return { slugs: [], source: 'none' };

  // 1) table officielle user_objective_group
  try {
    const { data, error } = await supabase
      .from('user_objective_group')
      .select('group_slug, objective_group_slug')
      .eq('user_id', uid);
    if (!error && data?.length) {
      const slugs = Array.from(new Set(
        data.map((r: any) => String(r.group_slug ?? r.objective_group_slug ?? '')).filter(Boolean)
      ));
      if (slugs.length) return { slugs, source: 'user_objective_group' };
    }
  } catch {}

  // 2) profil (user_profiles.objective_groups: string[])
  try {
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('objective_groups')
      .eq('user_id', uid)
      .maybeSingle();
    const slugs = Array.isArray(prof?.objective_groups)
      ? (prof!.objective_groups as string[]).map(String).filter(Boolean)
      : [];
    if (slugs.length) return { slugs, source: 'user_profiles' };
  } catch {}

  // 3) fallback historique: user_objective -> objective_tag -> group_slug
  try {
    const { data: objs } = await supabase
      .from('user_objective')
      .select('objective_slug')
      .eq('user_id', uid);
    const tagSlugs = (objs || []).map((r: any) => String(r.objective_slug)).filter(Boolean);
    if (tagSlugs.length) {
      const { data: tagRows } = await supabase
        .from('objective_tag')
        .select('slug, group_slug')
        .in('slug', tagSlugs);

      const slugs = Array.from(new Set((tagRows || []).map(t => String(t.group_slug)).filter(Boolean)));
      if (slugs.length) return { slugs, source: 'objective_tag_fallback' };
    }
  } catch {}

  return { slugs: [], source: 'none' };
}
