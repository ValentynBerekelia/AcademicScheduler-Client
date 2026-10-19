import { useState, useEffect, useMemo, ReactNode } from 'react';
import {
  ChevronRight, UserCircle2, Users, Mail, LayoutGrid, CalendarDays, Bell, Calendar,
  RefreshCw, Trash2, Unlink, Check, Loader2, GraduationCap, Palette, Sun, Moon, Monitor, Type, X,
  Sparkles, Link2,
} from 'lucide-react';
import {
  UserProfile, UserSettingsDto, ExamDto, GroupItemDto, ScheduleSlotDto,
  updateMySettings, updateMyGroup, getGroups, getExams,
  getSubjectAliases, saveSubjectAliases, getGroupSubjects, aliasMap,
  resyncCalendar, clearCalendar, disconnectCalendar, API_BASE_URL,
} from '../utils/api';
import { ProfileDropdown } from './ProfileDropdown';
import { EXAM_TYPE_LABELS, EXAM_TYPE_BADGE, daysUntil } from './ExamWidgets';
import { SlotCard, ScheduleDisplayContext, displayOptionsFrom, cardHeight, FONT_STACKS, useWebFont } from './ScheduleDisplay';

interface CabinetPageProps {
  profile: UserProfile;
  settings: UserSettingsDto;
  onSettingsChange: (s: UserSettingsDto) => void;
  onBack: () => void;
  onLogout: () => void;
  onProfileRefresh: () => void;
  onAdminPanel?: () => void;
  onTeacherCabinet?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Адміністратор',
  Teacher: 'Викладач',
  User: 'Студент',
};

const THEME_OPTIONS: { value: UserSettingsDto['theme']; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Світла', icon: Sun },
  { value: 'dark', label: 'Темна', icon: Moon },
  { value: 'system', label: 'Як у системі', icon: Monitor },
];

const TEXT_SIZE_OPTIONS: { value: UserSettingsDto['scheduleTextSize']; label: string }[] = [
  { value: 'sm', label: 'Малий' },
  { value: 'md', label: 'Звичайний' },
  { value: 'lg', label: 'Великий' },
];

const FONT_OPTIONS: { value: UserSettingsDto['scheduleFont']; label: string }[] = [
  { value: 'default', label: 'Стандартний' },
  { value: 'serif', label: 'З засічками' },
  { value: 'rounded', label: 'Округлий' },
  { value: 'mono', label: 'Моноширинний' },
];

const WEIGHT_OPTIONS: { value: UserSettingsDto['subjectWeight']; label: string }[] = [
  { value: 'normal', label: 'Звичайна' },
  { value: 'semibold', label: 'Напівжирна' },
  { value: 'bold', label: 'Жирна' },
];

type CabinetTab = 'profile' | 'customization' | 'notifications' | 'integrations';

const TABS: { key: CabinetTab; label: string; icon: typeof Bell }[] = [
  { key: 'profile', label: 'Профіль', icon: UserCircle2 },
  { key: 'customization', label: 'Кастомізація', icon: Sparkles },
  { key: 'notifications', label: 'Сповіщення', icon: Bell },
  { key: 'integrations', label: 'Інтеграції', icon: Link2 },
];

const TAB_STORAGE_KEY = 'cabinet_tab';

function initialTab(): CabinetTab {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.some(t => t.key === saved) ? (saved as CabinetTab) : 'profile';
  } catch {
    return 'profile';
  }
}

