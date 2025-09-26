import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Conseil = {
  id: string;
  title: string;
  content: string;
  icon: string;
  category: string;
  is_active: boolean;
  display_date: string | null;
  created_at: string;
  updated_at: string;
};

export function useConseil() {
  const [conseil, setConseil] = useState<Conseil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDailyTip();
  }, []);

  const loadDailyTip = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📚 Loading daily tip from conseil table...');

      // Récupérer tous les conseils disponibles
      const { data: allTips, error: allTipsError } = await supabase
        .from('conseil')
        .select('*');

      if (allTipsError) {
        throw allTipsError;
      }

      if (!allTips || allTips.length === 0) {
        console.log('❌ No active tips found');
        setConseil(null);
        return;
      }

      // Sélectionner un conseil aléatoire
      const randomIndex = Math.floor(Math.random() * allTips.length);
      const randomTip = allTips[randomIndex];

      console.log('✅ Selected random tip:', randomTip.title);
      setConseil({
        id: randomTip.id,
        title: randomTip.titre,
        content: randomTip.contenu_md,
        icon: '💡', // Icône par défaut
        category: randomTip.categorie || 'Général',
        is_active: true,
        display_date: null,
        created_at: randomTip.created_at,
        updated_at: randomTip.updated_at,
      });

    } catch (err: any) {
      console.error('❌ Error loading daily tip:', err);
      setError(err.message || 'Erreur lors du chargement du conseil');
      setConseil(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshTip = () => {
    loadDailyTip();
  };

  return {
    conseil,
    loading,
    error,
    refreshTip,
  };
}