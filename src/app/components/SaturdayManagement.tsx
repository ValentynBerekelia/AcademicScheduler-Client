import { useState, useEffect } from 'react';
import {
  getCurrentSemester, getSaturdays, createReplacement,
  updateReplacement, deleteReplacement,
  SaturdayItemDto, CurrentSemesterDto,
} from '../utils/api';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

const DAY_NAMES: Record<string, string> = {
  '1': 'Понеділок', '2': 'Вівторок', '3': 'Середа',
  '4': 'Четвер', '5': 'П\'ятниця',
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function dateToInputValue(dateStr: string): string {
  return dateStr; // already YYYY-MM-DD
}

function weekdayName(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const map: Record<number, string> = {
    1: 'Понеділок', 2: 'Вівторок', 3: 'Середа', 4: 'Четвер', 5: 'П\'ятниця',
  };
  return map[day] ?? dateStr;
}

interface Props {
  onBack: () => void;
}

export function SaturdayManagement({ onBack }: Props) {
  const [semester, setSemester] = useState<CurrentSemesterDto | null>(null);
  const [saturdays, setSaturdays] = useState<SaturdayItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // editing state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const sem = await getCurrentSemester();
      setSemester(sem);

      const from = sem.startDay ?? new Date().toISOString().slice(0, 10);
      const to = sem.endDay ?? new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

      const list = await getSaturdays(sem.id, from, to);
      setSaturdays(list);
    } catch (e: any) {
      setError(e.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(sat: SaturdayItemDto) {
    setEditingDate(sat.date);
    setEditValue(sat.replacesDate ?? '');
    setSaveError('');
  }

  function cancelEdit() {
    setEditingDate(null);
    setEditValue('');
    setSaveError('');
  }

  async function handleSave(sat: SaturdayItemDto) {
    if (!editValue || !semester) return;
    setSaving(true);
    setSaveError('');
    try {
      if (sat.isAssigned) {
        await updateReplacement(semester.id, sat.date, editValue);
      } else {
        await createReplacement(semester.id, sat.date, editValue);
      }
      setEditingDate(null);
      await load();
    } catch (e: any) {
      setSaveError(e.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sat: SaturdayItemDto) {
    if (!semester) return;
    if (!confirm(`Видалити заміну для ${formatDate(sat.date)}?`)) return;
    try {
      await deleteReplacement(semester.id, sat.date);
      await load();
    } catch (e: any) {
      alert(e.message || 'Помилка видалення');
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Завантаження...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-3">{error}</p>
        <button onClick={load} className="text-sm text-blue-600 underline">Спробувати знову</button>
      </div>
    );
  }

  const assigned = saturdays.filter(s => s.isAssigned);
  const unassigned = saturdays.filter(s => !s.isAssigned);

  return (
    <div className="space-y-6">
      {/* Semester info */}
      {semester && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-800">
          <span className="font-semibold">{semester.description ?? `Семестр #${semester.id}`}</span>
          {semester.startDay && semester.endDay && (
            <span className="ml-2 text-blue-600">
              {formatDate(semester.startDay)} — {formatDate(semester.endDay)}
            </span>
          )}
        </div>
      )}

      {/* Assigned replacements */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Встановлені заміни ({assigned.length})
        </h2>
        {assigned.length === 0 ? (
          <p className="text-sm text-gray-400">Замін ще немає</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {assigned.map(sat => (
              <div key={sat.date} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{formatDate(sat.date)}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  {editingDate === sat.date ? (
                    <span className="text-sm text-gray-500">редагування...</span>
                  ) : (
                    <span className="text-gray-700">
                      {sat.replacesDate ? weekdayName(sat.replacesDate) : '—'}
                      {sat.replacesDate && (
                        <span className="text-gray-400 ml-1 text-xs">({formatDate(sat.replacesDate)})</span>
                      )}
                    </span>
                  )}
                </div>

                {editingDate === sat.date ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateToInputValue(editValue)}
                      onChange={e => setEditValue(e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSave(sat)}
                      disabled={saving}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      <Check size={15} />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100">
                      <X size={15} />
                    </button>
                    {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(sat)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(sat)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unassigned saturdays */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Суботи без заміни ({unassigned.length})
        </h2>
        {unassigned.length === 0 ? (
          <p className="text-sm text-gray-400">Всі суботи мають заміни</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {unassigned.map(sat => (
              <div key={sat.date} className="flex items-center gap-4 px-4 py-3">
                <span className="flex-1 font-medium text-gray-900">{formatDate(sat.date)}</span>

                {editingDate === sat.date ? (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Замінити на:</label>
                    <input
                      type="date"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      min={semester?.startDay ?? undefined}
                      max={semester?.endDay ?? undefined}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSave(sat)}
                      disabled={saving || !editValue}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-40"
                    >
                      <Check size={15} />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100">
                      <X size={15} />
                    </button>
                    {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(sat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                  >
                    <Plus size={14} />
                    Додати заміну
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
