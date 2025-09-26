import { Rule, TrainingSlot, TimePrefs, PlanEvent } from './types';
import { d } from './time';
import { resolveAnchorsForDay } from './resolve';

export function expandRulesToEvents(
  rules: Rule[], trainingSlots: TrainingSlot[], prefs: TimePrefs,
  from: dayjs.Dayjs, to: dayjs.Dayjs
): PlanEvent[] {
  const events: PlanEvent[] = [];
  for (let day = from.startOf('day'); day.isBefore(to); day = day.add(1,'day')) {
    const weekday = day.day();
    const dayTrain = trainingSlots.filter(s => s.weekday === weekday);
    for (const r of rules) {
      if (r.frequency==='weekly' && r.days_of_week && !r.days_of_week.includes(weekday)) continue;
      const times = resolveAnchorsForDay(day, r.anchors, prefs, dayTrain);
      times.forEach(t => events.push({
        rule_id: r.id, supplement_id: r.supplement_id,
        ts_planned: t.toISOString(), status:'planned', source:'rule_expand'
      }));
    }
  }
  return events;
}