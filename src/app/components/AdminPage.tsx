import { useState } from 'react';
import { UserProfile, reseedDatabase } from '../utils/api';
import { ProfileDropdown } from './ProfileDropdown';
import { SaturdayManagement } from './SaturdayManagement';
import { UserManagement } from './UserManagement';
import { CancellationsManagement } from './CancellationsManagement';
import { ExamsManagement } from './ExamsManagement';
import { LayoutDashboard, Users, Calendar, XCircle, ChevronRight, DatabaseZap, AlertTriangle, CheckCircle2, Loader2, GraduationCap } from 'lucide-react';

type AdminSection = 'saturdays' | 'users' | 'cancellations' | 'exams' | 'reseed' | null;

interface AdminPageProps {
  profile: UserProfile;
  onLogout: () => void;
  onBack: () => void;
  onProfileRefresh?: () => void;
  onCabinet?: () => void;
}

export function AdminPage({ profile, onLogout, onBack, onProfileRefresh, onCabinet }: AdminPageProps) {
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
    },
    {
      key: 'users' as AdminSection,
      icon: Users,
      title: 'Управління користувачами',
      description: 'Перегляд списку, зміна ролей користувачів',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      key: 'cancellations' as AdminSection,
      icon: XCircle,
      title: 'Скасування занять',
      description: 'Скасувати конкретне заняття для групи на певну дату',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      key: 'exams' as AdminSection,
      icon: GraduationCap,
      title: 'Екзамени та сесія',
      description: 'Автоімпорт з fmi-schedule, ручне додавання та правки екзаменів',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
    },
    {
      key: 'reseed' as AdminSection,
      icon: DatabaseZap,
      title: 'Оновлення розкладу',
      description: 'Завантаження актуального розкладу з університетської API',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
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
            <ProfileDropdown profile={profile} onLogout={onLogout} onProfileRefresh={onProfileRefresh} onCabinet={onCabinet} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!section ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECTIONS.map(({ key, icon: Icon, title, description, color, bg, border }) => (
              <button
                key={title}
                onClick={() => setSection(key)}
                className={`text-left p-6 rounded-xl border-2 ${border} ${bg} hover:shadow-md transition-shadow`}
              >
                <Icon size={28} className={`${color} mb-3`} />
                <h2 className={`font-semibold text-base ${color} mb-1`}>{title}</h2>
                <p className="text-sm text-gray-500">{description}</p>
              </button>
            ))}
          </div>
        ) : section === 'saturdays' ? (
          <SaturdayManagement onBack={() => setSection(null)} />
        ) : section === 'users' ? (
          <UserManagement currentUserEmail={profile.email} />
        ) : section === 'cancellations' ? (
          <CancellationsManagement />
        ) : section === 'exams' ? (
          <ExamsManagement />
        ) : section === 'reseed' ? (
          <ReseedSection />
        ) : null}
      </div>
    </div>
  );
}

type ReseedStatus = 'idle' | 'confirm' | 'loading' | 'success' | 'error';

function ReseedSection() {
  const [status, setStatus] = useState<ReseedStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleReseed() {
    setStatus('loading');
    try {
      await reseedDatabase();
      setStatus('success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Невідома помилка');
      setStatus('error');
    }
  }

  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <DatabaseZap size={24} className="text-emerald-600" />
          <h2 className="font-semibold text-gray-900">Оновлення розкладу</h2>
        </div>

        <p className="text-sm text-gray-600">
          Завантажує актуальний розклад з університетської API і повністю замінює поточні дані:
          пари, групи, викладачів, аудиторії та семестр.
        </p>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Усі поточні дані розкладу будуть <strong>видалені та перезаписані</strong>.
            Скасування занять, суботні заміни та налаштування користувачів залишаться.
          </p>
        </div>

        {status === 'idle' && (
          <button
            onClick={() => setStatus('confirm')}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Оновити розклад
          </button>
        )}

        {status === 'confirm' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800">Ви впевнені? Цю дію неможливо скасувати.</p>
            <div className="flex gap-2">
              <button
                onClick={handleReseed}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Так, оновити
              </button>
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Скасувати
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 size={16} className="animate-spin text-emerald-600" />
            Завантаження даних... це може зайняти кілька хвилин
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            Розклад успішно оновлено
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">Помилка: {errorMsg}</p>
            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Спробувати знову
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
