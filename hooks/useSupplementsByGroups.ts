import { useState, useEffect } from 'react';
import { searchSupplementsByGroups, type Supplement } from '@/lib/queries';

export function useSupplementsByGroups(groups: string[], matchAll: boolean = false) {
  const [data, setData] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchSupplements = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Searching supplements with groups:', groups, 'matchAll:', matchAll);
        
        const results = await searchSupplementsByGroups(groups, matchAll);
        
        console.log('✅ Found supplements:', results.length);
        setData(results);
      } catch (err: any) {
        console.error('❌ Error searching supplements:', err);
        setError(err.message || 'Erreur lors de la recherche');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    searchSupplements();
  }, [groups, matchAll]);

  const refresh = () => {
    // Force refresh by re-triggering the effect
    setError(null);
  };

  return {
    data,
    loading,
    error,
    refresh,
  };
}