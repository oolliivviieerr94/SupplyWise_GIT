// /home/project/lib/queries/index.ts
import { supabase } from '@/lib/supabase';

export type Supplement = {
  id: string | number;
  slug: string;
  name: string;
  category?: string | null;

  score_global?: number | null;
  research_count?: number | null;
  price_eur_month?: number | null;
  quality_level?: string | null;
  is_active?: boolean | null;

  // détaillés
  scores?: Record<string, number> | null;

  // extra possibles
  dose_usual_min?: number | null;
  dose_usual_max?: number | null;
  dose_unit?: string | null;
  timing_label?: string | null;

  // fallbacks CSV FR
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
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) return null;
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
  if (['a', 'élevée', 'elevee', 'elevée', 'eleve', 'high'].some(x => v.includes(x))) return 'A';
  if (['b', 'moyenne', 'medium'].some(x => v.includes(x))) return 'B';
  if (['c', 'faible', 'low'].some(x => v.includes(x))) return 'C';
  return null;
}

async function getSupplementSelect(): Promise<{ select: string; hasIsActive: boolean }> {
  if (cachedSuppSelect) return { select: cachedSuppSelect, hasIsActive: cachedHasIsActive };

  const sample = await sampleRow('supplement');

  // IMPORTANT: on inclut aussi "scores"
  const candidates = [
    'id','slug','name','nom','nom_normalise',
    'category','categorie',
    'score_global','score_global_adapte',
    'research_count','nb_etudes',
    'price_eur_month','cout_moyen_mensuel_eur',
    'quality_level','qualite_etudes',
    'is_active',
    'scores', // <— AJOUT
    'dose_usual_min','dose_usual_max','dose_unit','timing_label',
    'dosage_recommande','frequence',
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

  const score_global = (row.score_global ?? row.score_global_adapte ?? null) as number | null;
  const research_count = (row.research_count ?? row.nb_etudes ?? null) as number | null;
  const price_eur_month = (row.price_eur_month ?? row.cout_moyen_mensuel_eur ?? null) as number | null;
  const quality_level = (row.quality_level as string | null) ?? translateQuality(row.qualite_etudes);

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
    scores: row.scores ?? null,

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
  // dédoublonnage défensif
  const seen = new Set<string>();
  const out: Supplement[] = [];
  for (const row of (data || []) as any[]) {
    const s = normalizeSupplement(row);
    const key = String(s.id) + '::' + s.slug;
    if (!seen.has(key)) { seen.add(key); out.push(s); }
  }
  return out;
}

/* ---------- PUBLIC API ---------- */
export async function listObjectiveGroups(): Promise<ObjectiveGroup[]> {
  const { data, error } = await supabase
    .from('v_objective_groups')
    .select('slug,label,emoji,supplements_count')
    .order('label', { ascending: true });
  if (error) throw error;
  return (data || []) as ObjectiveGroup[];
}

/** Harmonisé pour recos ET autres écrans — renvoie les slugs de groupes d’objectifs de l’utilisateur. */
export async function getUserObjectiveGroupSlugs(userId?: string): Promise<{ slugs: string[]; source: string }> {
  // 0) user id
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return { slugs: [], source: 'none' };

  // 1) user_objective_group (colonne robuste)
  if (await tableExists('user_objective_group')) {
    const sample = await sampleRow('user_objective_group');
    const kGroup = firstKey(sample, ['group_slug', 'objective_group_slug', 'group']);
    const kUser  = firstKey(sample, ['user_id', 'user']);
    if (kGroup && kUser) {
      const { data, error } = await supabase
        .from('user_objective_group')
        .select(`${kGroup}`)
        .eq(kUser, uid);
      if (!error && data?.length) {
        const slugs = Array.from(new Set((data as any[]).map(r => String(r[kGroup])).filter(Boolean)));
        if (slugs.length) return { slugs, source: 'user_objective_group' };
      }
    }
  }

  // 2) user_profiles.objective_groups (si présent)
  if (await tableExists('user_profiles')) {
    const sample = await sampleRow('user_profiles');
    const kUser  = firstKey(sample, ['user_id', 'id', 'user']);
    const kOgArr = firstKey(sample, ['objective_groups', 'objective_group_slugs']);
    if (kUser && kOgArr) {
      const { data } = await supabase.from('user_profiles').select(`${kOgArr}`).eq(kUser, uid).maybeSingle();
      const arr = Array.isArray((data as any)?.[kOgArr]) ? (data as any)[kOgArr] as string[] : [];
      const slugs = Array.from(new Set(arr.map(String).filter(Boolean)));
      if (slugs.length) return { slugs, source: 'user_profiles' };
    }
  }

  // 3) fallback via objective_tag mapping
  if (await tableExists('user_objective') && await tableExists('objective_tag')) {
    const uoSample = await sampleRow('user_objective');
    const kUser = firstKey(uoSample, ['user_id', 'user']);
    const kObj  = firstKey(uoSample, ['objective_slug', 'objective', 'tag_slug']);
    const { data: rows } = await supabase.from('user_objective').select(`${kObj}`).eq(kUser!, uid);
    const tags = (rows || []).map(r => String((r as any)[kObj!])).filter(Boolean);
    if (tags.length) {
      const otSample = await sampleRow('objective_tag');
      const kSlug = firstKey(otSample, ['slug', 'objective_tag_slug']);
      const kGrp  = firstKey(otSample, ['group_slug', 'objective_group_slug', 'group']);
      if (kSlug && kGrp) {
        const { data: ot } = await supabase
          .from('objective_tag')
          .select(`${kSlug},${kGrp}`)
          .in(kSlug, tags);
        const groups = Array.from(new Set((ot || []).map((t: any) => String(t[kGrp])).filter(Boolean)));
        if (groups.length) return { slugs: groups, source: 'user_objective→objective_tag' };
      }
    }
  }

  return { slugs: [], source: 'none' };
}

/**
 * Recherche par groupes (AND strict si `andMode`).
 * Priorité: v_supplement_group_link → v_supplement_grouped_tags → mapping objective_tag.
 * Retourne max 15, triés score puis nb études.
 */
export async function searchSupplementsByGroups(groupSlugs: string[], andMode: boolean): Promise<Supplement[]> {
  if (!groupSlugs || groupSlugs.length === 0) return [];

  // 1) v_supplement_group_link
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

  // 2) v_supplement_grouped_tags
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

  // 3) fallback: objective_tag + supplement_objective_tag
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
