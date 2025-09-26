import { Anchor, TimePrefs, TrainingSlot } from './types';
import { d, toLocalDateTime, addMin } from './time';

export function resolveAnchorsForDay(
  day: dayjs.Dayjs,
  anchors: Anchor[],
  prefs: TimePrefs,
  trainingOfDay: TrainingSlot[]
): dayjs.Dayjs[] {
  const out: dayjs.Dayjs[] = [];
  for (const a of anchors) {
    if (a==='morning'||a==='noon'||a==='evening') {
      out.push(toLocalDateTime(day, (prefs as any)[a])); continue;
    }
    if (a==='pre_workout') {
      for (const s of trainingOfDay) out.push(addMin(toLocalDateTime(day, s.start_time), prefs.pre_offset_min));
      continue;
    }
    if (a==='post_workout') {
      for (const s of trainingOfDay) out.push(addMin(toLocalDateTime(day, s.end_time), prefs.post_offset_min));
      continue;
    }
  }
  const uniq = new Map(out.map(t => [t.toISOString(), t]));
  return [...uniq.values()].sort((a,b)=>a.valueOf()-b.valueOf());
}