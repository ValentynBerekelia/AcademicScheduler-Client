import { useState, useRef, useEffect } from 'react';
import { LogOut, Users, Calendar, Mail, LayoutDashboard, GraduationCap, Settings } from 'lucide-react';
import { UserProfile, logout } from '../utils/api';

interface ProfileDropdownProps {
  profile: UserProfile;
  onLogout: () => void;
  onAdminPanel?: () => void;
  onProfileRefresh?: () => void;
  onTeacherCabinet?: () => void;
  onCabinet?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Адміністратор',
  Teacher: 'Викладач',
  User: 'Студент',
};

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  Teacher: 'bg-blue-100 text-blue-700',
  User: 'bg-emerald-100 text-emerald-700',
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ProfileDropdown({ profile, onLogout, onAdminPanel, onTeacherCabinet, onCabinet }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
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

  const needsGroup = profile.role !== 'Teacher' && !profile.group;

  return (
    <div className="relative" ref={ref}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold select-none">
          {getInitials(profile.name)}
        </div>
        {needsGroup && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white" />
        )}
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
            {profile.group ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={14} className="text-gray-400 shrink-0" />
                <span>Група <span className="font-medium text-gray-900">{profile.group}</span></span>
              </div>
            ) : needsGroup ? (
              <button
                onClick={() => { setOpen(false); onCabinet?.(); }}
                className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 w-full"
              >
                <Users size={14} className="shrink-0" />
                <span>Вказати групу</span>
              </button>
            ) : null}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={14} className={profile.calendarSyncEnabled ? 'text-green-500 shrink-0' : 'text-gray-400 shrink-0'} />
              <span>Google Calendar {profile.calendarSyncEnabled ? 'підключено' : 'не підключено'}</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="px-2 py-2 border-b border-gray-100 space-y-0.5">
            {onCabinet && (
              <button
                onClick={() => { setOpen(false); onCabinet(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <Settings size={15} />
                <span>Особистий кабінет</span>
              </button>
            )}
            {profile.role === 'Teacher' && onTeacherCabinet && (
              <button
                onClick={() => { setOpen(false); onTeacherCabinet(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <GraduationCap size={15} />
                <span>Мій розклад викладача</span>
              </button>
            )}
            {profile.role === 'Admin' && onAdminPanel && (
              <button
                onClick={() => { setOpen(false); onAdminPanel(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <LayoutDashboard size={15} />
                <span>Адмін панель</span>
              </button>
            )}
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
