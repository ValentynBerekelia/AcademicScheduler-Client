import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getCurrentWeek, getGroups, getCurrentSemester, getCancellations, getExams, getSubjectAliases, aliasMap,
  CurrentWeekDto, WeekDayDto, ScheduleSlotDto,
  UserProfile, GroupItemDto, ClassCancellationDto, ExamDto, UserSettingsDto,
} from '../utils/api';
import { Calendar, Clock, ChevronLeft, ChevronRight, Printer, DoorOpen } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';
import { FreeRoomsModal } from './FreeRoomsModal';
import { ExamCountdownCard, SessionTimeline } from './ExamWidgets';
import { useIsMobile } from './ui/use-mobile';
import { SlotCard, ScheduleDisplayContext, displayOptionsFrom, useScheduleDisplay, cardHeight } from './ScheduleDisplay';

interface SchedulePageProps {
  profile: UserProfile;
  settings: UserSettingsDto;
  onLogout: () => void;
  onUnauthorized: () => void;
  onAdminPanel?: () => void;
  onProfileRefresh?: () => void;
  onTeacherSchedule?: () => void;
  onTeacherCabinet?: () => void;
  onCabinet?: () => void;
}

type ViewMode = 'week' | 'semester';

const DAY_NAMES: Record<string, string> = {
  MONDAY: 'Понеділок',
  TUESDAY: 'Вівторок',
  WEDNESDAY: 'Середа',
  THURSDAY: 'Четвер',
  FRIDAY: 'П\'ятниця',
  SATURDAY: 'Субота',
};

const WEEK_TYPE_LABELS: Record<string, string> = {
  Odd: 'Непарний',
  Even: 'Парний',
};



function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Local calendar date (toISOString would give the UTC date, wrong after midnight in Kyiv)
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr(): string {
  return localDateStr(new Date());
}

