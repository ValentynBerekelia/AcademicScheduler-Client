import { useState } from 'react';
import { UserProfile } from '../utils/api';
import { ProfileDropdown } from './ProfileDropdown';
import { SaturdayManagement } from './SaturdayManagement';
import { UserManagement } from './UserManagement';
import { CancellationsManagement } from './CancellationsManagement';
import { NotificationBell } from './NotificationBell';
import { LayoutDashboard, Users, CalendarRange, Calendar, XCircle, ChevronRight } from 'lucide-react';

type AdminSection = 'saturdays' | 'users' | 'semester' | 'cancellations' | null;

interface AdminPageProps {
  profile: UserProfile;
  onLogout: () => void;
  onBack: () => void;
  onProfileRefresh?: () => void;
}

export function AdminPage({ profile, onLogout, onBack, onProfileRefresh }: AdminPageProps) {
  const [section, setSection] = useState<AdminSection>(null);

  const SECTIONS = [
    {
      key: 'saturdays' as AdminSection,
      icon: Calendar,
      title: 'Управління суботами',
      description: 'Додавання відробіткових субот, налаштування замін',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      active: true,
    },
    {
      key: 'users' as AdminSection,
      icon: Users,
      title: 'Управління користувачами',
      description: 'Перегляд списку, зміна ролей користувачів',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      active: true,
    },
    {
      key: 'cancellations' as AdminSection,
      icon: XCircle,
      title: 'Скасування занять',
      description: 'Скасувати конкретне заняття для групи на певну дату',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      active: true,
    },
    {
      key: 'semester' as AdminSection,
      icon: CalendarRange,
      title: 'Управління семестром',
      description: 'Встановлення поточного семестру',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      active: false,
    },
  ];

  const currentSection = SECTIONS.find(s => s.key === section);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={onBack} className="hover:text-gray-900 transition-colors">
              Розклад
            </button>
            <ChevronRight size={14} />
            <button
              onClick={() => setSection(null)}
              className={section ? 'hover:text-gray-900 transition-colors' : 'text-gray-900 font-semibold'}
            >
              <span className="flex items-center gap-1.5">
                <LayoutDashboard size={15} className="text-indigo-600" />
                Адмін панель
              </span>
            </button>
            {section && currentSection && (
              <>
                <ChevronRight size={14} />
                <span className={`font-semibold ${currentSection.color}`}>{currentSection.title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown profile={profile} onLogout={onLogout} onProfileRefresh={onProfileRefresh} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!section ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECTIONS.map(({ key, icon: Icon, title, description, color, bg, border, active }) =>
              active ? (
                <button
                  key={title}
                  onClick={() => setSection(key)}
                  className={`text-left p-6 rounded-xl border-2 ${border} ${bg} hover:shadow-md transition-shadow`}
                >
                  <Icon size={28} className={`${color} mb-3`} />
                  <h2 className={`font-semibold text-base ${color} mb-1`}>{title}</h2>
                  <p className="text-sm text-gray-500">{description}</p>
                </button>
              ) : (
                <div
                  key={title}
                  className={`p-6 rounded-xl border-2 ${border} ${bg} opacity-50`}
                >
                  <Icon size={28} className={`${color} mb-3`} />
                  <h2 className={`font-semibold text-base ${color} mb-1`}>{title}</h2>
                  <p className="text-sm text-gray-500">{description}</p>
                  <span className="inline-block mt-3 text-xs bg-white text-gray-400 px-2 py-0.5 rounded border border-gray-200">
                    скоро
                  </span>
                </div>
              )
            )}
          </div>
        ) : section === 'saturdays' ? (
          <SaturdayManagement onBack={() => setSection(null)} />
        ) : section === 'users' ? (
          <UserManagement currentUserEmail={profile.email} />
        ) : section === 'cancellations' ? (
          <CancellationsManagement />
        ) : null}
      </div>
    </div>
  );
}
