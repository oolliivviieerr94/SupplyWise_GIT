// /home/project/lib/supplementDisplayUtils.ts
import type { Supplement } from '@/lib/queries';

/** ---------- Normalisation & parsing Markdown ---------- */
export function stripMd(s: string) {
  return s.replace(/\*\*/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}
export function stripLeadingIcons(s: string) {
  return s.replace(/^[^\w(]+/u, '');
}

/** Certaines sources renvoient un objet ou autre type → on garantit un string sûr */
export function normalizeMd(md: unknown): string {
  if (typeof md === 'string') return md;
  if (!md) return '';
  try {
    // cas { content: '...' }
    if (typeof md === 'object' && md !== null && 'content' in (md as any)) {
      const c = (md as any).content;
      if (typeof c === 'string') return c;
      if (c != null) return String(c);
    }
    return String(md);
  } catch {
    return '';
  }
}

export function extractMdDetails(mdUnknown?: unknown): { dosage?: string; timing?: string } {
  const md = normalizeMd(mdUnknown);
  if (!md) return {};
  const lines = md.split('\n');
  const norm = lines.map((l) => stripMd(stripLeadingIcons(l)));

  const idx = norm.findIndex((l) =>
    /(dosage|posologie)(\s+(conseill[ée]e?|recommand[ée]e?))?\s*:/i.test(l)
  );

  let dosage: string | undefined;
  let timing: string | undefined;

  if (idx >= 0) {
    const rawLine = stripMd(lines[idx]);
    const colon = rawLine.indexOf(':');
    if (colon !== -1) {
      const after = rawLine.slice(colon + 1).trim();
      const value = stripMd(after);

      const tMatch = value.match(
        /(post[-\s]?workout|pré[-\s]?entraînement|pre[-\s]?workout|intra[-\s]?workout|intra|matin|soir|avant (?:l['’])?entraîn(?:e|e)ment|après (?:l['’])?entraîn(?:e|e)ment|quotidien)/i
      );

      if (tMatch) {
        const t = tMatch[1].toLowerCase();
        if (/post/.test(t)) timing = 'Post-workout';
        else if (/pré|pre/.test(t)) timing = 'Pré-entraînement';
        else if (/intra/.test(t)) timing = 'Intra-workout';
        else if (/matin/.test(t)) timing = 'Matin';
        else if (/soir/.test(t)) timing = 'Soir';
        else if (/avant/.test(t)) timing = 'Avant entraînement';
        else if (/après|apres/.test(t)) timing = 'Après entraînement';
        else if (/quotidien/.test(t)) timing = 'Quotidien';

        dosage = value.replace(tMatch[0], '').replace(/[–—-]\s*$/, '').trim();
      } else {
        dosage = value;
      }
    }
  }

  if (!timing) {
    const tIdx = norm.findIndex((l) => /\btiming\s*:/i.test(l));
    if (tIdx >= 0) {
      const raw = stripMd(lines[tIdx]);
      const colon = raw.indexOf(':');
      if (colon !== -1) {
        const v = raw.slice(colon + 1).trim();
        if (/post/i.test(v)) timing = 'Post-workout';
        else if (/pré|pre/i.test(v)) timing = 'Pré-entraînement';
        else if (/intra/i.test(v)) timing = 'Intra-workout';
        else if (/matin/i.test(v)) timing = 'Matin';
        else if (/soir/i.test(v)) timing = 'Soir';
        else if (/quotidien|daily/i.test(v)) timing = 'Quotidien';
        else timing = v;
      }
    }
  }

  return { dosage, timing };
}

/** ---------- Aides d’affichage (DB + fallbacks) ---------- */
export function getDosageRaw(s: Supplement): string | null {
  const anyS = s as any;
  if (anyS.dose_usual_min && anyS.dose_unit) {
    return `${anyS.dose_usual_min}${anyS.dose_unit}${
      anyS.dose_usual_max ? `–${anyS.dose_usual_max}${anyS.dose_unit}` : ''
    }`;
  }
  const txt =
    anyS.dosage_recommande ||
    anyS.dosage ||
    anyS.posologie ||
    anyS.dose_label ||
    anyS.dose_recommandee ||
    anyS.dose_journaliere;
  return txt ? String(txt) : null;
}

export function getTimingRaw(s: Supplement): string | null {
  const anyS = s as any;
  const txt =
    anyS.timing_label ||
    anyS.frequence ||
    anyS.timing ||
    anyS.moment ||
    anyS.moment_prise ||
    anyS.moment_de_prise ||
    anyS.conseil_prise ||
    anyS.posologie_timing;
  return txt ? String(txt) : null;
}

export function getCostPerDay(s: Supplement): number {
  const anyS = s as any;
  const perDay =
    (typeof anyS.price_eur_day === 'number' ? anyS.price_eur_day : null) ??
    (typeof anyS.cout_par_jour_eur === 'number' ? anyS.cout_par_jour_eur : null);
  if (perDay != null) return perDay;

  const monthly =
    (typeof s.price_eur_month === 'number' ? s.price_eur_month : null) ??
    (typeof anyS.cout_moyen_mensuel_eur === 'number' ? anyS.cout_moyen_mensuel_eur : null) ??
    (typeof anyS.prix_mensuel === 'number' ? anyS.prix_mensuel : null) ??
    (typeof anyS.cout_mensuel_eur === 'number' ? anyS.cout_mensuel_eur : null) ??
    (typeof anyS.cout_par_mois_eur === 'number' ? anyS.cout_par_mois_eur : null);
  return monthly ? monthly / 30 : 0;
}

export function getEvidence(s: Supplement): 'A' | 'B' | 'C' {
  const anyS = s as any;
  if (s.quality_level && ['A', 'B', 'C'].includes(s.quality_level)) {
    return s.quality_level as 'A' | 'B' | 'C';
  }
  const raw = (anyS.qualite_etudes || anyS.niveau_preuve || anyS.evidence_level || '')
    .toString()
    .toLowerCase();

  if (['a', 'élevée', 'elevee', 'elevée', 'eleve', 'high', 'forte', 'strong'].some((k) => raw.includes(k))) return 'A';
  if (['b', 'moyenne', 'medium', 'modérée', 'moderee'].some((k) => raw.includes(k))) return 'B';
  if (['c', 'faible', 'low', 'limitée', 'limitee'].some((k) => raw.includes(k))) return 'C';

  const rc = (s.research_count ?? (anyS.nb_etudes ?? anyS.nombre_etudes ?? 0)) as number;
  return rc >= 100 ? 'A' : rc >= 30 ? 'B' : 'C';
}

/** Enrichit un supplément pour l’affichage, en lisant la fiche Markdown si elle existe. */
export function enrichSupplementForDisplay(
  s: Supplement,
  ficheMap?: Record<string, unknown>
): {
  dosage: string;
  timing: string;
  evidence: 'A' | 'B' | 'C';
  costPerDay: number;
} {
  const hasStructuredDose = Boolean((s as any).dose_usual_min && (s as any).dose_unit);

  let dosage = getDosageRaw(s) ?? 'Selon recommandations';
  let timing = getTimingRaw(s) ?? 'Quotidien (timing flexible)';

  if (ficheMap && s.slug && Object.prototype.hasOwnProperty.call(ficheMap, s.slug)) {
    const md = ficheMap[s.slug];
    const { dosage: mdDosage, timing: mdTiming } = extractMdDetails(md);
    if (!hasStructuredDose && mdDosage) dosage = mdDosage;
    if (timing === 'Quotidien (timing flexible)' && mdTiming) timing = mdTiming;
  }

  return {
    dosage,
    timing,
    evidence: getEvidence(s),
    costPerDay: getCostPerDay(s),
  };
}

/** Déduplique une liste de suppléments (slug > id en fallback). */
export function uniqueSupplements(list: Supplement[]): Supplement[] {
  const seen = new Set<string>();
  const out: Supplement[] = [];
  for (const s of list) {
    const key = String(s.slug || s.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
