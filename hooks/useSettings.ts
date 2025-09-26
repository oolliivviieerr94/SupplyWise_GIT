import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useSettings() {
  const [fichesVersion, setFichesVersionState] = useState<string>('v0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFichesVersion();
  }, []);

  const loadFichesVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'fiches_version')
        .maybeSingle();

      if (error) {
        console.error('Error loading fiches version:', error);
      } else if (data) {
        setFichesVersionState(data.value);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const setFichesVersion = async (newVersion: string) => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'fiches_version',
          value: newVersion,
        });

      if (error) {
        console.error('Error updating fiches version:', error);
      } else {
        setFichesVersionState(newVersion);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const refreshFiches = () => {
    const newVersion = Date.now().toString();
    setFichesVersion(newVersion);
  };

  return {
    fichesVersion,
    setFichesVersion,
    refreshFiches,
    loading,
    getSetting: async (key: string) => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', key)
          .maybeSingle();

        if (error) {
          console.error(`Error getting setting ${key}:`, error);
          return null;
        }

        return data?.value || null;
      } catch (error) {
        console.error(`Error getting setting ${key}:`, error);
        return null;
      }
    },
  };
}