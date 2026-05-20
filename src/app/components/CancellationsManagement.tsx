import { useState, useEffect } from 'react';
import { Trash2, PlusCircle, XCircle } from 'lucide-react';
import {
  getGroups, getCurrentSemester, getSemesterClasses,
  getCancellations, createCancellation, deleteCancellation,
  GroupItemDto, SemesterClassItemDto, ClassCancellationDto,
} from '../utils/api';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function CancellationsManagement() {
  const [groups, setGroups] = useState<GroupItemDto[]>([]);
  const [semClasses, setSemClasses] = useState<SemesterClassItemDto[]>([]);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [cancellations, setCancellations] = useState<ClassCancellationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formGroupId, setFormGroupId] = useState('');
  const [formDate, setFormDate] = useState(todayStr());
  const [formClassId, setFormClassId] = useState('');
  const [formReason, setFormReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    Promise.all([getGroups(), getSemesterClasses(), getCurrentSemester()])
      .then(([gs, sc, sem]) => {
        setGroups(gs);
        setSemClasses(sc);
        setSemesterId(sem.id);
        if (gs.length > 0) setFormGroupId(String(gs[0].id));
        if (sc.length > 0) setFormClassId(String(sc[0].id));
        return getCancellations(sem.id);
      })
      .then(setCancellations)
      .catch(e => setError(e.message || 'Помилка завантаження'))
      .finally(() => setLoading(false));
  }, []);

  const refreshCancellations = async () => {
    if (!semesterId) return;
    const data = await getCancellations(semesterId);
    setCancellations(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterId || !formGroupId || !formClassId) return;
    setSaving(true);
    setSaveError('');
    try {
      await createCancellation({
        semesterId,
        groupId: Number(formGroupId),
        date: formDate,
        semesterClassId: Number(formClassId),
        reason: formReason || undefined,
      });
      setFormReason('');
      await refreshCancellations();
    } catch (e: any) {
      setSaveError(e.message || 'Помилка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCancellation(id);
      setCancellations(prev => prev.filter(c => c.id !== id));
    } catch {
      // ignore
    }
  };

  const getGroupName = (id: number) => groups.find(g => g.id === id)?.title ?? String(id);
  const getClassName = (id: number) => {
    const c = semClasses.find(sc => sc.id === id);
    return c ? (c.className ? `Пара ${c.className}` : `#${c.id}`) : String(id);
  };

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    return new Date(+y, +m - 1, +d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-400 text-sm">Завантаження...</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle size={18} className="text-red-500" />
          Скасувати заняття
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Група</label>
            <select
              value={formGroupId}
              onChange={e => setFormGroupId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none bg-white"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Дата</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Пара</label>
            <select
              value={formClassId}
              onChange={e => setFormClassId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none bg-white"
            >
              {semClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.className ? `Пара ${c.className}` : `#${c.id}`}
                  {c.startTime && c.endTime ? ` (${c.startTime}–${c.endTime})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Причина (необов'язково)</label>
            <input
              type="text"
              value={formReason}
              onChange={e => setFormReason(e.target.value)}
              placeholder="Хвороба викладача..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <XCircle size={15} />
              {saving ? 'Збереження...' : 'Скасувати заняття'}
            </button>
            {saveError && <span className="text-sm text-red-500">{saveError}</span>}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Скасовані заняття</h3>
        </div>
        {cancellations.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">Скасованих занять немає</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cancellations
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(c => (
                <div key={c.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{getGroupName(c.groupId)}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-700">{formatDate(c.date)}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-700">{getClassName(c.semesterClassId)}</span>
                    </div>
                    {c.reason && (
                      <p className="text-xs text-gray-500 mt-0.5">{c.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Відновити заняття"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
