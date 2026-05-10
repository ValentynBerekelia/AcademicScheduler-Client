import { useState } from 'react';
import { login, getMe, UserProfile } from '../utils/api';
const universityImg = '/university.jpg';

interface LoginFormProps {
  onSuccess: (profile: UserProfile) => void;
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      const profile = await getMe();
      onSuccess(profile);
    } catch (err: any) {
      setError(err.message || 'Невірний email або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — black + circle photo */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-black">
        {/* Orange glow behind circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[340px] h-[340px] rounded-full bg-orange-500/20 blur-3xl" />

        {/* Decorative arcs */}
        <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[420px] h-[420px]" viewBox="0 0 420 420" fill="none">
          <circle cx="210" cy="210" r="200" stroke="#f97316" strokeWidth="1" strokeDasharray="8 6" opacity="0.3" />
          <circle cx="210" cy="210" r="170" stroke="#f97316" strokeWidth="0.5" opacity="0.2" />
          {/* Orange arc top-right */}
          <path d="M 340 80 A 180 180 0 0 1 390 210" stroke="#f97316" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {/* Orange arc bottom-left */}
          <path d="M 80 340 A 180 180 0 0 1 30 210" stroke="#f97316" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </svg>

        {/* Circular photo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[340px] h-[340px] rounded-full overflow-hidden ring-4 ring-orange-500/60 ring-offset-4 ring-offset-black">
          <img src={universityImg} alt="Університет" className="w-full h-full object-cover" />
        </div>

        {/* Dot grid top-right */}
        <div className="absolute top-8 right-8 grid grid-cols-5 gap-[6px] opacity-25">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-[3px] h-[3px] rounded-full bg-orange-400" />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10 w-full">
          {/* Top */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-white/60 text-xs tracking-widest uppercase font-medium">АкадемРозклад</span>
          </div>

          {/* Bottom text */}
          <div className="mt-auto">
            <div className="w-8 h-0.5 bg-orange-500 mb-4" />
            <p className="text-orange-400 text-xs uppercase tracking-[0.25em] font-semibold mb-2">
              з 1875 року
            </p>
            <h2 className="text-white text-xl font-bold leading-snug">
              Чернівецький<br />національний<br />університет
            </h2>
            <p className="text-white/30 text-xs mt-2 font-light">ім. Юрія Федьковича</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Вхід в систему</h1>
            <p className="text-sm text-gray-400 mt-1">Введіть свої дані для входу</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2.5 px-4 rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-50 font-semibold text-sm shadow-md shadow-orange-200"
            >
              {loading ? 'Завантаження...' : 'Увійти'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300">або</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <a
            href="/api/auth/google/login"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600 font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Увійти через Google
          </a>

          <p className="mt-6 text-center text-sm text-gray-400">
            Немає акаунту?{' '}
            <button onClick={onSwitchToRegister} className="text-orange-500 hover:text-orange-600 font-semibold">
              Зареєструватися
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
