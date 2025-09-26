// lib/queries/index.ts
import { supabase } from '@/lib/supabase';

/**
 * Retourne la/les catégories d'objectifs de l'utilisateur
 * en essayant successivement :
 * 1) table user_objective_group (clé auto-détectée : group_slug | objective_group_slug | slug)
 * 2) table user_profiles (goal_group_slugs | goal_group | goal)
 * 3) fallback []
 */
export async function getUserObjectiveGroupSlugs(userId?: string): Promise<{
  slugs: string[];
  source: 'user_objective_group' | 'user_profiles' | 'fallback';
}> {
  // 0) user id
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id ?? null;
  }

  // 1) mapping direct user_objective_group
  if (uid) {
    // IMPORTANT : select('*') pour éviter l'erreur de colonne manquante
    const { data, error } = await supabase
      .from('user_objective_group')
      .select('*')
      .eq('user_id', uid);

    if (!error && Array.isArray(data) && data.length) {
      const slugs = Array.from(new Set(
        data
          .map((r: any) => r.group_slug ?? r.objective_group_slug ?? r.slug ?? null)
          .filter(Boolean)
          .map(String)
      ));
      if (slugs.length) {
        return { slugs, source: 'user_objective_group' as const };
      }
    }

    // 2) fallback profil
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('goal_group_slugs, goal_group, goal')
      .eq('user_id', uid)
      .maybeSingle();

    if (profile) {
      let slugs: string[] = [];
      if (Array.isArray(profile.goal_group_slugs)) slugs = profile.goal_group_slugs.map(String);
      else if (profile.goal_group) slugs = [String(profile.goal_group)];
      else if (profile.goal) slugs = [String(profile.goal)];
      if (slugs.length) return { slugs: Array.from(new Set(slugs)), source: 'user_profiles' as const };
    }
  }

  // 3) rien trouvé
  return { slugs: [], source: 'fallback' as const };
}
