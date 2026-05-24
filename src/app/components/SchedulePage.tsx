import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentWeek, getGroups, getCurrentSemester, getCancellations,
  CurrentWeekDto, WeekDayDto, ScheduleSlotDto,
  UserProfile, GroupItemDto, ClassCancellationDto,
} from '../utils/api';
import { Calendar, Clock, User, MapPin, ExternalLink, ChevronLeft, ChevronRight, Printer, DoorOpen } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';
import { NotificationBell } from './NotificationBell';
import { FreeRoomsModal } from './FreeRoomsModal';

interface SchedulePageProps {
  profile: UserProfile;
  onLogout: () => void;
  onUnauthorized: () => void;
  onAdminPanel?: () => void;
  onProfileRefresh?: () => void;
  onTeacherSchedule?: () => void;
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


const LESSON_TYPE_BADGE: Record<string, string> = {
  'Лекція':      'bg-emerald-100 text-emerald-700',
  'LECTURE':     'bg-emerald-100 text-emerald-700',
  'Практика':    'bg-blue-100 text-blue-700',
  'PRACTICE':    'bg-blue-100 text-blue-700',
  'Лабораторна': 'bg-red-100 text-red-700',
  'LABORATORY':  'bg-red-100 text-red-700',
  'Лаб':         'bg-red-100 text-red-700',
  'LAB':         'bg-red-100 text-red-700',
  'Семінар':     'bg-orange-100 text-orange-700',
  'SEMINAR':     'bg-orange-100 text-orange-700',
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

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

function SlotCard({ slot, isReplacement, isCancelled, isActive }: {
  slot: ScheduleSlotDto;
  isReplacement: boolean;
  isCancelled?: boolean;
  isActive?: boolean;
}) {
  const lessonType = slot.lessonType ?? '';

  if (isCancelled) {
    const timeLabel = slot.startTime && slot.endTime
      ? `${slot.startTime} – ${slot.endTime}`
      : slot.className ? `Пара ${slot.className}` : null;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 h-[130px] flex flex-col items-center justify-center gap-1 text-center px-3">
        <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Скасовано</span>
        {timeLabel && <span className="text-xs text-red-400">{timeLabel}</span>}
        <span className="text-xs text-red-400 leading-snug opacity-80">{slot.subjectForSite}</span>
      </div>
    );
  }

  const cardClass = isActive
    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-sm'
    : isReplacement ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200 text-gray-800';
  const badgeClass = isReplacement
    ? 'bg-amber-100 text-amber-700'
    : (LESSON_TYPE_BADGE[lessonType] ?? 'bg-gray-100 text-gray-600');

  const timeLabel = slot.startTime && slot.endTime
    ? `${slot.startTime} – ${slot.endTime}`
    : slot.className
    ? `Пара ${slot.className}`
    : null;

  return (
    <div className={`rounded-lg border p-3 space-y-1.5 h-[130px] overflow-hidden ${cardClass}`}>
      {isActive && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Зараз
        </div>
      )}
      {timeLabel && (
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Clock size={11} className="shrink-0" />
          <span>{timeLabel}</span>
          {slot.className && slot.startTime && (
            <span className="ml-auto opacity-60">#{slot.className}</span>
          )}
        </div>
      )}
      <p className="text-sm font-semibold leading-snug">{slot.subjectForSite || '—'}</p>
      {lessonType && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
          {lessonType}
        </span>
      )}
      {slot.teacherFullName && (
        <div className="flex items-center gap-1 text-xs opacity-75">
          <User size={11} className="shrink-0" />
          <span>{slot.teacherFullName}</span>
        </div>
      )}
      {slot.roomName && (
        <div className="flex items-center gap-1 text-xs opacity-75">
          <MapPin size={11} className="shrink-0" />
          <span>Ауд. {slot.roomName}</span>
        </div>
      )}
      {slot.linkToMeeting && (
        <a
          href={slot.linkToMeeting}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink size={11} className="shrink-0" />
          Приєднатись онлайн
        </a>
      )}
    </div>
  );
}

