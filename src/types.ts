export type DayOverride = 'include' | 'exclude';

export type CountPattern = {
  id: string;
  name: string;
  excludeSaturday: boolean;
  excludeSunday: boolean;
  excludeHolidays: boolean;
  excludeFinalDay: boolean;
  overrides: Record<string, DayOverride>;
};

export type Target = {
  id: string;
  name: string;
  finalDate: string;
  patterns: CountPattern[];
};

export type AppData = {
  version: 1;
  targets: Target[];
};
