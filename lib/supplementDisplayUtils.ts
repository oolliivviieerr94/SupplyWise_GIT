// /home/project/lib/supplementDisplayUtils.ts
import type { Supplement } from '@/lib/queries';

/** Nettoyages légers de texte markdown */
function stripMd(s: string) {
  return s.replace(/\*\*/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}
function stripLeadingIcons(s: string) {
  return s.replace(/^[^\w(]+/u, '');
}

/** md peut être string, objet {content: string}, ou autre -> on renvoie {} si non string */
export function extractMdDetails(mdInput?: unknown): { dosage?: string; timing?: string } {
  let md: string | null = null;

  if (typeof mdInput === 'string') md = mdInput;
  else if (mdInput && typeof mdInput === 'object') {
    // essais génériques {content}, {markdown}, {md}
    const any = mdInput as any;
    if (typeof any.content === 'string') md = any.content;
    else if (typeof any.markdown === 'string') md = any.markdown;
    else if (typeof any.md === 'string') md = any.md;
  }

  if (!md) return {};

  const lines = md.split('\n');
  const norm = lines.map(l => stripMd(stripLeadingIcons(l)));

  const idx = norm.findIndex(l =>
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
        /(post[-\s]?workout|pré[-\s]?entraînement|pre[-\s]?workout|intra[-\s]?workout|intra|matin|soir|avant (?:l['’])?entraîn(?:e|e)ment|après (?:l['’])?entraîn(?:e|e)ment|quotidien|daily)/i
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
        else if (/quotidien|daily/.test(t)) timing = 'Quotidien';

        dosage = value.replace(tMatch[0], '').replace(/[–—-]\s*$/,'').trim();
      } else {
        dosage = value;
      }
    }
  }

  if (!timing) {
    const tIdx = norm.findIndex(l => /\btiming\s*:/i.test(l));
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

/** Dérivations d’affichage */
export function getDosage(s: Supplement) {
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
  return txt ? String(txt) : 'Selon recommandations';
}

export function getTiming(s: Supplement) {
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
  return txt ? String(txt) : 'Quotidien (timing flexible)';
}

export function getCostPerDay(s: Supplement) {
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

export function getEvidence(s: Supplement): 'A'|'B'|'C' {
  const anyS = s as any;
  if (s.quality_level && ['A','B','C'].includes(s.quality_level)) {
    return s.quality_level as 'A'|'B'|'C';
  }
  const raw = (anyS.qualite_etudes || anyS.niveau_preuve || anyS.evidence_level || '').toString().toLowerCase();
  if (['a','élevée','elevee','elevée','eleve','high','forte','strong'].some(k => raw.includes(k))) return 'A';
  if (['b','moyenne','medium','modérée','moderee'].some(k => raw.includes(k))) return 'B';
  if (['c','faible','low','limitée','limitee'].some(k => raw.includes(k))) return 'C';
  const rc = (s.research_count ?? anyS.nb_etudes ?? anyS.nombre_etudes ?? 0) as number;
  return rc >= 100 ? 'A' : rc >= 30 ? 'B' : 'C';
}

/** Enrichissement unique (prend aussi en compte la fiche Markdown si fournie) */
export function enrichSupplementForDisplay(
  s: Supplement,
  ficheMap?: Record<string, unknown>
) {
  let dosage = getDosage(s);
  let timing = getTiming(s);
  const hasStructuredDose = Boolean((s as any).dose_usual_min && (s as any).dose_unit);

  const mdMaybe = ficheMap?.[s.slug];
  if (mdMaybe) {
    const { dosage: mdDosage, timing: mdTiming } = extractMdDetails(mdMaybe);
    if (!hasStructuredDose && mdDosage) dosage = mdDosage;
    if ((timing === 'Quotidien (timing flexible)' || !timing) && mdTiming) timing = mdTiming;
  }

  return {
    supplement: s,
    dosage,
    timing,
    costPerDay: getCostPerDay(s),
    evidence: getEvidence(s) as 'A'|'B'|'C',
  };
}

export const evidenceColors: Record<'A'|'B'|'C', string> = { A: '#10B981', B: '#F59E0B', C: '#EF4444' };
export const evidenceLabels: Record<'A'|'B'|'C', string> = { A: 'Preuve Forte', B: 'Preuve Modérée', C: 'Preuve Limitée' };