function DayColumn({ day, allClassNames, cancelledClassIds, isToday, nowMin }: {
  day: WeekDayDto;
  allClassNames: string[];
  cancelledClassIds: Set<number>;
  isToday: boolean;
  nowMin: number;
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
          </p>
        )}
      </div>
      <div className="p-2 space-y-2">
        {allClassNames.map(cn => {
          const slot = slotByClass.get(cn);
          if (!slot) return <div key={cn} className="h-[130px]" />;
          const isCancelled = cancelledClassIds.has(slot.semesterClassId);
          const isActive = isToday && !!slot.startTime && !!slot.endTime
            && nowMin >= parseTime(slot.startTime) && nowMin <= parseTime(slot.endTime);
          return <SlotCard key={slot.id} slot={slot} isReplacement={day.isReplacement} isCancelled={isCancelled} isActive={isActive} />;
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

  const cancelledByDate = new Map<string, Set<number>>();
  for (const c of (cancellations ?? [])) {
    if (!cancelledByDate.has(c.date)) cancelledByDate.set(c.date, new Set());
    cancelledByDate.get(c.date)!.add(c.semesterClassId);
  }

  const todayDateStr = now.toISOString().slice(0, 10);
  const nowMin = now.getHours() * 60 + now.getMinutes();

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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex">
          {week.days.map(day => (
            <DayColumn
              key={day.date}
              day={day}
              allClassNames={allClassNames}
              cancelledClassIds={cancelledByDate.get(day.date) ?? new Set()}
              isToday={day.date === todayDateStr}
              nowMin={nowMin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const STORAGE_GROUP_KEY = 'schedule_selected_group';
const STORAGE_VIEW_KEY = 'schedule_view_mode';

export function SchedulePage({ profile, onLogout, onUnauthorized, onAdminPanel, onProfileRefresh, onTeacherSchedule }: SchedulePageProps) {
  const now = useNow();
  const [groups, setGroups] = useState<GroupItemDto[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(
    () => localStorage.getItem(STORAGE_GROUP_KEY) ?? profile.group ?? ''
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(STORAGE_VIEW_KEY) as ViewMode) ?? 'week'
  );
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

  // persist view mode
  useEffect(() => {
    localStorage.setItem(STORAGE_VIEW_KEY, viewMode);
  }, [viewMode]);

  const loadWeek = useCallback(async () => {
    if (!selectedGroup) return;
    setLoading(true);
    setError('');
    try {
      const sem = await getCurrentSemester();
      if (viewMode === 'week') {
        const data = await getCurrentWeek(selectedGroup, currentDate);
        setWeek(data);
        // Fetch cancellations for this week's date range
        if (data.days.length > 0) {
          const groupId = data.days.flatMap(d => d.slots).find(s => s.groupId)?.groupId;
          if (groupId) {
            getCancellations(sem.id, groupId, data.weekStart, data.weekEnd)
              .then(setCancellations).catch(() => {});
          }
        }
      } else {
        if (!sem.startDay || !sem.endDay) throw new Error('Дати семестру не встановлені');
        const mondays = getAllWeekMondays(sem.startDay, sem.endDay);
        const weeks = await Promise.all(mondays.map(d => getCurrentWeek(selectedGroup, d)));
        setSemesterWeeks(weeks);
        // Fetch all cancellations for the semester
        const firstGroupId = weeks.flatMap(w => w.days).flatMap(d => d.slots).find(s => s.groupId)?.groupId;
        if (firstGroupId) {
          getCancellations(sem.id, firstGroupId, sem.startDay, sem.endDay)
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
    if (!week || viewMode !== 'week') return null;
    const todayDateStr = now.toISOString().slice(0, 10);
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
    <div className="min-h-screen bg-gray-50">
      {showFreeRooms && (
        <FreeRoomsModal onClose={() => setShowFreeRooms(false)} initialDate={currentDate} />
      )}
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Розклад занять</h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown profile={profile} onLogout={onLogout} onAdminPanel={onAdminPanel} onProfileRefresh={onProfileRefresh} />
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

          {/* Teacher schedule link */}
          {onTeacherSchedule && (
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
  );
}
