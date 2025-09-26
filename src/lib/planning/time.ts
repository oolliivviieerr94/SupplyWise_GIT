import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';
dayjs.extend(isoWeek); dayjs.extend(utc); dayjs.extend(tz);

export const d = dayjs;

export const toLocalDateTime = (date: dayjs.Dayjs, hhmm: string) => {
  const [h,m] = hhmm.split(':').map(Number);
  return date.hour(h).minute(m).second(0).millisecond(0);
};

export const addMin = (date: dayjs.Dayjs, min: number) => date.add(min, 'minute');