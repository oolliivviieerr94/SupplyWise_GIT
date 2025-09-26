// /home/project/hooks/useUserProfile.ts
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type RawProfile = Record<string, any>;

export type UserProfileUI = {
  sport: string | null;
  frequency_per_week: number | null;
  training_time: string | null;
  goal: 'hypertrophy' | 'fatloss' | 'endurance' | 'health' | string | null;
  budget_monthly: number | null;
  constraints: string[] | null;
  competition_mode: boolean | null;
};

async function sampleRow(table: string): Promise<Record<string, any> | null> {
  try {
    const { data } = await supabase.from(table).select('*').limit(1);
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

function pickExisting(row: RawProfile | null, want: string[]) {
  if (!row) return [] as string[];
  return want.filter((k) => k in row);
}

function normalizeProfile(row: RawProfile | null): UserProfileUI {
  if (!row) {
    return {
      sport: null,
      frequency_per_week: null,
      training_time: null,
      goal: null,
      budget_monthly: null,
      constraints: null,
      competition_mode: null,
    };
  }
  return {
    sport: (row.sport ?? null) as string | null,
    frequency_per_week: (row.frequency_per_week ?? null) as number | null,
    training_time: (row.training_time ?? null) as string | null,
    goal: (row.goal ?? null) as any,
    budget_monthly: (row.budget_monthly ?? row.budget ?? null) as number | null,
    constraints: (Array.isArray(row.constraints) ? row.constraints : null) as string[] | null,
    competition_mode: (typeof row.competition_mode === 'boolean' ? row.competition_mode : null),
  };
}

export function useUserId() {
  const query = useQuery({
    queryKey: ['auth-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 60_000,
  });
  return query.data ?? null;
}

export function useUserProfile() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const query = useQuery({
    enabled: !!userId,
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      // introspection tolérante pour éviter 42703
      const sample = await sampleRow('user_profiles');
      const cols = pickExisting(sample, [
        'sport',
        'frequency_per_week',
        'training_time',
        'goal',
        'budget_monthly',
        'constraints',
        'competition_mode',
        'user_id',
      ]);
      const select = cols.length ? cols.join(',') : 'user_id';

      const { data, error } = await supabase
        .from('user_profiles')
        .select(select)
        .eq('user_id', userId as string)
        .maybeSingle();

      if (error) throw error;
      return normalizeProfile(data || null);
    },
    // Evite les refetchs agressifs
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    placeholderData: () => queryClient.getQueryData<UserProfileUI>(['user-profile', userId]),
  });

  // Realtime: met à jour le cache à la volée
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('realtime:user_profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = normalizeProfile(payload.new as RawProfile);
          queryClient.setQueryData(['user-profile', userId], next);
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [userId, queryClient]);

  return query;
}

export function useGoalLabel(goal: UserProfileUI['goal']) {
  return useMemo(() => {
    switch (goal) {
      case 'hypertrophy': return 'Prise de muscle';
      case 'fatloss': return 'Perte de gras';
      case 'endurance': return 'Endurance';
      case 'health': return 'Santé';
      default: return goal || '—';
    }
  }, [goal]);
}
