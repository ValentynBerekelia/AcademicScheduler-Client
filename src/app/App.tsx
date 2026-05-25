import { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { SchedulePage } from './components/SchedulePage';
import { AdminPage } from './components/AdminPage';
import { TeacherSchedulePage } from './components/TeacherSchedulePage';
import { getMe, UserProfile } from './utils/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<'schedule' | 'admin' | 'teachers' | 'cabinet'>('schedule');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isGoogleAuth = params.get('google_auth') === 'success';

    if (isGoogleAuth) {
      window.history.replaceState({}, '', '/');
    }

    const stored = localStorage.getItem('userProfile');
    if (stored || isGoogleAuth) {
      getMe()
        .then(p => {
          localStorage.setItem('userProfile', JSON.stringify(p));
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

  const handleAuthSuccess = (p: UserProfile) => {
    localStorage.setItem('userProfile', JSON.stringify(p));
    setProfile(p);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('userProfile');
    setProfile(null);
    setIsAuthenticated(false);
    setShowLogin(true);
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
    if (page === 'admin') {
      return (
        <AdminPage
          profile={profile}
          onLogout={handleLogout}
          onBack={() => setPage('schedule')}
          onProfileRefresh={handleProfileRefresh}
        />
      );
    }
    if (page === 'teachers') {
      return (
        <TeacherSchedulePage
          profile={profile}
          onLogout={handleLogout}
          onUnauthorized={handleLogout}
          onAdminPanel={profile.role === 'Admin' ? () => setPage('admin') : undefined}
          onProfileRefresh={handleProfileRefresh}
          onBack={() => setPage('schedule')}
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
          onAdminPanel={profile.role === 'Admin' ? () => setPage('admin') : undefined}
          onProfileRefresh={handleProfileRefresh}
          onBack={() => setPage('schedule')}
          personalMode={true}
        />
      );
    }
    return (
      <SchedulePage
        profile={profile}
        onLogout={handleLogout}
        onUnauthorized={handleLogout}
        onAdminPanel={profile.role === 'Admin' ? () => setPage('admin') : undefined}
        onProfileRefresh={handleProfileRefresh}
        onTeacherSchedule={() => setPage('teachers')}
        onTeacherCabinet={profile.role === 'Teacher' ? () => setPage('cabinet') : undefined}
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
