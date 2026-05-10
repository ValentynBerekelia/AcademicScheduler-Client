import { useState } from 'react';
import { register, getMe, UserProfile } from '../utils/api';
const universityImg = '/university.jpg';

interface RegisterFormProps {
  onSuccess: (profile: UserProfile) => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ name, email, password, group });
      const profile = await getMe();
      onSuccess(profile);
    } catch (err: any) {
      setError(err.message || 'Помилка реєстрації. Можливо, цей email вже зареєстрований');
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
          <path d="M 340 80 A 180 180 0 0 1 390 210" stroke="#f97316" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
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
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-white/60 text-xs tracking-widest uppercase font-medium">АкадемРозклад</span>
          </div>
          <div className="mt-auto">
            <div className="w-8 h-0.5 bg-orange-500 mb-4" />
            <p className="text-orange-400 text-xs uppercase tracking-[0.25em] font-semibold mb-2">з 1875 року</p>
            <h2 className="text-white text-xl font-bold leading-snug">
              Чернівецький<br />національний<br />університет
            </h2>
            <p className="text-white/30 text-xs mt-2 font-light">ім. Юрія Федьковича</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Створити акаунт</h1>
            <p className="text-sm text-gray-400 mt-1">Заповніть форму для реєстрації</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Повне ім'я</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Іваненко Іван Іванович"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Мінімум 6 символів"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                required minLength={6} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Група</label>
              <input type="text" value={group} onChange={(e) => setGroup(e.target.value)}
                placeholder="Наприклад: КІ-21"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition text-sm bg-gray-50 focus:bg-white"
                required />
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white py-2.5 px-4 rounded-lg hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-50 font-semibold text-sm shadow-md shadow-orange-200 mt-1">
              {loading ? 'Завантаження...' : 'Зареєструватися'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Вже є акаунт?{' '}
            <button onClick={onSwitchToLogin} className="text-orange-500 hover:text-orange-600 font-semibold">
              Увійти
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
