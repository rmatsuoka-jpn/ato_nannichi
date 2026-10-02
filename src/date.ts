import { isHoliday } from '@gahojin-inc/holiday-japanese';
import type { CountPattern, Target } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const fromDateKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toDateKey(new Date());

export const compareDateKeys = (a: string, b: string) => a.localeCompare(b);

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const inclusiveCalendarDays = (startKey: string, endKey: string) => {
  if (compareDateKeys(startKey, endKey) > 0) return 0;
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
};

export const isAutoExcluded = (date: Date, pattern: CountPattern) => {
  const day = date.getDay();
  if (pattern.excludeSaturday && day === 6) return true;
  if (pattern.excludeSunday && day === 0) return true;
  if (pattern.excludeHolidays && isHoliday(date)) return true;
  return false;
};

export const calculatePatternDays = (
  target: Target,
  pattern: CountPattern,
  startKey: string,
) => {
  if (compareDateKeys(startKey, target.finalDate) > 0) return 0;

  let count = 0;
  let cursor = fromDateKey(startKey);
  const end = fromDateKey(target.finalDate);

  while (cursor.getTime() <= end.getTime()) {
    const key = toDateKey(cursor);

    if (key === target.finalDate) {
      if (!pattern.excludeFinalDay) count += 1;
    } else {
      const override = pattern.overrides[key];
      if (override === 'include') {
        count += 1;
      } else if (override !== 'exclude' && !isAutoExcluded(cursor, pattern)) {
        count += 1;
      }
    }

    cursor = addDays(cursor, 1);
  }

  return count;
};

export const formatJapaneseDate = (key: string) => {
  const date = fromDateKey(key);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
};

export const getMainStatus = (finalDate: string, currentKey: string) => {
  const cmp = compareDateKeys(currentKey, finalDate);
  if (cmp > 0) return { kind: 'reached' as const, label: '到達しました', days: 0 };
  if (cmp === 0) return { kind: 'final' as const, label: '最終日', days: 1 };
  const days = inclusiveCalendarDays(currentKey, finalDate);
  return { kind: 'remaining' as const, label: `あと${days}日`, days };
};
