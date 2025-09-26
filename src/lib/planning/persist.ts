import { supabase } from '@/lib/supabase';
import { PlanEvent } from './types';

export async function upsertPlanEvents(userId: string, evts: PlanEvent[]) {
  const payload = evts.map(e => ({ ...e, user_id: userId }));
  return supabase.from('user_plan_event').upsert(payload, {
    onConflict: 'user_id,supplement_id,ts_planned',
    ignoreDuplicates: false
  });
}

export async function fetchWeekEvents(fromISO: string, toISO: string) {
  return supabase.from('user_plan_event')
    .select('id,supplement_id,ts_planned,status')
    .gte('ts_planned', fromISO).lt('ts_planned', toISO)
    .order('ts_planned', { ascending: true });
}

export async function markTaken(eventId: string) {
  return supabase.from('user_plan_event').update({
    status: 'taken', ts_taken: new Date().toISOString()
  }).eq('id', eventId);
}

export async function snoozeEvent(eventId: string, minutes = 15) {
  const { data, error } = await supabase.from('user_plan_event')
    .select('id, ts_planned').eq('id', eventId).single();
  if (error || !data) return { error };
  const next = new Date(new Date(data.ts_planned).getTime() + minutes*60000).toISOString();
  return supabase.from('user_plan_event')
    .update({ ts_planned: next, status:'snoozed' }).eq('id', eventId);
}