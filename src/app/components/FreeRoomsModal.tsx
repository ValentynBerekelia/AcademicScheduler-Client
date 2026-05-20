import { useState, useEffect } from 'react';
import { X, DoorOpen, Search } from 'lucide-react';
import { getSemesterClasses, getFreeRooms, SemesterClassItemDto, FreeRoomsDto } from '../utils/api';

interface FreeRoomsModalProps {
  onClose: () => void;
  initialDate?: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function FreeRoomsModal({ onClose, initialDate }: FreeRoomsModalProps) {
  const [date, setDate] = useState(initialDate ?? todayStr());
  const [classes, setClasses] = useState<SemesterClassItemDto[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [result, setResult] = useState<FreeRoomsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSemesterClasses().then(data => {
      setClasses(data);
      if (data.length > 0) setSelectedClassId(String(data[0].id));
    }).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!date || !selectedClassId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getFreeRooms(date, Number(selectedClassId));
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find(c => String(c.id) === selectedClassId);

  const WEEK_TYPE_UA: Record<string, string> = { Odd: 'Непарний', Even: 'Парний' };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <DoorOpen size={20} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Вільні аудиторії</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Дата</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Пара</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.className ? `Пара ${c.className}` : `#${c.id}`}
                    {c.startTime && c.endTime ? ` (${c.startTime}–${c.endTime})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !date || !selectedClassId}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            <Search size={15} />
            {loading ? 'Пошук...' : 'Знайти вільні аудиторії'}
          </button>
        </div>

        {/* Result */}
        {error && (
          <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="border-t border-gray-100">
            <div className="px-6 py-3 bg-gray-50 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>Тип тижня: <span className="font-medium text-gray-700">{WEEK_TYPE_UA[result.weekType] ?? result.weekType}</span></span>
              {result.slot && (
                <span>Пара {result.slot.className}
                  {result.slot.startTime && result.slot.endTime
                    ? ` · ${result.slot.startTime}–${result.slot.endTime}`
                    : ''}
                </span>
              )}
              <span className="ml-auto font-medium text-emerald-700">{result.freeRooms.length} вільних аудиторій</span>
            </div>

            <div className="max-h-60 overflow-y-auto px-6 py-3">
              {result.freeRooms.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Вільних аудиторій немає</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {result.freeRooms.map(room => (
                    <div
                      key={room.id}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-800"
                    >
                      <DoorOpen size={14} className="shrink-0 text-emerald-500" />
                      {room.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
