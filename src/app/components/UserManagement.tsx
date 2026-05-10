import { useState, useEffect } from 'react';
import { UserDto, getUsers, updateUserRole, deleteUser } from '../utils/api';
import { Trash2, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Адміністратор',
  User: 'Студент',
};

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  User: 'bg-emerald-100 text-emerald-700',
};

interface UserManagementProps {
  currentUserEmail: string;
}

export function UserManagement({ currentUserEmail }: UserManagementProps) {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleToggle = async (user: UserDto) => {
    const newRole = user.role === 'Admin' ? 'User' : 'Admin';
    setActionLoading(user.id);
    try {
      await updateUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setConfirmDelete(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        Завантаження...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-800">Користувачі</span>
          <span className="text-sm text-gray-400">{users.length} осіб</span>
        </div>

        <div className="divide-y divide-gray-100">
          {users.map(user => {
            const isSelf = user.email === currentUserEmail;
            const isLoading = actionLoading === user.id;

            return (
              <div key={user.id} className="px-5 py-3 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 select-none">
                  {user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{user.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                    {isSelf && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">ви</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  {user.group && (
                    <p className="text-xs text-gray-500 mt-0.5">Група: {user.group}</p>
                  )}
                </div>

                {/* Actions */}
                {!isSelf && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRoleToggle(user)}
                      disabled={isLoading}
                      title={user.role === 'Admin' ? 'Зняти права адміна' : 'Зробити адміном'}
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
                    >
                      {isLoading
                        ? <Loader2 size={15} className="animate-spin" />
                        : user.role === 'Admin'
                          ? <ShieldOff size={15} />
                          : <ShieldCheck size={15} />
                      }
                    </button>

                    {confirmDelete === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={isLoading}
                          className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                        >
                          {isLoading ? '...' : 'Так'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          Ні
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(user.id)}
                        title="Видалити користувача"
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