/** Each option is drawn in its own font, so the choice is visible before picking it. */
function FontPicker({ value, onChange }: {
  value: UserSettingsDto['scheduleFont'];
  onChange: (v: UserSettingsDto['scheduleFont']) => void;
}) {
  useWebFont('rounded');  // so the «Округлий» tile shows the real font
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {FONT_OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          style={{ fontFamily: FONT_STACKS[o.value] }}
          className={`rounded-lg border px-3 py-2 text-left transition-colors ${
            value === o.value ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span className="block text-lg leading-tight text-gray-900">Аа Бб</span>
          <span className="block text-xs text-gray-500 mt-0.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// Shown in the preview when the user's group has no lessons to borrow a subject from
const SAMPLE_SUBJECT = 'Іноземна мова (за професійним спрямуванням)';

function sampleSlot(subject: string): ScheduleSlotDto {
  return {
    id: 0, semesterId: 0, groupId: 0, groupTitle: null, day: 'MONDAY', semesterClassId: 1, weekType: 0,
    subjectForSite: subject, startTime: '08:20', endTime: '09:40', className: '1',
    teacherFullName: 'Бортник Світлана Борисівна', roomName: '1 к. 11 ауд.', lessonType: 'PRACTICAL', linkToMeeting: null,
  };
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
      {options.map((o, i) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-3 py-1.5 transition-colors ${i > 0 ? 'border-l border-gray-300' : ''} ${
            value === o.value ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const REMINDER_OPTIONS: { value: UserSettingsDto['examReminderDays']; label: string }[] = [
  { value: 0, label: 'Не нагадувати' },
  { value: 1, label: 'За 1 день' },
  { value: 3, label: 'За 3 дні' },
  { value: 7, label: 'За тиждень' },
];

function Section({ icon: Icon, title, description, children }: {
  icon: typeof Bell;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
        <Icon size={18} className="text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        checked ? 'bg-emerald-600' : 'bg-gray-300'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-[#fff] shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

export function CabinetPage({
  profile, settings, onSettingsChange, onBack, onLogout, onProfileRefresh, onAdminPanel, onTeacherCabinet,
}: CabinetPageProps) {
  const isStudent = profile.role !== 'Teacher';
  const [tab, setTab] = useState<CabinetTab>(initialTab);
  const selectTab = (next: CabinetTab) => {
    setTab(next);
    try { localStorage.setItem(TAB_STORAGE_KEY, next); } catch { /* storage unavailable */ }
  };
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const [groups, setGroups] = useState<GroupItemDto[]>([]);
  const [groupInput, setGroupInput] = useState(profile.group ?? '');
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupMsg, setGroupMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMsg, setCalendarMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [exams, setExams] = useState<ExamDto[] | null>(null);

  // Own subject names: `aliasDraft` is what the inputs show, `savedAliases` what the server has
  const [subjects, setSubjects] = useState<string[]>([]);
  const [savedAliases, setSavedAliases] = useState<Record<string, string>>({});
  const [aliasDraft, setAliasDraft] = useState<Record<string, string>>({});
  const [aliasState, setAliasState] = useState<{ saving: boolean; msg: { text: string; ok: boolean } | null }>({ saving: false, msg: null });

  useEffect(() => {
    getSubjectAliases().then(items => {
      const record = Object.fromEntries(items.map(i => [i.subject, i.alias]));
      setSavedAliases(record);
      setAliasDraft(record);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isStudent || !profile.group) { setSubjects([]); return; }
    getGroupSubjects(profile.group).then(setSubjects).catch(() => setSubjects([]));
  }, [profile.group, isStudent]);

  const aliasesDirty = JSON.stringify(cleanAliases(aliasDraft)) !== JSON.stringify(cleanAliases(savedAliases));

  const saveAliases = async () => {
    setAliasState({ saving: true, msg: null });
    try {
      const items = Object.entries(cleanAliases(aliasDraft)).map(([subject, alias]) => ({ subject, alias }));
      const saved = Object.fromEntries((await saveSubjectAliases(items)).map(i => [i.subject, i.alias]));
      setSavedAliases(saved);
      setAliasDraft(saved);
      setAliasState({ saving: false, msg: { text: 'Назви збережено', ok: true } });
    } catch (e) {
      setAliasState({ saving: false, msg: { text: e instanceof Error ? e.message : 'Помилка збереження', ok: false } });
    }
  };

  // The preview reflects unsaved edits too
  const previewOptions = useMemo(
    () => displayOptionsFrom(settings, aliasMap(
      Object.entries(cleanAliases(aliasDraft)).map(([subject, alias]) => ({ subject, alias })))),
    [settings, aliasDraft],
  );
  const previewSubject = subjects.find(sub => aliasDraft[sub]?.trim())
    ?? subjects.find(sub => sub.length > 30)
    ?? subjects[0]
    ?? SAMPLE_SUBJECT;

  useEffect(() => {
    if (isStudent) getGroups().then(setGroups).catch(() => {});
  }, [isStudent]);

  useEffect(() => {
    setGroupInput(profile.group ?? '');
    if (!isStudent || !profile.group) { setExams([]); return; }
    getExams(profile.group).then(setExams).catch(() => setExams([]));
  }, [profile.group, isStudent]);

  // Every change is saved immediately; on failure the previous value is restored
  const update = async (patch: Partial<UserSettingsDto>) => {
    const previous = settings;
    const next = { ...settings, ...patch };
    onSettingsChange(next);
    setSaveState('saving');
    try {
      onSettingsChange(await updateMySettings(next));
      setSaveState('saved');
    } catch (e) {
      onSettingsChange(previous);
      setSaveError(e instanceof Error ? e.message : 'Помилка збереження');
      setSaveState('error');
    }
  };

  const saveGroup = async () => {
    if (!groupInput.trim() || groupInput === profile.group) return;
    setGroupSaving(true);
    setGroupMsg(null);
    try {
      await updateMyGroup(groupInput.trim());
      onProfileRefresh();
      setGroupMsg({ text: 'Групу збережено', ok: true });
    } catch (e) {
      setGroupMsg({ text: e instanceof Error ? e.message : 'Помилка збереження групи', ok: false });
    } finally {
      setGroupSaving(false);
    }
  };

  const calendarAction = async (action: () => Promise<void>, okText: string, errText: string) => {
    setCalendarLoading(true);
    setCalendarMsg(null);
    try {
      await action();
      setCalendarMsg({ text: okText, ok: true });
    } catch {
      setCalendarMsg({ text: errText, ok: false });
    } finally {
      setCalendarLoading(false);
    }
  };

  const upcomingExams = (exams ?? []).filter(e => daysUntil(e.date) >= 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
            <button onClick={onBack} className="hover:text-gray-900 transition-colors">Розклад</button>
            <ChevronRight size={14} className="shrink-0" />
            <span className="font-semibold text-gray-900 truncate">Особистий кабінет</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs flex items-center gap-1 ${
              saveState === 'error' ? 'text-red-600' : 'text-gray-400'
            }`}>
              {saveState === 'saving' && <><Loader2 size={12} className="animate-spin" /> Збереження…</>}
              {saveState === 'saved' && <><Check size={12} className="text-emerald-600" /> Збережено</>}
              {saveState === 'error' && saveError}
            </span>
            <ProfileDropdown
              profile={profile}
              onLogout={onLogout}
              onAdminPanel={onAdminPanel}
              onProfileRefresh={onProfileRefresh}
              onTeacherCabinet={onTeacherCabinet}
            />
          </div>
        </div>
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto overflow-y-hidden" aria-label="Розділи кабінету">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => selectTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === key
                  ? 'border-emerald-600 text-emerald-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {tab === 'profile' && (
          <>
          {/* Profile */}
          <Section icon={UserCircle2} title="Профіль">
            <Row label={profile.name} hint={ROLE_LABELS[profile.role] ?? profile.role}>
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <Mail size={14} className="text-gray-400" /> {profile.email}
              </span>
            </Row>
            {isStudent && (
              <Row label="Моя група" hint="Від неї залежать розклад, екзамени та нагадування">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  <select
                    value={groupInput}
                    onChange={e => setGroupInput(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="">— Оберіть групу —</option>
                    {groupInput && !groups.find(g => g.title === groupInput) && (
                      <option value={groupInput}>{groupInput}</option>
                    )}
                    {groups.map(g => <option key={g.id} value={g.title}>{g.title}</option>)}
                  </select>
                  <button
                    onClick={saveGroup}
                    disabled={groupSaving || !groupInput.trim() || groupInput === profile.group}
                    className="px-3 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Зберегти
                  </button>
                </div>
                {groupMsg && (
                  <p className={`text-xs mt-1 ${groupMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{groupMsg.text}</p>
                )}
              </Row>
            )}
          </Section>

          {/* Session */}
          {isStudent && (
            <Section
              icon={GraduationCap}
              title="Моя сесія"
              description="Екзамени підтягуються з розкладу університету автоматично, адміністратор може їх уточнити"
            >
              {exams === null ? (
                <p className="px-5 py-4 text-sm text-gray-400">Завантаження…</p>
              ) : !profile.group ? (
                <p className="px-5 py-4 text-sm text-gray-500">Вкажіть групу, щоб бачити свої екзамени.</p>
              ) : upcomingExams.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-500">
                  Розклад сесії для групи {profile.group} ще не опубліковано.
                </p>
              ) : (
                upcomingExams.map(e => (
                  <div key={e.id} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-sm font-medium text-gray-700 w-28 shrink-0">
                      {new Date(e.date + 'T00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', weekday: 'short' })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_TYPE_BADGE[e.type]}`}>
                      {EXAM_TYPE_LABELS[e.type]}
                    </span>
                    <span className="text-sm text-gray-900 flex-1 min-w-[12rem]">{e.subject}</span>
                    <span className="text-xs text-gray-500">{[e.startTime, e.room].filter(Boolean).join(' · ')}</span>
                  </div>
                ))
              )}
            </Section>
          )}
          </>
        )}

        {tab === 'customization' && (
          <>
          {/* Appearance */}
          <Section icon={Palette} title="Оформлення">
            <Row label="Тема" hint="«Як у системі» перемикається разом із темою телефона чи комп'ютера">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }, i) => (
                  <button
                    key={value}
                    onClick={() => update({ theme: value })}
                    aria-pressed={settings.theme === value}
                    className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${i > 0 ? 'border-l border-gray-300' : ''} ${
                      settings.theme === value ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          {/* Home screen widgets */}
          {isStudent && (
            <Section icon={LayoutGrid} title="Головний екран" description="Що показувати над розкладом">
              <Row label="Зворотний відлік до екзамену" hint="Картка «До екзамену з … залишилось N днів»">
                <Toggle label="Зворотний відлік" checked={settings.showExamCountdown}
                  onChange={v => update({ showExamCountdown: v })} />
              </Row>
              <Row label="Шкала сесії" hint="Усі екзамени по днях і скільки днів на підготовку між ними">
                <Toggle label="Шкала сесії" checked={settings.showSessionTimeline}
                  onChange={v => update({ showSessionTimeline: v })} />
              </Row>
              <Row label="Поточна / наступна пара" hint="Підказка «Зараз: …» або «Наступна через N хв» у панелі розкладу">
                <Toggle label="Поточна пара" checked={settings.showCurrentClass}
                  onChange={v => update({ showCurrentClass: v })} />
              </Row>
            </Section>
          )}

          {/* Schedule */}
          <Section icon={CalendarDays} title="Розклад">
            <Row label="Вигляд за замовчуванням" hint="Що відкривається при вході">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                {([['week', 'Тиждень'], ['semester', 'Весь семестр']] as const).map(([value, label], i) => (
                  <button
                    key={value}
                    onClick={() => update({ defaultView: value })}
                    className={`px-3 py-1.5 transition-colors ${i > 0 ? 'border-l border-gray-300' : ''} ${
                      settings.defaultView === value ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          {/* Schedule text */}
          <Section icon={Type} title="Текст у розкладі" description="Як виглядають картки пар">
            <div className="px-5 py-4 flex flex-col md:flex-row gap-5">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-gray-800">Розмір тексту</span>
                  <Segmented value={settings.scheduleTextSize} options={TEXT_SIZE_OPTIONS}
                    onChange={v => update({ scheduleTextSize: v })} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm text-gray-800">Шрифт</span>
                  <FontPicker value={settings.scheduleFont} onChange={v => update({ scheduleFont: v })} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-gray-800">Назва предмета</span>
                  <Segmented value={settings.subjectWeight} options={WEIGHT_OPTIONS}
                    onChange={v => update({ subjectWeight: v })} />
                </div>
                {([
                  ['showTeacher', 'Показувати викладача'],
                  ['showRoom', 'Показувати аудиторію'],
                  ['showLessonType', 'Показувати тип заняття'],
                  ['shortTeacherNames', 'Скорочувати ПІБ викладача (Бортник С. Б.)'],
                  ['translateLessonTypes', 'Типи занять українською (Лекція замість LECTURE)'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-800">{label}</span>
                    <Toggle label={label} checked={settings[key]} onChange={v => update({ [key]: v })} />
                  </div>
                ))}
              </div>
              <div className="md:w-64 shrink-0">
                <p className="text-xs text-gray-500 mb-1.5">Попередній перегляд</p>
                <ScheduleDisplayContext.Provider value={previewOptions}>
                  <SlotCard slot={sampleSlot(previewSubject)} isReplacement={false} height={cardHeight(previewOptions, false)} />
                </ScheduleDisplayContext.Provider>
              </div>
            </div>

            {isStudent && (
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-800">Власні назви предметів</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Наприклад, «Англійська» замість довгої офіційної назви. Бачите лише ви; повна назва — у підказці при наведенні.
                  </p>
                </div>
                {subjects.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {profile.group ? 'У розкладі групи поки немає предметів.' : 'Вкажіть групу, щоб налаштувати назви.'}
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                    {subjects.map(subject => (
                      <div key={subject} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2">
                        <span className="flex-1 min-w-0 text-sm text-gray-700 truncate" title={subject}>{subject}</span>
                        <div className="flex items-center gap-1.5 sm:w-64 shrink-0">
                          <input
                            value={aliasDraft[subject] ?? ''}
                            onChange={e => setAliasDraft(d => ({ ...d, [subject]: e.target.value }))}
                            placeholder="Своя назва"
                            maxLength={60}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                          />
                          {aliasDraft[subject] && (
                            <button
                              onClick={() => setAliasDraft(d => ({ ...d, [subject]: '' }))}
                              title="Повернути офіційну назву"
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {subjects.length > 0 && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveAliases}
                      disabled={!aliasesDirty || aliasState.saving}
                      className="px-4 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      {aliasState.saving ? 'Збереження…' : 'Зберегти назви'}
                    </button>
                    {aliasState.msg && (
                      <span className={`text-xs ${aliasState.msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{aliasState.msg.text}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>
          </>
        )}

        {tab === 'notifications' && (
          <>
          {/* Notifications */}
          <Section icon={Bell} title="Сповіщення" description="Приходять у дзвіночок на сайті">
            <Row label="Суботні відпрацювання та заміни">
              <Toggle label="Сповіщення про заміни" checked={settings.notifyReplacements}
                onChange={v => update({ notifyReplacements: v })} />
            </Row>
            {isStudent && (
              <Row label="Скасування та перенесення пар онлайн" hint="Лише для пар вашої групи">
                <Toggle label="Сповіщення про скасування" checked={settings.notifyCancellations}
                  onChange={v => update({ notifyCancellations: v })} />
              </Row>
            )}
            {isStudent && (
              <Row label="Нагадування про екзамени та заліки" hint="Одне нагадування на кожен екзамен">
                <select
                  value={settings.examReminderDays}
                  onChange={e => update({ examReminderDays: Number(e.target.value) as UserSettingsDto['examReminderDays'] })}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Row>
            )}
          </Section>
          </>
        )}

        {tab === 'integrations' && (
          <>
          {/* Google Calendar */}
          <Section
            icon={Calendar}
            title="Google Calendar"
            description="Пари, відпрацювання та екзамени у вашому календарі; скасування й перенесення оновлюються автоматично"
          >
            {profile.calendarSyncEnabled ? (
              <div className="px-5 py-4 space-y-3">
                <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  <Check size={12} /> Підключено
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={calendarLoading}
                    onClick={() => calendarAction(resyncCalendar, 'Синхронізовано', 'Помилка синхронізації')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={calendarLoading ? 'animate-spin' : ''} /> Синхронізувати
                  </button>
                  <button
                    disabled={calendarLoading}
                    onClick={() => calendarAction(clearCalendar, 'Пари видалено з календаря', 'Помилка очищення')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Очистити календар
                  </button>
                  <button
                    disabled={calendarLoading}
                    onClick={async () => { await disconnectCalendar(); onProfileRefresh(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Unlink size={14} /> Відключити
                  </button>
                </div>
                {calendarMsg && (
                  <p className={`text-xs ${calendarMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{calendarMsg.text}</p>
                )}
              </div>
            ) : (
              <div className="px-5 py-4">
                <a
                  href={`${API_BASE_URL}/calendar/connect`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  <Calendar size={15} /> Підключити Google Calendar
                </a>
              </div>
            )}
          </Section>
          </>
        )}
      </main>
    </div>
  );
}

// Drops empty names and names equal to the official title; keys sorted so drafts compare reliably
function cleanAliases(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record)
      .map(([subject, alias]) => [subject, alias.trim()] as const)
      .filter(([subject, alias]) => alias && alias !== subject)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}
