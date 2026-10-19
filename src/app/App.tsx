import { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { SchedulePage } from './components/SchedulePage';
import { AdminPage } from './components/AdminPage';
import { TeacherSchedulePage } from './components/TeacherSchedulePage';
import { CabinetPage } from './components/CabinetPage';
import { getMe, getMySettings, UserProfile, UserSettingsDto, DEFAULT_SETTINGS } from './utils/api';
import { applyTheme, storedTheme } from './utils/theme';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettingsDto>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<'schedule' | 'admin' | 'teachers' | 'cabinet' | 'profile'>('schedule');

  // Settings failing to load must not block the app — fall back to defaults (keeping this device's theme)
  const loadSettings = () => getMySettings()
    .then(setSettings)
    .catch(() => setSettings({ ...DEFAULT_SETTINGS, theme: storedTheme() }));

  // The signed-in user's theme follows their saved setting; signed out, the device keeps its last theme
  useEffect(() => {
    if (isAuthenticated) applyTheme(settings.theme);
  }, [isAuthenticated, settings.theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isGoogleAuth = params.get('google_auth') === 'success';

    if (isGoogleAuth) {
      window.history.replaceState({}, '', '/');
    }

    const stored = localStorage.getItem('userProfile');
    if (stored || isGoogleAuth) {
      getMe()
        .then(async p => {
          localStorage.setItem('userProfile', JSON.stringify(p));
          await loadSettings();
          setProfile(p);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('userProfile');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = async (p: UserProfile) => {
    localStorage.setItem('userProfile', JSON.stringify(p));
    await loadSettings();
    setProfile(p);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('userProfile');
    setProfile(null);
    setSettings({ ...DEFAULT_SETTINGS, theme: storedTheme() });
    setIsAuthenticated(false);
    setShowLogin(true);
    setPage('schedule');
  };

  const handleProfileRefresh = () => {
    getMe()
      .then(p => {
        localStorage.setItem('userProfile', JSON.stringify(p));
        setProfile(p);
      })
      .catch(handleLogout);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Завантаження...</div>
      </div>
    );
  }

  if (isAuthenticated && profile) {
    const onAdminPanel = profile.role === 'Admin' ? () => setPage('admin') : undefined;
    const onTeacherCabinet = profile.role === 'Teacher' ? () => setPage('cabinet') : undefined;
    const onCabinet = () => setPage('profile');

    if (page === 'profile') {
      return (
        <CabinetPage
          profile={profile}
          settings={settings}
          onSettingsChange={setSettings}
          onBack={() => setPage('schedule')}
          onLogout={handleLogout}
          onProfileRefresh={handleProfileRefresh}
          onAdminPanel={onAdminPanel}
          onTeacherCabinet={onTeacherCabinet}
        />
      );
    }
    if (page === 'admin') {
      return (
        <AdminPage
          profile={profile}
          onLogout={handleLogout}
          onBack={() => setPage('schedule')}
          onProfileRefresh={handleProfileRefresh}
          onCabinet={onCabinet}
        />
      );
    }
    if (page === 'teachers') {
      return (
        <TeacherSchedulePage
          profile={profile}
          onLogout={handleLogout}
          onUnauthorized={handleLogout}
          onAdminPanel={onAdminPanel}
          onProfileRefresh={handleProfileRefresh}
          onBack={() => setPage('schedule')}
          onCabinet={onCabinet}
          personalMode={false}
        />
      );
    }
    if (page === 'cabinet') {
      return (
        <TeacherSchedulePage
          profile={profile}
          onLogout={handleLogout}
          onUnauthorized={handleLogout}
          onAdminPanel={onAdminPanel}
          onProfileRefresh={handleProfileRefresh}
          onBack={() => setPage('schedule')}
          onCabinet={onCabinet}
          personalMode={true}
        />
      );
    }
    return (
      <SchedulePage
        profile={profile}
        settings={settings}
        onLogout={handleLogout}
        onUnauthorized={handleLogout}
        onAdminPanel={onAdminPanel}
        onProfileRefresh={handleProfileRefresh}
        onTeacherSchedule={() => setPage('teachers')}
        onTeacherCabinet={onTeacherCabinet}
        onCabinet={onCabinet}
      />
    );
  }

  if (showLogin) {
    return (
      <LoginForm
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={() => setShowLogin(false)}
      />
    );
  }

  return (
    <RegisterForm
      onSuccess={handleAuthSuccess}
      onSwitchToLogin={() => setShowLogin(true)}
    />
  );
}
