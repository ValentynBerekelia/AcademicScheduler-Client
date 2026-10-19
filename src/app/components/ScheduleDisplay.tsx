import { createContext, useContext, useEffect } from 'react';
import { Clock, User, MapPin, ExternalLink } from 'lucide-react';
import { ScheduleSlotDto, UserSettingsDto } from '../utils/api';

/** How lesson cards look — from the personal cabinet's «Текст у розкладі». */
export interface ScheduleDisplayOptions {
  textSize: UserSettingsDto['scheduleTextSize'];
  showTeacher: boolean;
  showRoom: boolean;
  showLessonType: boolean;
  shortTeacherNames: boolean;
  translateLessonTypes: boolean;
  font: UserSettingsDto['scheduleFont'];
  subjectWeight: UserSettingsDto['subjectWeight'];
  // official subject title -> the user's own name for it
  aliases: Map<string, string>;
}

export function displayOptionsFrom(settings: UserSettingsDto, aliases: Map<string, string>): ScheduleDisplayOptions {
  return {
    textSize: settings.scheduleTextSize,
    showTeacher: settings.showTeacher,
    showRoom: settings.showRoom,
    showLessonType: settings.showLessonType,
    shortTeacherNames: settings.shortTeacherNames,
    translateLessonTypes: settings.translateLessonTypes,
    font: settings.scheduleFont,
    subjectWeight: settings.subjectWeight,
    aliases,
  };
}

const DEFAULT_OPTIONS: ScheduleDisplayOptions = {
  textSize: 'md',
  showTeacher: true,
  showRoom: true,
  showLessonType: true,
  shortTeacherNames: false,
  translateLessonTypes: true,
  font: 'default',
  subjectWeight: 'semibold',
  aliases: new Map(),
};

export const ScheduleDisplayContext = createContext<ScheduleDisplayOptions>(DEFAULT_OPTIONS);
export const useScheduleDisplay = () => useContext(ScheduleDisplayContext);

// All stacks cover Cyrillic; "rounded" is a web font loaded on first use
export const FONT_STACKS: Record<ScheduleDisplayOptions['font'], string | undefined> = {
  default: undefined,
  serif: "Georgia, 'Times New Roman', serif",
  rounded: "'Nunito', ui-rounded, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace",
};

const WEB_FONTS: Partial<Record<ScheduleDisplayOptions['font'], string>> = {
  rounded: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;800&display=swap',
};

