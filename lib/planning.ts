import dayjs from 'dayjs';
import { supabase } from './supabase';
import { expandRulesToEvents } from '@/src/lib/planning/expand';
import { upsertPlanEvents } from '@/src/lib/planning/persist';
import type { Rule, TrainingSlot, TimePrefs } from '@/src/lib/planning/types';

export async function generateForNext2Weeks(userId: string) {
  try {
    console.log('🔄 Generating planning for user:', userId);

    // 1) Charger les règles de l'utilisateur
    const { data: rules, error: rulesError } = await supabase
      .from('user_supplement_rule')
      .select('id, supplement_id, frequency, anchors, days_of_week, dose')
      .eq('user_id', userId);

    if (rulesError) {
      throw new Error(`Erreur lors du chargement des règles: ${rulesError.message}`);
    }

    if (!rules || rules.length === 0) {
      console.log('ℹ️ No rules found for user');
      return { success: true, eventsGenerated: 0 };
    }

    // 2) Charger les préférences de temps
    const { data: prefs, error: prefsError } = await supabase
      .from('user_time_pref')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.warn('⚠️ Error loading time preferences:', prefsError.message);
    }

    // Valeurs par défaut si pas de préférences
    const timePrefs: TimePrefs = prefs || {
      morning: '07:30',
      noon: '12:30',
      evening: '20:30',
      pre_offset_min: -45,
      post_offset_min: 30,
    };

    // 3) Charger les créneaux d'entraînement
    const { data: slots, error: slotsError } = await supabase
      .from('user_training_slot')
      .select('weekday, start_time, end_time')
      .eq('user_id', userId);

    if (slotsError) {
      console.warn('⚠️ Error loading training slots:', slotsError.message);
    }

    const trainingSlots: TrainingSlot[] = slots || [];

    // 4) Générer les événements pour les 2 prochaines semaines
    const from = dayjs().startOf('week');
    const to = from.add(14, 'day');

    console.log('📅 Generating events from', from.format('YYYY-MM-DD'), 'to', to.format('YYYY-MM-DD'));

    const events = expandRulesToEvents(
      rules as Rule[],
      trainingSlots,
      timePrefs,
      from,
      to
    );

    console.log('✅ Generated', events.length, 'events');

    // 5) Sauvegarder les événements
    const { error: upsertError } = await upsertPlanEvents(userId, events);

    if (upsertError) {
      throw new Error(`Erreur lors de la sauvegarde des événements: ${upsertError.message}`);
    }

    return { success: true, eventsGenerated: events.length };

  } catch (error: any) {
    console.error('❌ Error generating planning:', error);
    throw error;
  }
}