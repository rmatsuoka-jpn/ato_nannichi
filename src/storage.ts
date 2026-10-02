import type { AppData } from './types';

const STORAGE_KEY = 'ato-nannichi:v1';

export const emptyData = (): AppData => ({
  version: 1,
  targets: [],
});

const isValidData = (value: unknown): value is AppData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppData>;
  return candidate.version === 1 && Array.isArray(candidate.targets);
};

export const loadData = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed: unknown = JSON.parse(raw);
    return isValidData(parsed) ? parsed : emptyData();
  } catch {
    return emptyData();
  }
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const exportJson = (data: AppData) =>
  JSON.stringify(
    {
      ...data,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );

export const importJson = (raw: string): AppData => {
  const parsed: unknown = JSON.parse(raw);
  if (!isValidData(parsed)) {
    throw new Error('対応していない設定ファイルです。');
  }
  return parsed;
};
