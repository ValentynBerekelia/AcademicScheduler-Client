import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, RotateCcw, X, Loader2, CloudDownload } from 'lucide-react';
import {
  ExamDto, ExamRequest, ExamType, ExamSyncResult, GroupItemDto,
  adminGetExams, adminCreateExam, adminUpdateExam, adminDeleteExam, adminRestoreExam, adminSyncExams, getGroups,
} from '../utils/api';
import { EXAM_TYPE_LABELS, EXAM_TYPE_BADGE } from './ExamWidgets';

const EMPTY_FORM: ExamRequest = {
  groupTitle: '',
  subject: '',
  type: 'Exam',
  date: '',
  startTime: '',
  endTime: '',
  teacherName: '',
  room: '',
  note: '',
};

function toForm(e: ExamDto): ExamRequest {
  return {
    groupTitle: e.groupTitle,
    subject: e.subject,
    type: e.type,
    date: e.date,
    startTime: e.startTime ?? '',
    endTime: e.endTime ?? '',
    teacherName: e.teacherName ?? '',
    room: e.room ?? '',
    note: e.note ?? '',
  };
}

function SourceBadge({ exam }: { exam: ExamDto }) {
  if (exam.isDeleted) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">видалено</span>;
  if (!exam.isImported) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">вручну</span>;
  if (exam.isEdited) return <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">авто, змінено</span>;
  return <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">авто</span>;
}

