export type Anchor = 'morning'|'noon'|'evening'|'pre_workout'|'post_workout';

export type TimePrefs = {
  morning: string; noon: string; evening: string;
  pre_offset_min: number; post_offset_min: number;
};

export type TrainingSlot = {
  weekday: number;       // 0=dim … 6=sam
  start_time: string;    // "14:00"
  end_time: string;      // "15:30"
};

export type Rule = {
  id: string;
  supplement_id: string;
  frequency: 'daily'|'weekly'|'custom';
  anchors: Anchor[];
  days_of_week?: number[] | null;
  dose?: string | null;
};

export type PlanEvent = {
  id?: string;
  rule_id?: string | null;
  supplement_id: string;
  ts_planned: string; // ISO
  status?: 'planned'|'taken'|'skipped'|'snoozed';
  source?: string;    // 'rule_expand'
};