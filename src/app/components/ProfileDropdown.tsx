import { useState, useRef, useEffect } from 'react';
import { LogOut, Users, Bell, Calendar, Mail, LayoutDashboard, RefreshCw, Unlink, Trash2 } from 'lucide-react';
import { UserProfile, logout, disconnectCalendar, resyncCalendar, clearCalendar } from '../utils/api';

interface ProfileDropdownProps {
  profile: UserProfile;
  onLogout: () => void;
  onAdminPanel?: () => void;
  onProfileRefresh?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Адміністратор',
  User: 'Студент',
};

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  User: 'bg-emerald-100 text-emerald-700',
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ProfileDropdown({ profile, onLogout, onAdminPanel, onProfileRefresh }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMsg, setCalendarMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <div className="relative" ref={ref}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold select-none">
          {getInitials(profile.name)}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {getInitials(profile.name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
                <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="px-4 py-3 space-y-2 border-b border-gray-100">
            {profile.group && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={14} className="text-gray-400 shrink-0" />
                <span>Група <span className="font-medium text-gray-900">{profile.group}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
          </div>

          {/* Admin panel */}
          {profile.role === 'Admin' && onAdminPanel && (
            <div className="px-2 py-2 border-b border-gray-100">
              <button
                onClick={() => { setOpen(false); onAdminPanel(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <LayoutDashboard size={15} />
                <span>Адмін панель</span>
              </button>
            </div>
          )}

          {/* Calendar */}
          <div className="px-2 py-2 border-b border-gray-100">
            {profile.calendarSyncEnabled ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <Calendar size={15} className="text-green-500 shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">Google Calendar</span>
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">увімк.</span>
                </div>
                <button
                  onClick={async () => {
                    setCalendarLoading(true);
                    setCalendarMsg(null);
                    try {
                      await resyncCalendar();
                      setCalendarMsg({ text: 'Синхронізовано', ok: true });
                    } catch {
                      setCalendarMsg({ text: 'Помилка синхронізації', ok: false });
                    } finally {
                      setCalendarLoading(false);
                    }
                  }}
                  disabled={calendarLoading}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={calendarLoading ? 'animate-spin' : ''} />
                  <span>Синхронізувати</span>
                </button>
                <button
                  onClick={async () => {
                    setCalendarLoading(true);
                    setCalendarMsg(null);
                    try {
                      await clearCalendar();
                      setCalendarMsg({ text: 'Пари видалено з календаря', ok: true });
                    } catch {
                      setCalendarMsg({ text: 'Помилка очищення', ok: false });
                    } finally {
                      setCalendarLoading(false);
                    }
                  }}
                  disabled={calendarLoading}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>Очистити календар</span>
                </button>
                {calendarMsg && (
                  <p className={`text-xs px-3 py-1 ${calendarMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                    {calendarMsg.ok ? '✓' : '✕'} {calendarMsg.text}
                  </p>
                )}
                <button
                  onClick={async () => {
                    await disconnectCalendar();
                    onProfileRefresh?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Unlink size={14} />
                  <span>Відключити календар</span>
                </button>
              </>
            ) : (
              <a
                href="/api/calendar/connect"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-green-600 hover:bg-green-50 transition-colors"
              >
                <Calendar size={15} />
                <span>Додати до Google Calendar</span>
              </a>
            )}
          </div>

          {/* Future actions */}
          <div className="px-2 py-2 border-b border-gray-100">
            <button disabled className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed">
              <Bell size={15} />
              <span>Сповіщення</span>
              <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">скоро</span>
            </button>
          </div>

          {/* Logout */}
          <div className="px-2 py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              <span>Вийти</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
