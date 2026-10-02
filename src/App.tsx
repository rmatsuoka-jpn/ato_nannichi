import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  calculatePatternDays,
  compareDateKeys,
  formatJapaneseDate,
  fromDateKey,
  getMainStatus,
  inclusiveCalendarDays,
  isAutoExcluded,
  toDateKey,
  todayKey,
} from './date';
import { emptyData, exportJson, importJson, loadData, saveData } from './storage';
import type { AppData, CountPattern, Target } from './types';

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const targetNameSuggestions = ['年度末', 'イベント', '契約終了', '任期終了', '引っ越し'];

const defaultPattern = (): CountPattern => ({
  id: makeId(),
  name: '出勤日',
  excludeSaturday: true,
  excludeSunday: true,
  excludeHolidays: true,
  excludeFinalDay: false,
  overrides: {},
});

const useHashPath = () => {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = useState(read);

  useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return path;
};

const go = (path: string) => {
  window.location.hash = path;
};

const useToday = () => {
  const [key, setKey] = useState(todayKey());

  useEffect(() => {
    const refresh = () => setKey(todayKey());
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return key;
};

type PageProps = {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  currentKey: string;
};

function Header({ title, back }: { title: string; back?: string }) {
  return (
    <header className="app-header">
      {back ? (
        <button className="icon-button" onClick={() => go(back)} aria-label="戻る">
          ‹
        </button>
      ) : (
        <span className="header-spacer" />
      )}
      <h1>{title}</h1>
      <span className="header-spacer" />
    </header>
  );
}

function HomePage({ data, currentKey }: Omit<PageProps, 'setData'>) {
  const active = data.targets.filter((t) => compareDateKeys(currentKey, t.finalDate) <= 0);
  const reached = data.targets.filter((t) => compareDateKeys(currentKey, t.finalDate) > 0);

  return (
    <>
      <header className="app-header home-header">
        <span className="header-spacer" />
        <h1>あと何日？</h1>
        <button className="icon-button" onClick={() => go('/settings')} aria-label="設定">
          ⚙
        </button>
      </header>

      <main className="page">
        {active.length === 0 && (
          <section className="empty-card">
            <h2>最終日を設定しましょう</h2>
            <p>カレンダー日と、土日祝などを除いた残日数を表示できます。</p>
            <button className="primary-button" onClick={() => go('/target/new')}>
              最初の目標を追加
            </button>
          </section>
        )}

        <div className="target-list">
          {active.map((target) => (
            <CountdownCard key={target.id} target={target} currentKey={currentKey} />
          ))}
        </div>

        {reached.length > 0 && (
          <details className="reached-box">
            <summary>到達済み（{reached.length}件）</summary>
            <div className="reached-list">
              {reached.map((target) => (
                <CountdownCard key={target.id} target={target} currentKey={currentKey} compact />
              ))}
            </div>
          </details>
        )}
      </main>
    </>
  );
}

function CountdownCard({
  target,
  currentKey,
  compact = false,
}: {
  target: Target;
  currentKey: string;
  compact?: boolean;
}) {
  const status = getMainStatus(target.finalDate, currentKey);
  const calendarDays = inclusiveCalendarDays(currentKey, target.finalDate);

  return (
    <article className={`countdown-card ${compact ? 'compact' : ''}`}>
      <div className="card-heading">
        <div>
          <h2>{target.name}</h2>
          <p>最終日 {formatJapaneseDate(target.finalDate)}</p>
        </div>
      </div>

      <div className={`main-count ${status.kind}`}>
        {status.kind === 'remaining' ? (
          <>
            <span className="count-prefix">あと</span>
            <strong>{calendarDays}</strong>
            <span className="count-unit">日</span>
          </>
        ) : (
          <strong className="status-label">{status.label}</strong>
        )}
      </div>

      {status.kind !== 'reached' && (
        <div className="pattern-results">
          <div className="result-row base-row">
            <span>📅 カレンダー日</span>
            <strong>{calendarDays}日</strong>
          </div>
          {target.patterns.map((pattern) => (
            <div className="result-row" key={pattern.id}>
              <span>{pattern.name}</span>
              <strong>{calculatePatternDays(target, pattern, currentKey)}日</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function SettingsPage({ data, setData }: Omit<PageProps, 'currentKey'>) {
  const handleExport = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ato-nannichi-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const next = importJson(await file.text());
      setData(next);
      alert('設定を読み込みました。');
    } catch (error) {
      alert(error instanceof Error ? error.message : '設定を読み込めませんでした。');
    }
  };

  const reset = () => {
    if (confirm('すべての設定を削除しますか？')) setData(emptyData());
  };

  return (
    <>
      <Header title="設定" back="/" />
      <main className="page">
        <button className="home-link-card" onClick={() => go('/')}>
          <span className="home-link-icon" aria-hidden="true">📅</span>
          <span className="home-link-copy">
            <strong>カウント画面を表示</strong>
            <small>残り日数の一覧へ戻る</small>
          </span>
          <span className="home-link-chevron" aria-hidden="true">›</span>
        </button>

        <section className="section">
          <h2>目標一覧</h2>
          <div className="settings-list">
            {data.targets.map((target) => (
              <button
                className="settings-card"
                key={target.id}
                onClick={() => go(`/target/${target.id}`)}
              >
                <span>
                  <strong>{target.name}</strong>
                  <small>最終日 {formatJapaneseDate(target.finalDate)}</small>
                </span>
                <span>›</span>
              </button>
            ))}
          </div>
          <button className="primary-button" onClick={() => go('/target/new')}>
            ＋ 目標を追加
          </button>
        </section>

        <section className="section">
          <h2>データ管理</h2>
          <button className="secondary-button" onClick={handleExport}>
            設定を書き出す（JSON）
          </button>
          <label className="secondary-button file-button">
            設定を読み込む（JSON）
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                void handleImport(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
          </label>
          <button className="danger-button" onClick={reset}>
            全設定を初期化
          </button>
        </section>
      </main>
    </>
  );
}

function TargetEditor({ data, setData, targetId }: Omit<PageProps, 'currentKey'> & { targetId: string }) {
  const existing = data.targets.find((t) => t.id === targetId);
  const isNew = targetId === 'new';
  const [name, setName] = useState(existing?.name ?? '');
  const [finalDate, setFinalDate] = useState(existing?.finalDate ?? todayKey());

  if (!isNew && !existing) {
    return (
      <>
        <Header title="目標を編集" back="/settings" />
        <main className="page"><p>目標が見つかりません。</p></main>
      </>
    );
  }

  const save = () => {
    if (!name.trim()) {
      alert('名前を入力してください。');
      return;
    }

    if (isNew) {
      const target: Target = {
        id: makeId(),
        name: name.trim(),
        finalDate,
        patterns: [],
      };
      setData((prev) => ({ ...prev, targets: [...prev.targets, target] }));
      go('/settings');
      return;
    }

    setData((prev) => ({
      ...prev,
      targets: prev.targets.map((target) =>
        target.id === targetId ? { ...target, name: name.trim(), finalDate } : target,
      ),
    }));
    go('/settings');
  };

  const remove = () => {
    if (!existing || !confirm(`「${existing.name}」を削除しますか？`)) return;
    setData((prev) => ({
      ...prev,
      targets: prev.targets.filter((target) => target.id !== targetId),
    }));
    go('/settings');
  };

  return (
    <>
      <Header title={isNew ? '目標を追加' : '目標を編集'} back="/settings" />
      <main className="page">
        <section className="section form-section">
          <label>
            名前
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：年度末、イベントなど" />
            <div className="suggestion-block">
              <span className="suggestion-label">よく使う名前</span>
              <div className="suggestion-chips">
                {targetNameSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    className={`suggestion-chip ${name === suggestion ? 'selected' : ''}`}
                    key={suggestion}
                    onClick={() => setName(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </label>

          <label>
            最終日
            <input type="date" value={finalDate} onChange={(e) => setFinalDate(e.target.value)} />
          </label>
        </section>

        {!isNew && existing && (
          <section className="section">
            <h2>カウントパターン</h2>
            <div className="settings-list">
              {existing.patterns.map((pattern, index) => (
                <button
                  className="settings-card pattern-settings-card"
                  key={pattern.id}
                  onClick={() => go(`/pattern/${existing.id}/${pattern.id}`)}
                >
                  <span className={`pattern-accent pattern-accent-${index + 1}`} aria-hidden="true" />
                  <span className="pattern-card-copy">
                    <strong>{pattern.name}</strong>
                    <small>{patternSummary(pattern)}</small>
                  </span>
                  <span>›</span>
                </button>
              ))}
            </div>
            {existing.patterns.length < 3 && (
              <button className="secondary-button" onClick={() => go(`/pattern/${existing.id}/new`)}>
                ＋ パターンを追加
              </button>
            )}
          </section>
        )}

        <div className="sticky-actions">
          <button className="primary-button" onClick={save}>保存</button>
          {!isNew && <button className="danger-link" onClick={remove}>この目標を削除</button>}
        </div>
      </main>
    </>
  );
}

const patternSummary = (pattern: CountPattern) => {
  const parts: string[] = [];
  if (pattern.excludeSaturday && pattern.excludeSunday) parts.push('土日');
  else {
    if (pattern.excludeSaturday) parts.push('土曜');
    if (pattern.excludeSunday) parts.push('日曜');
  }
  if (pattern.excludeHolidays) parts.push('祝日');
  if (pattern.excludeFinalDay) parts.push('最終日');
  return parts.length ? `${parts.join('・')}を除外` : '自動除外なし';
};

function PatternEditor({
  data,
  setData,
  targetId,
  patternId,
  currentKey,
}: PageProps & { targetId: string; patternId: string }) {
  const target = data.targets.find((t) => t.id === targetId);
  const existing = target?.patterns.find((p) => p.id === patternId);
  const isNew = patternId === 'new';
  const [draft, setDraft] = useState<CountPattern>(existing ?? defaultPattern());

  if (!target || (!isNew && !existing)) {
    return (
      <>
        <Header title="パターン編集" back="/settings" />
        <main className="page"><p>対象が見つかりません。</p></main>
      </>
    );
  }

  const save = () => {
    if (!draft.name.trim()) {
      alert('パターン名を入力してください。');
      return;
    }

    setData((prev) => ({
      ...prev,
      targets: prev.targets.map((item) => {
        if (item.id !== targetId) return item;
        if (isNew) {
          if (item.patterns.length >= 3) return item;
          return { ...item, patterns: [...item.patterns, { ...draft, name: draft.name.trim() }] };
        }
        return {
          ...item,
          patterns: item.patterns.map((pattern) =>
            pattern.id === patternId ? { ...draft, name: draft.name.trim() } : pattern,
          ),
        };
      }),
    }));
    go(`/target/${targetId}`);
  };

  const remove = () => {
    if (isNew || !confirm(`「${draft.name}」を削除しますか？`)) return;
    setData((prev) => ({
      ...prev,
      targets: prev.targets.map((item) =>
        item.id === targetId
          ? { ...item, patterns: item.patterns.filter((pattern) => pattern.id !== patternId) }
          : item,
      ),
    }));
    go(`/target/${targetId}`);
  };

  return (
    <>
      <Header title="パターン編集" back={`/target/${targetId}`} />
      <main className="page">
        <section className="section form-section">
          <label>
            パターン名
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>

          <h2>自動で除外する日</h2>
          <Toggle label="土曜日を除外" checked={draft.excludeSaturday} onChange={(v) => setDraft({ ...draft, excludeSaturday: v })} />
          <Toggle label="日曜日を除外" checked={draft.excludeSunday} onChange={(v) => setDraft({ ...draft, excludeSunday: v })} />
          <Toggle label="日本の祝日を除外" checked={draft.excludeHolidays} onChange={(v) => setDraft({ ...draft, excludeHolidays: v })} />
          <Toggle label="最終日を除外" checked={draft.excludeFinalDay} onChange={(v) => setDraft({ ...draft, excludeFinalDay: v })} />
          <p className="hint">最終日はこの設定が土日・祝日の設定より優先されます。</p>
        </section>

        <CalendarEditor
          target={target}
          pattern={draft}
          currentKey={currentKey}
          onChange={setDraft}
        />

        <div className="sticky-actions">
          <button className="primary-button" onClick={save}>保存</button>
          {!isNew && <button className="danger-link" onClick={remove}>このパターンを削除</button>}
        </div>
      </main>
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function CalendarEditor({
  target,
  pattern,
  currentKey,
  onChange,
}: {
  target: Target;
  pattern: CountPattern;
  currentKey: string;
  onChange: (pattern: CountPattern) => void;
}) {
  const initial = fromDateKey(currentKey);
  const [monthDate, setMonthDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const cells = useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [monthDate]);

  const jump = (key: string) => {
    const date = fromDateKey(key);
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const toggleDay = (date: Date) => {
    const key = toDateKey(date);
    if (key === target.finalDate) return;
    if (compareDateKeys(key, currentKey) < 0) return;
    if (compareDateKeys(key, target.finalDate) > 0) return;

    const overrides = { ...pattern.overrides };
    if (overrides[key]) {
      delete overrides[key];
    } else {
      overrides[key] = isAutoExcluded(date, pattern) ? 'include' : 'exclude';
    }
    onChange({ ...pattern, overrides });
  };

  return (
    <section className="section calendar-section">
      <div className="calendar-title-row">
        <div>
          <h2>個別に変更</h2>
          <p className="calendar-title-hint">表示する月を移動できます</p>
        </div>
        <div className="jump-buttons">
          <button onClick={() => jump(currentKey)} aria-label="今日がある月を表示">今日を表示</button>
          <button onClick={() => jump(target.finalDate)} aria-label="最終日がある月を表示">最終日を表示</button>
        </div>
      </div>

      <div className="month-nav">
        <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}>‹</button>
        <strong>{monthDate.getFullYear()}年{monthDate.getMonth() + 1}月</strong>
        <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}>›</button>
      </div>

      <div className="calendar-grid weekday-row">
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-grid">
        {cells.map((date) => {
          const key = toDateKey(date);
          const inMonth = date.getMonth() === monthDate.getMonth();
          const isPast = compareDateKeys(key, currentKey) < 0;
          const afterFinal = compareDateKeys(key, target.finalDate) > 0;
          const isFinal = key === target.finalDate;
          const override = pattern.overrides[key];
          const autoExcluded = isAutoExcluded(date, pattern);
          const disabled = isPast || afterFinal || isFinal;
          const classes = [
            'calendar-day',
            !inMonth ? 'outside-month' : '',
            disabled ? 'disabled' : '',
            isFinal ? 'final-day' : '',
            override === 'include' ? 'manual-include' : '',
            override === 'exclude' ? 'manual-exclude' : '',
            !override && autoExcluded && !isFinal ? 'auto-excluded' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              className={classes}
              key={key}
              disabled={disabled}
              onClick={() => toggleDay(date)}
              title={isFinal ? '最終日（上の設定で除外を変更）' : undefined}
            >
              {isFinal && <span className="day-mark">★</span>}
              {override === 'exclude' && <span className="day-mark">×</span>}
              <span>{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span><i className="legend-dot normal" />カウント</span>
        <span><i className="legend-dot auto" />自動除外</span>
        <span><i className="legend-dot include" />個別にカウント</span>
        <span><i className="legend-dot exclude" />個別に除外</span>
        <span><i className="legend-dot final" />最終日</span>
      </div>
      <p className="hint">日付をタップすると自動判定と反対の扱いになります。もう一度タップすると自動判定に戻ります。</p>
    </section>
  );
}

export default function App() {
  const path = useHashPath();
  const currentKey = useToday();
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  if (path === '/') return <HomePage data={data} currentKey={currentKey} />;
  if (path === '/settings') return <SettingsPage data={data} setData={setData} />;

  const targetMatch = path.match(/^\/target\/([^/]+)$/);
  if (targetMatch) {
    return <TargetEditor data={data} setData={setData} targetId={targetMatch[1]} />;
  }

  const patternMatch = path.match(/^\/pattern\/([^/]+)\/([^/]+)$/);
  if (patternMatch) {
    return (
      <PatternEditor
        data={data}
        setData={setData}
        currentKey={currentKey}
        targetId={patternMatch[1]}
        patternId={patternMatch[2]}
      />
    );
  }

  return (
    <>
      <Header title="あと何日？" back="/" />
      <main className="page"><p>ページが見つかりません。</p></main>
    </>
  );
}