/** Adds the stylesheet of a web font once, the first time a card needs it. */
export function useWebFont(font: ScheduleDisplayOptions['font']) {
  useEffect(() => {
    const href = WEB_FONTS[font];
    if (!href || document.querySelector(`link[data-web-font="${font}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.webFont = font;
    document.head.appendChild(link);
  }, [font]);
}

const SUBJECT_WEIGHT_CLASS: Record<ScheduleDisplayOptions['subjectWeight'], string> = {
  normal: 'font-normal',
  semibold: 'font-semibold',
  bold: 'font-extrabold',
};

export const TEXT_SIZES = {
  sm: { subject: 'text-xs', meta: 'text-[11px]', icon: 10 },
  md: { subject: 'text-sm', meta: 'text-xs', icon: 11 },
  lg: { subject: 'text-base', meta: 'text-sm', icon: 13 },
} as const;

// Line heights (px) of the card rows for each text size
const ROW_PX = {
  sm: { meta: 16, subject: 16, badge: 18 },
  md: { meta: 16, subject: 19, badge: 20 },
  lg: { meta: 20, subject: 22, badge: 24 },
} as const;

/**
 * Week-grid cards share one fixed height so rows line up across days. It is computed from what
 * the card shows: time, up to two lines of subject, then the optional rows. Fewer details give
 * a more compact grid.
 */
export function cardHeight(options: ScheduleDisplayOptions, withLinkRow: boolean): number {
  const px = ROW_PX[options.textSize];
  const rows: number[] = [px.meta, px.subject * 2];
  if (options.showLessonType) rows.push(px.badge);
  if (options.showTeacher) rows.push(px.meta);
  if (options.showRoom) rows.push(px.meta);
  if (withLinkRow) rows.push(px.badge);
  const gaps = (rows.length - 1) * 6;  // space-y-1.5
  return 26 + gaps + rows.reduce((a, b) => a + b, 0);  // + padding and border
}

const LESSON_TYPE_UK: Record<string, string> = {
  LECTURE: 'Лекція',
  PRACTICAL: 'Практична',
  PRACTICE: 'Практична',
  LABORATORY: 'Лабораторна',
  LAB: 'Лабораторна',
  SEMINAR: 'Семінар',
  CREDIT: 'Залік',
  EXAM: 'Екзамен',
  CONSULTATION: 'Консультація',
};

// Keys are the API values; Ukrainian labels are looked up through LESSON_TYPE_UK
const LESSON_TYPE_BADGE: Record<string, string> = {
  LECTURE: 'bg-emerald-100 text-emerald-700',
  PRACTICAL: 'bg-blue-100 text-blue-700',
  PRACTICE: 'bg-blue-100 text-blue-700',
  LABORATORY: 'bg-red-100 text-red-700',
  LAB: 'bg-red-100 text-red-700',
  SEMINAR: 'bg-orange-100 text-orange-700',
  CREDIT: 'bg-violet-100 text-violet-700',
  EXAM: 'bg-rose-100 text-rose-700',
  CONSULTATION: 'bg-sky-100 text-sky-700',
};

export function lessonTypeLabel(type: string, translate: boolean): string {
  return translate ? LESSON_TYPE_UK[type.toUpperCase()] ?? type : type;
}

/** «Бортник Світлана Борисівна» -> «Бортник С. Б.» */
export function shortTeacherName(fullName: string): string {
  const [surname, ...rest] = fullName.trim().split(/\s+/);
  if (!surname || rest.length === 0) return fullName;
  return `${surname} ${rest.map(p => `${p[0]}.`).join(' ')}`;
}

export function subjectLabel(subject: string | null | undefined, aliases: Map<string, string>): string {
  if (!subject) return '—';
  return aliases.get(subject) ?? subject;
}

export function SlotCard({ slot, isReplacement, isCancelled, onlineMeetingLink, isActive, height }: {
  slot: ScheduleSlotDto;
  isReplacement: boolean;
  isCancelled?: boolean;
  onlineMeetingLink?: string | null;
  isActive?: boolean;
  // Fixed height in the week grid (see cardHeight); omitted on phones, where it follows content
  height?: number;
}) {
  const options = useScheduleDisplay();
  useWebFont(options.font);
  const size = TEXT_SIZES[options.textSize];
  const heightClass = height ? 'overflow-hidden' : 'min-h-[96px]';
  const heightStyle = { height, fontFamily: FONT_STACKS[options.font] };
  const lessonType = slot.lessonType ?? '';
  const subject = subjectLabel(slot.subjectForSite, options.aliases);

  const timeLabel = slot.startTime && slot.endTime
    ? `${slot.startTime} – ${slot.endTime}`
    : slot.className ? `Пара ${slot.className}` : null;

  if (isCancelled && !onlineMeetingLink) {
    return (
      <div style={heightStyle} className={`rounded-lg border border-red-200 bg-red-50 ${heightClass} flex flex-col items-center justify-center gap-1 text-center px-3`}>
        <span className={`${size.meta} font-bold text-red-600 uppercase tracking-wide`}>Скасовано</span>
        {timeLabel && <span className={`${size.meta} text-red-400`}>{timeLabel}</span>}
        <span className={`${size.meta} text-red-400 leading-snug opacity-80`}>{subject}</span>
      </div>
    );
  }

  // Online override: use the cancellation's meeting link instead of the slot's
  const effectiveLink = onlineMeetingLink ?? slot.linkToMeeting;

  const cardClass = isActive
    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-sm'
    : onlineMeetingLink ? 'bg-blue-50 border-blue-200 text-gray-800'
    : isReplacement ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200 text-gray-800';
  const badgeClass = isReplacement
    ? 'bg-amber-100 text-amber-700'
    : (LESSON_TYPE_BADGE[lessonType.toUpperCase()] ?? 'bg-gray-100 text-gray-600');

  const teacher = slot.teacherFullName && options.shortTeacherNames
    ? shortTeacherName(slot.teacherFullName)
    : slot.teacherFullName;

  return (
    <div style={heightStyle} className={`rounded-lg border p-3 space-y-1.5 ${heightClass} ${cardClass}`}>
      {timeLabel && (
        <div className={`flex items-center gap-1.5 ${size.meta} font-semibold`}>
          <Clock size={size.icon} className="shrink-0" />
          <span>{timeLabel}</span>
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded px-1.5 leading-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Зараз
            </span>
          )}
          {slot.className && slot.startTime && (
            <span className="ml-auto opacity-60">#{slot.className}</span>
          )}
        </div>
      )}
      <p className={`${size.subject} ${SUBJECT_WEIGHT_CLASS[options.subjectWeight]} leading-snug ${height ? 'line-clamp-2' : ''}`} title={slot.subjectForSite ?? undefined}>
        {subject}
      </p>
      {options.showLessonType && lessonType && (
        <span className={`inline-block ${size.meta} px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
          {lessonTypeLabel(lessonType, options.translateLessonTypes)}
        </span>
      )}
      {options.showTeacher && teacher && (
        <div className={`flex items-center gap-1 ${size.meta} opacity-75`}>
          <User size={size.icon} className="shrink-0" />
          <span className={height ? 'truncate' : ''} title={slot.teacherFullName ?? undefined}>{teacher}</span>
        </div>
      )}
      {options.showRoom && slot.roomName && (
        <div className={`flex items-center gap-1 ${size.meta} opacity-75`}>
          <MapPin size={size.icon} className="shrink-0" />
          <span className={height ? 'truncate' : ''} title={slot.roomName}>Ауд. {slot.roomName}</span>
        </div>
      )}
      {effectiveLink && (
        <a
          href={effectiveLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 ${size.meta} px-2 py-0.5 rounded-full font-medium hover:opacity-80 ${
            onlineMeetingLink
              ? 'bg-blue-100 text-blue-700'
              : 'text-blue-600'
          }`}
        >
          <ExternalLink size={size.icon - 1} className="shrink-0" />
          {onlineMeetingLink ? 'Онлайн' : 'Приєднатись онлайн'}
        </a>
      )}
    </div>
  );
}