const SHORT_DAY_NAMES: Record<string, string> = {
  MONDAY: 'Пн', TUESDAY: 'Вт', WEDNESDAY: 'Ср', THURSDAY: 'Чт', FRIDAY: 'Пт', SATURDAY: 'Сб',
};

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getAllWeekMondays(startDay: string, endDay: string): string[] {
  const mondays: string[] = [];
  let current = getMondayOf(startDay);
  const end = endDay;
  while (current <= end) {
    mondays.push(current);
    current = addDays(current, 7);
  }
  return mondays;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(+y, +m - 1, +d);
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function DayColumn({ day, allClassNames, cancellationMap, isToday, nowMin, cellHeight }: {
  day: WeekDayDto;
  allClassNames: string[];
  cancellationMap: Map<number, string | null>; // semesterClassId -> meetingLink (null=cancelled)
  isToday: boolean;
  nowMin: number;
  // Fixed card height in the week grid; undefined on phones (cards follow their content)
  cellHeight?: number;
}) {
  const dayLabel = DAY_NAMES[day.dayName] ?? day.dayName;
  const slotByClass = new Map(day.slots.map(s => [s.className ?? String(s.semesterClassId), s]));

  const headerClass = isToday
    ? 'bg-emerald-600 text-white border-emerald-500'
    : day.isReplacement ? 'bg-amber-100' : 'bg-gray-50';

  const colClass = isToday
    ? 'flex-1 min-w-0 border-r border-gray-200 last:border-r-0 bg-emerald-50/20'
    : `flex-1 min-w-0 border-r border-gray-200 last:border-r-0 ${day.isReplacement ? 'bg-amber-50/40' : ''}`;

  return (
    <div className={colClass}>
      <div className={`px-3 py-3 border-b border-gray-200 text-center ${headerClass}`}>
        <p className={`font-semibold text-sm ${isToday ? 'text-white' : 'text-gray-900'}`}>{dayLabel}</p>
        <p className={`text-xs ${isToday ? 'text-emerald-100' : 'text-gray-500'}`}>{formatDate(day.date)}</p>
        {isToday && <p className="text-[10px] text-emerald-200 font-medium mt-0.5">сьогодні</p>}
        {!isToday && day.isReplacement && day.replacesDay && (
          <p className="text-xs text-amber-700 mt-1 font-medium">
            відробіток за {DAY_NAMES[day.replacesDay] ?? day.replacesDay}
            {day.replacesWeekType && (
              <span className="block text-[10px] text-amber-600 font-normal">
                ({WEEK_TYPE_LABELS[day.replacesWeekType] ?? day.replacesWeekType} тиждень)
              </span>
            )}
          </p>
        )}
      </div>
      <div className="p-2 space-y-2">
        {allClassNames.map(cn => {
          const slot = slotByClass.get(cn);
          if (!slot) return cellHeight ? <div key={cn} style={{ height: cellHeight }} /> : null;
          const cancellation = cancellationMap.has(slot.semesterClassId)
            ? cancellationMap.get(slot.semesterClassId)
            : undefined;
          const isCancelled = cancellation !== undefined;
          const onlineMeetingLink = (cancellation != null && cancellation !== undefined) ? cancellation : undefined;
          const isActive = isToday && !!slot.startTime && !!slot.endTime
            && nowMin >= parseTime(slot.startTime) && nowMin <= parseTime(slot.endTime);
          return <SlotCard key={slot.id} slot={slot} isReplacement={day.isReplacement} isCancelled={isCancelled} onlineMeetingLink={onlineMeetingLink} isActive={isActive} height={cellHeight} />;
        })}
      </div>
    </div>
  );
}

function WeekGrid({ week, label, cancellations, now }: {
  week: CurrentWeekDto;
  label?: string;
  cancellations?: ClassCancellationDto[];
  now: Date;
}) {
  const allClassNames = [
    ...new Set(week.days.flatMap(d => d.slots.map(s => s.className ?? String(s.semesterClassId)))),
  ].sort((a, b) => Number(a) - Number(b));

  // date -> semesterClassId -> meetingLink (null = cancelled, string = online)
  const cancelledByDate = new Map<string, Map<number, string | null>>();
  for (const c of (cancellations ?? [])) {
    if (!cancelledByDate.has(c.date)) cancelledByDate.set(c.date, new Map());
    cancelledByDate.get(c.date)!.set(c.semesterClassId, c.meetingLink ?? null);
  }

  const todayDateStr = localDateStr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Reserve a row for «Приєднатись онлайн» only in weeks that have a meeting link somewhere
  const withLinkRow = week.days.some(d => d.slots.some(sl => !!sl.linkToMeeting))
    || (cancellations ?? []).some(c => !!c.meetingLink);
  const gridCellHeight = cardHeight(useScheduleDisplay(), withLinkRow);

  // Phones get one day at a time: today if it is in this week, otherwise the first day
  const isMobile = useIsMobile();
  const defaultDay = (week.days.find(d => d.date === todayDateStr) ?? week.days[0])?.date;
  const [mobileDay, setMobileDay] = useState(defaultDay);
  useEffect(() => setMobileDay(defaultDay), [week.weekStart, defaultDay]);
  const selectedDay = week.days.find(d => d.date === mobileDay) ?? week.days[0];

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex flex-wrap items-center gap-3">
        <Calendar size={18} className="text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {label && <span className="font-semibold text-gray-700">{label}</span>}
          <span className="font-semibold text-gray-900">{week.groupTitle}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-700">Тиждень {week.weekNumber}</span>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            week.weekType === 'Odd' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {WEEK_TYPE_LABELS[week.weekType] ?? week.weekType}
          </span>
          <span className="text-sm text-gray-400">{formatDate(week.weekStart)} — {formatDate(week.weekEnd)}</span>
        </div>
      </div>
      {isMobile && selectedDay ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {week.days.map(day => {
              const active = day.date === selectedDay.date;
              const isToday = day.date === todayDateStr;
              return (
                <button
                  key={day.date}
                  onClick={() => setMobileDay(day.date)}
                  className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-xs transition-colors ${
                    active ? 'bg-emerald-600 text-white' : day.isReplacement ? 'bg-amber-50 text-gray-700' : 'text-gray-600'
                  }`}
                >
                  <span className="font-semibold">{SHORT_DAY_NAMES[day.dayName] ?? day.dayName.slice(0, 2)}</span>
                  <span className={active ? 'text-emerald-100' : 'text-gray-400'}>{Number(day.date.slice(8))}</span>
                  <span className={`w-1 h-1 rounded-full ${
                    isToday ? (active ? 'bg-white' : 'bg-emerald-500') : 'bg-transparent'
                  }`} />
                </button>
              );
            })}
          </div>
          {selectedDay.slots.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">Пар немає</p>
          ) : (
            <DayColumn
              day={selectedDay}
              allClassNames={[...new Set(selectedDay.slots.map(s => s.className ?? String(s.semesterClassId)))]
                .sort((a, b) => Number(a) - Number(b))}
              cancellationMap={cancelledByDate.get(selectedDay.date) ?? new Map()}
              isToday={selectedDay.date === todayDateStr}
              nowMin={nowMin}
            />
          )}
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex">
          {week.days.map(day => (
            <DayColumn
              key={day.date}
              day={day}
              allClassNames={allClassNames}
              cancellationMap={cancelledByDate.get(day.date) ?? new Map()}
              isToday={day.date === todayDateStr}
              nowMin={nowMin}
              cellHeight={gridCellHeight}
            />
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

const STORAGE_GROUP_KEY = 'schedule_selected_group';

export function SchedulePage({ profile, settings, onLogout, onUnauthorized, onAdminPanel, onProfileRefresh, onTeacherSchedule, onTeacherCabinet, onCabinet }: SchedulePageProps) {
  const now = useNow();
  const [groups, setGroups] = useState<GroupItemDto[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(
    () => profile.group || localStorage.getItem(STORAGE_GROUP_KEY) || ''
  );
  // Opens in the view chosen in the personal cabinet
  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultView);
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [aliases, setAliases] = useState<Map<string, string>>(new Map());
  const displayOptions = useMemo(() => displayOptionsFrom(settings, aliases), [settings, aliases]);

  useEffect(() => {
    getSubjectAliases().then(items => setAliases(aliasMap(items))).catch(() => {});
  }, []);
  const showExamWidgets = settings.showExamCountdown || settings.showSessionTimeline;
  const [currentDate, setCurrentDate] = useState<string>(todayStr);

  const [week, setWeek] = useState<CurrentWeekDto | null>(null);
  const [semesterWeeks, setSemesterWeeks] = useState<CurrentWeekDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellations, setCancellations] = useState<ClassCancellationDto[]>([]);
  const [showFreeRooms, setShowFreeRooms] = useState(false);

  // load groups once
  useEffect(() => {
    getGroups()
      .then(setGroups)
      .catch(() => {});
  }, []);

  // persist selected group
  useEffect(() => {
    if (selectedGroup) localStorage.setItem(STORAGE_GROUP_KEY, selectedGroup);
  }, [selectedGroup]);

  // exams of the group on screen (for the countdown / session widgets)
  useEffect(() => {
    if (!selectedGroup || !showExamWidgets) { setExams([]); return; }
    getExams(selectedGroup).then(setExams).catch(() => setExams([]));
  }, [selectedGroup, showExamWidgets]);

  const loadWeek = useCallback(async () => {
    if (!selectedGroup) return;
    setLoading(true);
    setError('');
    try {
      const sem = await getCurrentSemester();
      if (viewMode === 'week') {
        const data = await getCurrentWeek(selectedGroup, currentDate);
        setWeek(data);
        const firstSlot = data.days.flatMap(d => d.slots)[0];
        if (firstSlot) {
          getCancellations(sem.id, firstSlot.groupId, data.weekStart, data.weekEnd)
            .then(setCancellations).catch(() => {});
        }
      } else {
        if (!sem.startDay || !sem.endDay) throw new Error('Дати семестру не встановлені');
        const mondays = getAllWeekMondays(sem.startDay, sem.endDay);
        const weeks = await Promise.all(mondays.map(d => getCurrentWeek(selectedGroup, d)));
        setSemesterWeeks(weeks);
        const firstSlot = weeks.flatMap(w => w.days).flatMap(d => d.slots)[0];
        if (firstSlot) {
          getCancellations(sem.id, firstSlot.groupId)
            .then(setCancellations).catch(() => {});
        }
      }
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') onUnauthorized();
      else setError(e.message || 'Помилка завантаження розкладу');
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, currentDate, viewMode, onUnauthorized]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  const goWeek = (dir: -1 | 1) => setCurrentDate(d => addDays(d, dir * 7));

  const weekLabel = week
    ? `${formatDate(week.weekStart)} — ${formatDate(week.weekEnd)}`
    : '';

  const todayClassInfo = (() => {
    if (!settings.showCurrentClass || !week || viewMode !== 'week') return null;
    const todayDateStr = localDateStr(now);
    const todayDay = week.days.find(d => d.date === todayDateStr);
    if (!todayDay) return null;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slots = todayDay.slots.filter(s => s.startTime && s.endTime);
    const active = slots.find(s => nowMin >= parseTime(s.startTime!) && nowMin <= parseTime(s.endTime!));
    if (active) return { type: 'active' as const, slot: active };
    const next = slots
      .filter(s => parseTime(s.startTime!) > nowMin)
      .sort((a, b) => parseTime(a.startTime!) - parseTime(b.startTime!))[0];
    if (next) return { type: 'next' as const, slot: next, minsLeft: parseTime(next.startTime!) - nowMin };
    return null;
  })();

  return (
    <ScheduleDisplayContext.Provider value={displayOptions}>
    <div className="min-h-screen bg-gray-50">
      {showFreeRooms && (
        <FreeRoomsModal onClose={() => setShowFreeRooms(false)} initialDate={currentDate} />
      )}
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Розклад занять</h1>
          <div className="flex items-center gap-2">
            <ProfileDropdown profile={profile} onLogout={onLogout} onAdminPanel={onAdminPanel} onProfileRefresh={onProfileRefresh} onTeacherCabinet={onTeacherCabinet} onCabinet={onCabinet} />
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">

          {/* Group selector */}
          <select
            value={selectedGroup}
            onChange={e => { setSelectedGroup(e.target.value); setCurrentDate(todayStr()); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
          >
            {selectedGroup && !groups.find(g => g.title === selectedGroup) && (
              <option value={selectedGroup}>{selectedGroup}</option>
            )}
            {groups.map(g => (
              <option key={g.id} value={g.title}>{g.title}</option>
            ))}
          </select>

          {/* Teacher schedule link — hidden for Teacher role (they use personal cabinet) */}
          {onTeacherSchedule && profile.role !== 'Teacher' && (
            <button
              onClick={onTeacherSchedule}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Розклад викладача
            </button>
          )}

          {/* Free rooms button */}
          <button
            onClick={() => setShowFreeRooms(true)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
          >
            <DoorOpen size={15} />
            Вільні аудиторії
          </button>

          {/* Print / PDF */}
          <button
            onClick={() => window.print()}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Printer size={15} />
            Друк / PDF
          </button>

          {/* Current / next class chip */}
          {todayClassInfo && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border ${
              todayClassInfo.type === 'active'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-gray-50 text-gray-600 border-gray-300'
            }`}>
              <Clock size={12} className="shrink-0" />
              {todayClassInfo.type === 'active'
                ? `Зараз: ${todayClassInfo.slot.subjectForSite}`
                : `Наступна через ${todayClassInfo.minsLeft} хв: ${todayClassInfo.slot.subjectForSite}`}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'week' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Тиждень
            </button>
            <button
              onClick={() => setViewMode('semester')}
              className={`px-3 py-1.5 border-l border-gray-300 transition-colors ${viewMode === 'semester' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Весь семестр
            </button>
          </div>

          {/* Week navigation (only in week mode) */}
          {viewMode === 'week' && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => goWeek(-1)}
                className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-700 font-medium min-w-[160px] text-center">
                {weekLabel || '...'}
              </span>
              <button
                onClick={() => goWeek(1)}
                className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(todayStr())}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Сьогодні
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {exams.length > 0 && (
          <div className="space-y-4 mb-6 print:hidden">
            {settings.showExamCountdown && <ExamCountdownCard exams={exams} />}
            {settings.showSessionTimeline && <SessionTimeline exams={exams} />}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Завантаження...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <button onClick={loadWeek} className="text-sm text-red-700 underline hover:text-red-900">
              Спробувати знову
            </button>
          </div>
        )}

        {!loading && !error && viewMode === 'week' && week && (
          <WeekGrid week={week} cancellations={cancellations} now={now} />
        )}

        {!loading && !error && viewMode === 'semester' && semesterWeeks.length > 0 && (
          <div className="space-y-8">
            {semesterWeeks.map(w => (
              <WeekGrid key={w.weekStart} week={w} cancellations={cancellations} now={now} />
            ))}
          </div>
        )}
      </div>
    </div>
    </ScheduleDisplayContext.Provider>
  );
}
