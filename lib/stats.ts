import { supabase } from './supabase';

export type UserDashboardStats = {
  fiche_views_total: number;
  conseil_reads_total: number;
  product_scans_total: number;
  product_suggestions_total: number;
  streak_days: number;
};

export async function fetchUserDashboardStats(): Promise<UserDashboardStats> {
  try {
    // Récupérer le streak_days via RPC (si disponible)
    let streakDays = 0;
    try {
      // Récupérer l'ID de l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const { data: streakData, error: streakError } = await supabase.rpc('stats_user_dashboard', { 
        u: user.id 
      });
      if (!streakError && streakData && streakData.length > 0) {
        streakDays = streakData[0].streak_days || 0;
      }
    } catch (error) {
      console.log('RPC stats_user_dashboard not available, using default streak_days = 0');
    }

    // Compter les vues de fiches (total)
    const { count: ficheViewsCount } = await supabase
      .from('user_fiche_views')
      .select('*', { count: 'exact', head: true });

    // Compter les lectures de conseils (total)
    const { count: conseilReadsCount } = await supabase
      .from('user_conseil_reads')
      .select('*', { count: 'exact', head: true });

    // Compter les scans de produits (total)
    const { count: productScansCount } = await supabase
      .from('user_product_scans')
      .select('*', { count: 'exact', head: true });

    // Compter les suggestions de produits (total)
    const { count: productSuggestionsCount } = await supabase
      .from('product_suggestions')
      .select('*', { count: 'exact', head: true });

    return {
      fiche_views_total: ficheViewsCount || 0,
      conseil_reads_total: conseilReadsCount || 0,
      product_scans_total: productScansCount || 0,
      product_suggestions_total: productSuggestionsCount || 0,
      streak_days: streakDays,
    };
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error(error.message);
  }
}