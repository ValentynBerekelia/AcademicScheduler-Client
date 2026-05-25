import { useState, useEffect } from 'react';
import {
  getTeachers, getTeacherSchedule, getTeacherWorkload,
  getCancellationsByTeacher, createCancellation, deleteCancellation, getCurrentSemester,
  TeacherItemDto, TeacherWeekDto, TeacherWorkloadDto,
  ScheduleSlotDto, UserProfile, ClassCancellationDto,
} from '../utils/api';
import { Clock, MapPin, Users, ExternalLink, User, BookOpen, BarChart2, XCircle, Wifi, Plus, Trash2, X } from 'lucide-react';
import { ProfileDropdown } from './ProfileDropdown';

interface TeacherSchedulePageProps {
  profile: UserProfile;
  onLogout: () => void;
  onUnauthorized: () => void;
  onAdminPanel?: () => void;
  onProfileRefresh?: () => void;
  onBack?: () => void;
  personalMode?: boolean;
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

function SlotCard({ slot, isCancelled, onlineMeetingLink }: {
  slot: ScheduleSlotDto;
  isCancelled?: boolean;
  onlineMeetingLink?: string | null;
}) {
  const lessonType = slot.lessonType ?? '';
  const badgeClass = LESSON_TYPE_BADGE[lessonType] ?? 'bg-gray-100 text-gray-600';

  const timeLabel = slot.startTime && slot.endTime
    ? `${slot.startTime} – ${slot.endTime}`
    : slot.className ? `Пара ${slot.className}` : null;

  if (isCancelled && !onlineMeetingLink) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 h-[155px] flex flex-col items-center justify-center gap-1 text-center px-3">
        <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Скасовано</span>
        {timeLabel && <span className="text-xs text-red-400">{timeLabel}</span>}
        <span className="text-xs text-red-400 leading-snug opacity-80">{slot.subjectForSite}</span>
        <div className="flex items-center gap-1 text-xs opacity-75 text-red-400">
          <Users size={11} className="shrink-0" />
          <span>{slot.groupTitle ?? `Група ${slot.groupId}`}</span>
        </div>
      </div>
    );
  }

  const effectiveLink = onlineMeetingLink ?? slot.linkToMeeting;
  const cardClass = onlineMeetingLink
    ? 'bg-blue-50 border-blue-200 text-gray-800'
    : 'bg-white border-gray-200 text-gray-800';

  return (
    <div className={`rounded-lg border p-3 space-y-1.5 h-[155px] overflow-hidden ${cardClass}`}>
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
      <div className="flex items-center gap-1 text-xs opacity-75">
        <Users size={11} className="shrink-0" />
        <span>{slot.groupTitle ?? `Група ${slot.groupId}`}</span>
      </div>
      {effectiveLink && (
        <a
          href={effectiveLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:opacity-80 ${
            onlineMeetingLink ? 'bg-blue-100 text-blue-700' : 'text-blue-600'
          }`}
        >
          <ExternalLink size={10} className="shrink-0" />
          {onlineMeetingLink ? 'Онлайн' : 'Приєднатись онлайн'}
        </a>
      )}
    </div>
  );
}

const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function WeekGrid({ week, isCurrentWeek, cancellations }: {
  week: TeacherWeekDto;
  isCurrentWeek: boolean;
  cancellations?: ClassCancellationDto[];
}) {
  const allClassNames = [
    ...new Set(week.days.flatMap(d => d.slots.map(s => s.className ?? String(s.semesterClassId)))),
  ].sort((a, b) => Number(a) - Number(b));

  const dayMap = new Map(week.days.map(d => [d.dayName, d]));

  // date -> semesterClassId -> meetingLink (null = cancelled, string = online)
  const cancelledByDate = new Map<string, Map<number, string | null>>();
  for (const c of (cancellations ?? [])) {
    if (!cancelledByDate.has(c.date)) cancelledByDate.set(c.date, new Map());
    cancelledByDate.get(c.date)!.set(c.semesterClassId, c.meetingLink ?? null);
  }

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
                    if (!slot) return <div key={cn} className="h-[155px]" />;
                    const cancMap = day ? cancelledByDate.get(day.date) : undefined;
                    const cancellation = cancMap?.has(slot.semesterClassId) ? cancMap.get(slot.semesterClassId) : undefined;
                    const isCancelled = cancellation !== undefined;
                    const onlineMeetingLink = cancellation != null ? cancellation : undefined;
                    return <SlotCard key={slot.id} slot={slot} isCancelled={isCancelled} onlineMeetingLink={onlineMeetingLink} />;
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

function WorkloadPanel({ teacherName }: { teacherName: string }) {
  const [data, setData] = useState<TeacherWorkloadDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherWorkload(teacherName)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teacherName]);

  if (loading) return null;
  if (!data) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={18} className="text-indigo-500" />
        <h2 className="font-semibold text-gray-900">Навантаження</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Непарний тиждень', value: data.oddWeekSlots, unit: 'пар' },
          { label: 'Парний тиждень', value: data.evenWeekSlots, unit: 'пар' },
          { label: 'За 2 тижні', value: data.totalPerCycle, unit: 'пар' },
          { label: 'Груп', value: data.groupCount, unit: '' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="bg-gray-50 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}{unit ? ` (${unit})` : ''}</p>
          </div>
        ))}
      </div>
      {data.subjects.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <BookOpen size={12} /> Предмети ({data.subjectCount})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.subjects.map(s => (
              <span key={s} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Slot option for the add-cancellation form ─────────────────────────────────
interface SlotOption {
  groupId: number;
  groupTitle: string;
  semesterClassId: number;
  className: string;
  subject: string;
  startTime: string | null;
  dayName: string;
}

function buildSlotOptions(weeks: (TeacherWeekDto | null)[]): SlotOption[] {
  const seen = new Set<string>();
  const opts: SlotOption[] = [];
  for (const week of weeks) {
    if (!week) continue;
    for (const day of week.days) {
      for (const slot of day.slots) {
        const key = `${slot.groupId}-${slot.semesterClassId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        opts.push({
          groupId: slot.groupId,
          groupTitle: slot.groupTitle ?? `Група ${slot.groupId}`,
          semesterClassId: slot.semesterClassId,
          className: slot.className ?? String(slot.semesterClassId),
          subject: slot.subjectForSite,
          startTime: slot.startTime,
          dayName: DAY_NAMES[day.dayName] ?? day.dayName,
        });
      }
    }
  }
  return opts.sort((a, b) => a.groupTitle.localeCompare(b.groupTitle) || Number(a.className) - Number(b.className));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface AddCancellationModalProps {
  semesterId: number;
  slots: SlotOption[];
  onSave: (c: ClassCancellationDto) => void;
  onClose: () => void;
}

function AddCancellationModal({ semesterId, slots, onSave, onClose }: AddCancellationModalProps) {
  const [selectedKey, setSelectedKey] = useState('');
  const [date, setDate] = useState(todayStr());
  const [isOnline, setIsOnline] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedSlot = slots.find(s => `${s.groupId}-${s.semesterClassId}` === selectedKey) ?? null;

  const handleSubmit = async () => {
    if (!selectedSlot || !date) return;
    setSaving(true);
    setError('');
    try {
      const result = await createCancellation({
        semesterId,
        groupId: selectedSlot.groupId,
        date,
        semesterClassId: selectedSlot.semesterClassId,
        reason: reason || undefined,
        meetingLink: isOnline && meetingLink ? meetingLink : undefined,
      });
      onSave({
        id: result.id,
        semesterId,
        groupId: selectedSlot.groupId,
        date,
        semesterClassId: selectedSlot.semesterClassId,
        reason: reason || null,
        meetingLink: isOnline && meetingLink ? meetingLink : null,
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Скасування / онлайн</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Slot selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Пара</label>
            <select
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">— Оберіть пару —</option>
              {slots.map(s => (
                <option key={`${s.groupId}-${s.semesterClassId}`} value={`${s.groupId}-${s.semesterClassId}`}>
                  {s.groupTitle} · {s.dayName} · пара {s.className}{s.startTime ? ` (${s.startTime})` : ''} · {s.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Дата</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsOnline(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${!isOnline ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <XCircle size={15} /> Скасувати
            </button>
            <button
              onClick={() => setIsOnline(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${isOnline ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <Wifi size={15} /> Онлайн
            </button>
          </div>

          {isOnline ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Посилання на зустріч</label>
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Причина (необов'язково)</label>
              <input
                type="text"
                placeholder="Хвороба, конференція..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 pb-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Скасувати
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedSlot || !date || (isOnline && !meetingLink)}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Збереження...' : 'Підтвердити'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CancellationsPanelProps {
  semesterId: number;
  teacherName: string;
  weeks: (TeacherWeekDto | null)[];
  onChanged?: () => void;
}

function CancellationsPanel({ semesterId, teacherName, weeks, onChanged }: CancellationsPanelProps) {
  const [items, setItems] = useState<ClassCancellationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const slotOptions = buildSlotOptions(weeks);

  // Build lookup: semesterClassId -> slot info
  const slotLookup = new Map(slotOptions.map(s => [`${s.groupId}-${s.semesterClassId}`, s]));

  useEffect(() => {
    setLoading(true);
    getCancellationsByTeacher(semesterId, teacherName)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [semesterId, teacherName]);

  const handleDelete = async (id: string) => {
    try {
      await deleteCancellation(id);
      setItems(prev => prev.filter(c => c.id !== id));
      onChanged?.();
    } catch {}
  };

  const upcoming = items.filter(c => c.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date));
  const past = items.filter(c => c.date < todayStr()).sort((a, b) => b.date.localeCompare(a.date));

  const renderRow = (c: ClassCancellationDto) => {
    const slotInfo = slotLookup.get(`${c.groupId}-${c.semesterClassId}`);
    const dateLabel = new Date(c.date + 'T00:00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', weekday: 'short' });

    return (
      <div key={c.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 ${c.date < todayStr() ? 'opacity-50' : ''}`}>
        <div className="mt-0.5">
          {c.meetingLink
            ? <Wifi size={15} className="text-blue-500" />
            : <XCircle size={15} className="text-red-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {slotInfo?.subject ?? `Пара ${c.semesterClassId}`}
          </p>
          <p className="text-xs text-gray-500">
            {slotInfo?.groupTitle ?? `Група ${c.groupId}`} · {dateLabel}
            {slotInfo?.startTime ? ` · ${slotInfo.startTime}` : ''}
          </p>
          {c.meetingLink && (
            <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
              {c.meetingLink}
            </a>
          )}
          {c.reason && <p className="text-xs text-gray-400 italic">{c.reason}</p>}
        </div>
        {c.date >= todayStr() && (
          <button
            onClick={() => handleDelete(c.id)}
            className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
            title="Видалити"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-400" />
            <h2 className="font-semibold text-gray-900">Скасування та онлайн-пари</h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={slotOptions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Plus size={14} /> Додати
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-6 text-center text-gray-400 text-sm">Завантаження...</div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-400 text-sm">Немає скасувань</div>
        ) : (
          <div>
            {upcoming.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Майбутні</p>
                {upcoming.map(renderRow)}
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">Минулі</p>
                {past.slice(0, 5).map(renderRow)}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <AddCancellationModal
          semesterId={semesterId}
          slots={slotOptions}
          onSave={c => { setItems(prev => [...prev, c]); onChanged?.(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

const STORAGE_TEACHER_KEY = 'schedule_selected_teacher';

export function TeacherSchedulePage({ profile, onLogout, onUnauthorized, onAdminPanel, onProfileRefresh, onBack, personalMode }: TeacherSchedulePageProps) {
  const isPersonal = personalMode === true ? !!profile.teacherName : false;
  const [teachers, setTeachers] = useState<TeacherItemDto[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    () => (personalMode && profile.teacherName) ? profile.teacherName : (localStorage.getItem(STORAGE_TEACHER_KEY) ?? '')
  );
  const [oddWeek, setOddWeek] = useState<TeacherWeekDto | null>(null);
  const [evenWeek, setEvenWeek] = useState<TeacherWeekDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentWeekType, setCurrentWeekType] = useState<'Odd' | 'Even' | null>(null);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [cancellations, setCancellations] = useState<ClassCancellationDto[]>([]);

  useEffect(() => {
    getCurrentSemester()
      .then(s => setSemesterId(s.id))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (semesterId && selectedTeacher) {
      getCancellationsByTeacher(semesterId, selectedTeacher)
        .then(setCancellations)
        .catch(() => {});
    }
  }, [semesterId, selectedTeacher]);

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
      getTeacherSchedule(selectedTeacher, 1),
      getTeacherSchedule(selectedTeacher, 0),
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

    if (semesterId) {
      getCancellationsByTeacher(semesterId, selectedTeacher)
        .then(setCancellations)
        .catch(() => {});
    }
  }, [selectedTeacher]);

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
            <h1 className="text-xl font-bold text-gray-900">
              {isPersonal ? 'Мій кабінет' : 'Розклад викладача'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ProfileDropdown
              profile={profile}
              onLogout={onLogout}
              onAdminPanel={onAdminPanel}
              onProfileRefresh={onProfileRefresh}
            />
          </div>
        </div>
      </header>

      {/* Teacher selector — hidden for personal cabinet */}
      {!isPersonal && (
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
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {!selectedTeacher && !isPersonal && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Оберіть викладача щоб переглянути розклад
          </div>
        )}

        {selectedTeacher && (
          <WorkloadPanel teacherName={selectedTeacher} />
        )}

        {/* Cancellations panel — only in personal cabinet */}
        {isPersonal && selectedTeacher && semesterId && !loading && (
          <CancellationsPanel
            semesterId={semesterId}
            teacherName={selectedTeacher}
            weeks={[oddWeek, evenWeek]}
            onChanged={() => {
              getCancellationsByTeacher(semesterId, selectedTeacher)
                .then(setCancellations)
                .catch(() => {});
            }}
          />
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
          <WeekGrid week={oddWeek} isCurrentWeek={currentWeekType === 'Odd'} cancellations={cancellations} />
        )}

        {!loading && !error && evenWeek && (
          <WeekGrid week={evenWeek} isCurrentWeek={currentWeekType === 'Even'} cancellations={cancellations} />
        )}
      </div>
    </div>
  );
}
