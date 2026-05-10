import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentWeek, getGroups, getCurrentSemester,
  CurrentWeekDto, WeekDayDto, ScheduleSlotDto,
  UserProfile, GroupItemDto,
} from '../utils/api';
import { Calendar, Clock, User, MapPin, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';

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

function SlotCard({ slot, isReplacement }: { slot: ScheduleSlotDto; isReplacement: boolean }) {
  const lessonType = slot.lessonType ?? '';
  const cardClass = isReplacement
    ? 'bg-amber-50 border-amber-200'
    : 'bg-white border-gray-200 text-gray-800';
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

function DayColumn({ day, allClassNames }: { day: WeekDayDto; allClassNames: string[] }) {
  const dayLabel = DAY_NAMES[day.dayName] ?? day.dayName;
  const slotByClass = new Map(day.slots.map(s => [s.className ?? String(s.semesterClassId), s]));

  return (
    <div className={`flex-1 min-w-0 border-r border-gray-200 last:border-r-0 ${day.isReplacement ? 'bg-amber-50/40' : ''}`}>
      <div className={`px-3 py-3 border-b border-gray-200 text-center ${day.isReplacement ? 'bg-amber-100' : 'bg-gray-50'}`}>
        <p className="font-semibold text-gray-900 text-sm">{dayLabel}</p>
        <p className="text-xs text-gray-500">{formatDate(day.date)}</p>
        {day.isReplacement && day.replacesDay && (
          <p className="text-xs text-amber-700 mt-1 font-medium">
            відробіток за {DAY_NAMES[day.replacesDay] ?? day.replacesDay}
          </p>
        )}
      </div>
      <div className="p-2 space-y-2">
        {allClassNames.map(cn => {
          const slot = slotByClass.get(cn);
          return slot
            ? <SlotCard key={slot.id} slot={slot} isReplacement={day.isReplacement} />
            : <div key={cn} className="h-[130px]" />;
        })}
      </div>
    </div>
  );
}

function WeekGrid({ week, label }: { week: CurrentWeekDto; label?: string }) {
  const allClassNames = [
    ...new Set(week.days.flatMap(d => d.slots.map(s => s.className ?? String(s.semesterClassId)))),
  ].sort((a, b) => Number(a) - Number(b));

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
            <DayColumn key={day.date} day={day} allClassNames={allClassNames} />
          ))}
        </div>
      </div>
    </div>
  );
}

const STORAGE_GROUP_KEY = 'schedule_selected_group';
const STORAGE_VIEW_KEY = 'schedule_view_mode';

export function SchedulePage({ profile, onLogout, onUnauthorized, onAdminPanel, onProfileRefresh, onTeacherSchedule }: SchedulePageProps) {
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
      if (viewMode === 'week') {
        const data = await getCurrentWeek(selectedGroup, currentDate);
        setWeek(data);
      } else {
        const sem = await getCurrentSemester();
        if (!sem.startDay || !sem.endDay) throw new Error('Дати семестру не встановлені');
        const mondays = getAllWeekMondays(sem.startDay, sem.endDay);
        const weeks = await Promise.all(mondays.map(d => getCurrentWeek(selectedGroup, d)));
        setSemesterWeeks(weeks);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Розклад занять</h1>
          <ProfileDropdown profile={profile} onLogout={onLogout} onAdminPanel={onAdminPanel} onProfileRefresh={onProfileRefresh} />
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
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
          <WeekGrid week={week} />
        )}

        {!loading && !error && viewMode === 'semester' && semesterWeeks.length > 0 && (
          <div className="space-y-8">
            {semesterWeeks.map(w => (
              <WeekGrid key={w.weekStart} week={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
