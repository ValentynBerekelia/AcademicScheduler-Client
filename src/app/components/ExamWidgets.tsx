import { GraduationCap, Clock, MapPin, User, Hourglass, CalendarRange } from 'lucide-react';
import { ExamDto, ExamType } from '../utils/api';

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  Exam: 'Екзамен',
  Credit: 'Залік',
  Consultation: 'Консультація',
};

export const EXAM_TYPE_BADGE: Record<ExamType, string> = {
  Exam: 'bg-rose-100 text-rose-700',
  Credit: 'bg-violet-100 text-violet-700',
  Consultation: 'bg-sky-100 text-sky-700',
};

// Exams that already happened stay on the timeline this long, to show session progress
const PAST_DAYS_ON_TIMELINE = 7;

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function daysUntil(dateStr: string, today = localToday()): number {
  return dayNumber(dateStr) - dayNumber(today);
}

function formatExamDate(dateStr: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', weekday: 'short' }): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('uk-UA', opts);
}

function pluralDays(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дні';
  return 'днів';
}

function countdownText(days: number): string {
  if (days === 0) return 'сьогодні';
  if (days === 1) return 'завтра';
  return `${days} ${pluralDays(days)}`;
}

function sortExams(exams: ExamDto[]): ExamDto[] {
  return [...exams].sort((a, b) =>
    a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

/** «До екзамену з … залишилось N днів» — the nearest exam or credit (consultations are skipped). */
export function ExamCountdownCard({ exams }: { exams: ExamDto[] }) {
  const today = localToday();
  const upcoming = sortExams(exams).filter(e => e.type !== 'Consultation' && daysUntil(e.date, today) >= 0);
  const next = upcoming[0];
  if (!next) return null;

  const days = daysUntil(next.date, today);
  const typeLabel = EXAM_TYPE_LABELS[next.type].toLowerCase();
  const urgent = days <= 2;

  return (
    <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
      urgent ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-200'
    }`}>
      <div className={`shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center ${
        urgent ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
      }`}>
        {days <= 1 ? (
          <span className="text-sm font-bold uppercase text-center leading-tight px-1">{countdownText(days)}</span>
        ) : (
          <>
            <span className="text-3xl font-bold leading-none">{days}</span>
            <span className="text-xs mt-1 opacity-90">{pluralDays(days)}</span>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm text-gray-500 flex items-center gap-1.5">
          <Hourglass size={14} className="shrink-0" />
          {days === 0
            ? `Сьогодні ${typeLabel}`
            : days === 1
            ? `Завтра ${typeLabel}`
            : `До ${next.type === 'Credit' ? 'заліку' : 'екзамену'} залишилось ${countdownText(days)}`}
        </p>
        <p className="text-lg font-semibold text-gray-900 leading-snug">{next.subject}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <span className={`px-2 py-0.5 rounded-full font-medium ${EXAM_TYPE_BADGE[next.type]}`}>
            {EXAM_TYPE_LABELS[next.type]}
          </span>
          <span className="flex items-center gap-1">
            <CalendarRange size={12} /> {formatExamDate(next.date)}
          </span>
          {next.startTime && (
            <span className="flex items-center gap-1">
              <Clock size={12} /> {next.startTime}{next.endTime ? ` – ${next.endTime}` : ''}
            </span>
          )}
          {next.room && (
            <span className="flex items-center gap-1"><MapPin size={12} /> {next.room}</span>
          )}
          {next.teacherName && (
            <span className="flex items-center gap-1"><User size={12} /> {next.teacherName}</span>
          )}
        </div>
        {next.note && <p className="text-xs text-gray-500 italic">{next.note}</p>}
      </div>

      {upcoming.length > 1 && (
        <div className="shrink-0 text-sm text-gray-500 sm:text-right">
          ще <span className="font-semibold text-gray-800">{upcoming.length - 1}</span> у сесії
        </div>
      )}
    </div>
  );
}

/** All session events by day, with the number of free days to prepare between them. */
export function SessionTimeline({ exams }: { exams: ExamDto[] }) {
  const today = localToday();
  const items = sortExams(exams).filter(e => daysUntil(e.date, today) >= -PAST_DAYS_ON_TIMELINE);
  if (items.length === 0) return null;

  const remaining = items.filter(e => e.type !== 'Consultation' && daysUntil(e.date, today) >= 0).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap size={18} className="text-emerald-600" />
        <h2 className="font-semibold text-gray-900">Сесія</h2>
        <span className="text-sm text-gray-400">
          {remaining > 0 ? `залишилось ${remaining}` : 'все складено'}
        </span>
      </div>

      <ol className="flex flex-col md:flex-row md:overflow-x-auto md:pb-2 gap-0">
        {items.map((exam, i) => {
          const days = daysUntil(exam.date, today);
          const past = days < 0;
          const isToday = days === 0;
          const prev = items[i - 1];
          // Days strictly between two events = days available to prepare
          const gap = prev && prev.date !== exam.date ? dayNumber(exam.date) - dayNumber(prev.date) - 1 : null;

          return (
            <li key={exam.id} className="flex flex-col md:flex-row md:items-stretch">
              {i > 0 && (
                <div className="flex md:flex-col items-center justify-center gap-1 px-3 py-1.5 md:py-0 md:w-24 shrink-0">
                  <div className="w-px h-4 md:w-full md:h-px bg-gray-200" />
                  <span className={`text-[11px] whitespace-nowrap ${gap === 0 ? 'text-rose-500 font-medium' : 'text-gray-400'}`}>
                    {gap === null ? 'той самий день' : gap === 0 ? 'наступного дня' : `${gap} ${pluralDays(gap)} на підготовку`}
                  </span>
                  <div className="w-px h-4 md:w-full md:h-px bg-gray-200" />
                </div>
              )}
              <div className={`rounded-lg border p-3 md:w-56 shrink-0 space-y-1 ${
                isToday ? 'border-rose-300 bg-rose-50 ring-2 ring-rose-200'
                : past ? 'border-gray-100 bg-gray-50 opacity-60'
                : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700 capitalize">
                    {formatExamDate(exam.date, { day: 'numeric', month: 'short', weekday: 'short' })}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${EXAM_TYPE_BADGE[exam.type]}`}>
                    {EXAM_TYPE_LABELS[exam.type]}
                  </span>
                </div>
                <p className={`text-sm font-medium leading-snug ${past ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {exam.subject}
                </p>
                <p className="text-[11px] text-gray-500">
                  {[exam.startTime, exam.room].filter(Boolean).join(' · ') || ' '}
                </p>
                {!past && (
                  <p className={`text-[11px] font-medium ${isToday ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {isToday ? 'сьогодні' : days === 1 ? 'завтра' : `через ${days} ${pluralDays(days)}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