export function ExamsManagement() {
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [groups, setGroups] = useState<GroupItemDto[]>([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState<ExamRequest | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<ExamSyncResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setExams(await adminGetExams(groupFilter || undefined, showDeleted));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [groupFilter, showDeleted]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getGroups().then(setGroups).catch(() => {}); }, []);

  // Session groups (e.g. «606(з)») are not in the main schedule, so merge both lists
  const groupOptions = [...new Set([...groups.map(g => g.title), ...exams.map(e => e.groupTitle)])]
    .sort((a, b) => a.localeCompare(b, 'uk'));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, groupTitle: groupFilter });
    setFormError('');
  };

  const openEdit = (exam: ExamDto) => {
    setEditingId(exam.id);
    setForm(toForm(exam));
    setFormError('');
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError('');
    try {
      if (editingId) await adminUpdateExam(editingId, form);
      else await adminCreateExam(form);
      setForm(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (exam: ExamDto) => {
    const msg = exam.isImported
      ? `Приховати «${exam.subject}»? Автоімпорт більше не додаватиме цей запис.`
      : `Видалити «${exam.subject}»?`;
    if (!confirm(msg)) return;
    await adminDeleteExam(exam.id).catch(e => setError(e.message));
    await load();
  };

  const restore = async (exam: ExamDto) => {
    await adminRestoreExam(exam.id).catch(e => setError(e.message));
    await load();
  };

  const sync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError('');
    try {
      setSyncResult(await adminSyncExams());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка синхронізації');
    } finally {
      setSyncing(false);
    }
  };

  const set = (patch: Partial<ExamRequest>) => setForm(f => (f ? { ...f, ...patch } : f));
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white';

  return (
    <div className="space-y-5">
      {/* Sync */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CloudDownload size={18} className="text-emerald-600" /> Автоімпорт з fmi-schedule
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Сервер щодоби шукає семестри-сесії і забирає з них екзамени, заліки та консультації.
            Ваші правки та видалення імпорт не перезаписує.
          </p>
          {syncResult && (
            <p className="text-sm text-emerald-700 mt-2">
              Переглянуто семестрів: {syncResult.semestersScanned}
              {syncResult.sessionSemesterIds.length > 0 && ` (з екзаменами: ${syncResult.sessionSemesterIds.join(', ')})`}
              {' · '}додано {syncResult.added}, оновлено {syncResult.updated}, прибрано {syncResult.removed}
              {syncResult.remindersSent > 0 && ` · надіслано нагадувань: ${syncResult.remindersSent}`}
            </p>
          )}
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Синхронізація…' : 'Синхронізувати зараз'}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          <option value="">Усі групи</option>
          {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
          Показати приховані
        </label>
        <button onClick={openCreate}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 text-sm hover:bg-emerald-50">
          <Plus size={15} /> Додати екзамен
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {/* Form */}
      {form && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-emerald-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{editingId ? 'Редагування' : 'Новий екзамен'}</h3>
            <button type="button" onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs text-gray-600">
              <span>Група *</span>
              <input list="exam-groups" required value={form.groupTitle} onChange={e => set({ groupTitle: e.target.value })} className={inputClass} />
              <datalist id="exam-groups">{groupOptions.map(g => <option key={g} value={g} />)}</datalist>
            </label>
            <label className="space-y-1 text-xs text-gray-600 sm:col-span-2">
              <span>Предмет *</span>
              <input required value={form.subject} onChange={e => set({ subject: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span>Тип *</span>
              <select value={form.type} onChange={e => set({ type: e.target.value as ExamType })} className={inputClass}>
                {(Object.keys(EXAM_TYPE_LABELS) as ExamType[]).map(t => <option key={t} value={t}>{EXAM_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span>Дата *</span>
              <input type="date" required value={form.date} onChange={e => set({ date: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span>Початок</span>
              <input type="time" value={form.startTime ?? ''} onChange={e => set({ startTime: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span>Кінець</span>
              <input type="time" value={form.endTime ?? ''} onChange={e => set({ endTime: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 text-xs text-gray-600">
              <span>Аудиторія</span>
              <input value={form.room ?? ''} onChange={e => set({ room: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 text-xs text-gray-600 sm:col-span-2">
              <span>Викладач</span>
              <input value={form.teacherName ?? ''} onChange={e => set({ teacherName: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 text-xs text-gray-600 sm:col-span-2">
              <span>Примітка для студентів</span>
              <input value={form.note ?? ''} onChange={e => set({ note: e.target.value })} className={inputClass} />
            </label>
          </div>
          {editingId && exams.find(e => e.id === editingId)?.isImported && (
            <p className="text-xs text-amber-700">Після збереження автоімпорт більше не змінюватиме цей запис.</p>
          )}
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} Зберегти
            </button>
            <button type="button" onClick={() => setForm(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
              Скасувати
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-400">Завантаження…</p>
        ) : exams.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            Екзаменів немає. Коли університет опублікує сесію, вони з'являться після синхронізації — або додайте вручну.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">Дата</th>
                <th className="px-4 py-2.5 font-medium">Група</th>
                <th className="px-4 py-2.5 font-medium">Тип</th>
                <th className="px-4 py-2.5 font-medium">Предмет</th>
                <th className="px-4 py-2.5 font-medium">Викладач</th>
                <th className="px-4 py-2.5 font-medium">Аудиторія</th>
                <th className="px-4 py-2.5 font-medium">Джерело</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exams.map(e => (
                <tr key={e.id} className={e.isDeleted ? 'opacity-50' : ''}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="font-medium text-gray-800">
                      {new Date(e.date + 'T00:00').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', weekday: 'short' })}
                    </span>
                    {e.startTime && <span className="text-gray-500 ml-1.5">{e.startTime}</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{e.groupTitle}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXAM_TYPE_BADGE[e.type]}`}>{EXAM_TYPE_LABELS[e.type]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{e.subject}</td>
                  <td className="px-4 py-2.5 text-gray-600">{e.teacherName ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{e.room ?? '—'}</td>
                  <td className="px-4 py-2.5"><SourceBadge exam={e} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    {e.isDeleted ? (
                      <button onClick={() => restore(e)} title="Відновити" className="p-1.5 text-gray-500 hover:text-emerald-700">
                        <RotateCcw size={15} />
                      </button>
                    ) : (
                      <>
                        <button onClick={() => openEdit(e)} title="Редагувати" className="p-1.5 text-gray-500 hover:text-gray-900">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(e)} title="Видалити" className="p-1.5 text-gray-500 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
