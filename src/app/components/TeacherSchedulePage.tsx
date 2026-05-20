import { useState, useEffect } from 'react';
import {
  getTeachers, getTeacherSchedule,
  TeacherItemDto, TeacherWeekDto,
  ScheduleSlotDto,
} from '../utils/api';
import { Clock, MapPin, Users, ExternalLink, User } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';
import { NotificationBell } from './NotificationBell';
import { UserProfile } from '../utils/api';

interface TeacherSchedulePageProps {
  profile: UserProfile;
  onLogout: () => void;
  onUnauthorized: () => void;
  onAdminPanel?: () => void;
  onProfileRefresh?: () => void;
  onBack?: () => void;
}

const DAY_NAMES: Record<string, string> = {
  MONDAY: 'Понеділок',
  TUESDAY: 'Вівторок',
  WEDNESDAY: 'Середа',
  THURSDAY: 'Четвер',
  FRIDAY: 'П\'ятниця',
  SATURDAY: 'Субота',
};

const CURRENT_DAY = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

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

function SlotCard({ slot }: { slot: ScheduleSlotDto }) {
  const lessonType = slot.lessonType ?? '';
  const badgeClass = LESSON_TYPE_BADGE[lessonType] ?? 'bg-gray-100 text-gray-600';

  const timeLabel = slot.startTime && slot.endTime
    ? `${slot.startTime} – ${slot.endTime}`
    : slot.className ? `Пара ${slot.className}` : null;

  return (
    <div className="rounded-lg border p-3 space-y-1.5 h-[130px] overflow-hidden bg-white border-gray-200 text-gray-800">
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
      {slot.roomName && (
        <div className="flex items-center gap-1 text-xs opacity-75">
          <MapPin size={11} className="shrink-0" />
          <span>Ауд. {slot.roomName}</span>
        </div>
      )}
      {/* For teacher view show group instead of teacher */}
      <div className="flex items-center gap-1 text-xs opacity-75">
        <Users size={11} className="shrink-0" />
        <span>Група {slot.groupId}</span>
      </div>
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

const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function WeekGrid({ week, isCurrentWeek }: { week: TeacherWeekDto; isCurrentWeek: boolean }) {
  const allClassNames = [
    ...new Set(week.days.flatMap(d => d.slots.map(s => s.className ?? String(s.semesterClassId)))),
  ].sort((a, b) => Number(a) - Number(b));

  const dayMap = new Map(week.days.map(d => [d.dayName, d]));

  const weekLabel = week.weekType === 'Odd' ? 'Непарний тиждень' : 'Парний тиждень';
  const weekColor = week.weekType === 'Odd'
    ? 'bg-indigo-100 text-indigo-700'
    : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="space-y-2">
      <div className={`bg-white rounded-xl border px-5 py-3 flex items-center gap-3 ${isCurrentWeek ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200'}`}>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${weekColor}`}>
          {weekLabel}
        </span>
        {isCurrentWeek && (
          <span className="text-xs text-emerald-600 font-medium">← поточний</span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex">
          {ALL_DAYS.map(dayName => {
            const day = dayMap.get(dayName);
            const isToday = isCurrentWeek && dayName === CURRENT_DAY;
            const slotByClass = day
              ? new Map(day.slots.map(s => [s.className ?? String(s.semesterClassId), s]))
              : new Map();

            return (
              <div
                key={dayName}
                className={`flex-1 min-w-0 border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-emerald-50/60' : ''}`}
              >
                <div className={`px-3 py-3 border-b border-gray-200 text-center ${isToday ? 'bg-emerald-100' : 'bg-gray-50'}`}>
                  <p className={`font-semibold text-sm ${isToday ? 'text-emerald-700' : 'text-gray-900'}`}>
                    {DAY_NAMES[dayName] ?? dayName}
                  </p>
                  {isToday && <p className="text-xs text-emerald-500 font-medium">сьогодні</p>}
                </div>
                <div className="p-2 space-y-2">
                  {allClassNames.map(cn => {
                    const slot = slotByClass.get(cn);
                    return slot
                      ? <SlotCard key={slot.id} slot={slot} />
                      : <div key={cn} className="h-[130px]" />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const STORAGE_TEACHER_KEY = 'schedule_selected_teacher';

export function TeacherSchedulePage({ profile, onLogout, onUnauthorized, onAdminPanel, onProfileRefresh, onBack }: TeacherSchedulePageProps) {
  const [teachers, setTeachers] = useState<TeacherItemDto[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    () => localStorage.getItem(STORAGE_TEACHER_KEY) ?? ''
  );
  const [oddWeek, setOddWeek] = useState<TeacherWeekDto | null>(null);
  const [evenWeek, setEvenWeek] = useState<TeacherWeekDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Current week type from server — we'll derive it from the schedule page context
  // For now determine from the current date heuristic or just highlight both
  const [currentWeekType, setCurrentWeekType] = useState<'Odd' | 'Even' | null>(null);

  useEffect(() => {
    getTeachers()
      .then(setTeachers)
      .catch(e => {
        if (e.message === 'UNAUTHORIZED') onUnauthorized();
      });
  }, []);

  useEffect(() => {
    if (selectedTeacher) localStorage.setItem(STORAGE_TEACHER_KEY, selectedTeacher);
  }, [selectedTeacher]);

  useEffect(() => {
    if (!selectedTeacher) return;
    setLoading(true);
    setError('');
    setOddWeek(null);
    setEvenWeek(null);

    Promise.all([
      getTeacherSchedule(selectedTeacher, 1), // 1 = Odd
      getTeacherSchedule(selectedTeacher, 0), // 0 = Even
    ])
      .then(([odd, even]) => {
        setOddWeek(odd);
        setEvenWeek(even);
        setCurrentWeekType(odd.weekType === 'Odd' ? 'Odd' : 'Even');
      })
      .catch(e => {
        if (e.message === 'UNAUTHORIZED') onUnauthorized();
        else setError(e.message || 'Помилка завантаження розкладу');
      })
      .finally(() => setLoading(false));
  }, [selectedTeacher]);

  // Determine current week type from a quick fetch
  useEffect(() => {
    fetch('/api/schedule/current-week', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.weekType) setCurrentWeekType(data.weekType); })
      .catch(() => {});
  }, []);

  const teacherFullName = (t: TeacherItemDto) =>
    `${t.surname} ${t.name} ${t.patronymic}`.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                ← Розклад
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900">Розклад викладача</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown
              profile={profile}
              onLogout={onLogout}
              onAdminPanel={onAdminPanel}
              onProfileRefresh={onProfileRefresh}
            />
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <User size={16} className="text-gray-400 shrink-0" />
          <select
            value={selectedTeacher}
            onChange={e => setSelectedTeacher(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white min-w-[260px]"
          >
            <option value="">— Оберіть викладача —</option>
            {teachers.map(t => {
              const name = teacherFullName(t);
              return <option key={t.teacherId.value} value={name}>{name}</option>;
            })}
          </select>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {!selectedTeacher && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Оберіть викладача щоб переглянути розклад
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Завантаження...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
        )}

        {!loading && !error && oddWeek && (
          <WeekGrid week={oddWeek} isCurrentWeek={currentWeekType === 'Odd'} />
        )}

        {!loading && !error && evenWeek && (
          <WeekGrid week={evenWeek} isCurrentWeek={currentWeekType === 'Even'} />
        )}
      </div>
    </div>
  );
}
