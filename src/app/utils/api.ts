const API_BASE_URL = '/api';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResult {
  name: string;
  email: string;
  role: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  group: string;
}

export async function login(data: LoginData): Promise<AuthResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Помилка входу');
  }

  const body = await response.json();
  return { name: body.name, email: body.email, role: body.role };
}

export async function register(data: RegisterData): Promise<AuthResult> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Помилка реєстрації');
  }

  const body = await response.json();
  return { name: body.name, email: body.email, role: body.role };
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  group: string | null;
  calendarSyncEnabled: boolean;
  teacherName: string | null;
}

export async function disconnectCalendar(): Promise<void> {
  await fetch(`${API_BASE_URL}/calendar/disconnect`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export async function resyncCalendar(): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/calendar/resync`, { method: 'POST', credentials: 'include' });
  if (!r.ok) throw new Error(await r.text());
}

export async function clearCalendar(): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/calendar/clear`, { method: 'DELETE', credentials: 'include' });
  if (!r.ok) throw new Error(await r.text());
}

export async function updateMyGroup(group: string): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/auth/group`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || 'Помилка збереження групи');
  }
}

export async function getMe(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
  });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('Failed to get profile');
  return response.json();
}

// ── Semesters ────────────────────────────────────────────────────────────────

export interface CurrentSemesterDto {
  id: number;
  description: string | null;
  startDay: string | null;
  endDay: string | null;
}

export async function getCurrentSemester(): Promise<CurrentSemesterDto> {
  const response = await fetch(`${API_BASE_URL}/semesters/current`, {
    credentials: 'include',
  });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('Failed to get current semester');
  return response.json();
}

// ── Replacements ──────────────────────────────────────────────────────────────

export interface SaturdayItemDto {
  date: string;
  isAssigned: boolean;
  replacesDate: string | null;
}

export interface ReplacementRuleDto {
  semesterId: number;
  saturdayDate: string;
  replacesDate: string;
  createdAt: string;
}

export async function getSaturdays(semesterId: number, from: string, to: string): Promise<SaturdayItemDto[]> {
  const response = await fetch(
    `${API_BASE_URL}/semesters/${semesterId}/saturdays?from=${from}&to=${to}`,
    { credentials: 'include' }
  );
  if (!response.ok) throw new Error('Failed to load saturdays');
  return response.json();
}

export async function createReplacement(semesterId: number, saturdayDate: string, replacesDate: string): Promise<ReplacementRuleDto> {
  const response = await fetch(`${API_BASE_URL}/semesters/${semesterId}/replacements`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saturdayDate, replacesDate }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to create replacement');
  }
  return response.json();
}

export async function updateReplacement(semesterId: number, saturdayDate: string, replacesDate: string): Promise<ReplacementRuleDto> {
  const response = await fetch(`${API_BASE_URL}/semesters/${semesterId}/replacements/${saturdayDate}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replacesDate }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to update replacement');
  }
  return response.json();
}

export async function deleteReplacement(semesterId: number, saturdayDate: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/semesters/${semesterId}/replacements/${saturdayDate}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to delete replacement');
  }
}

// ── Schedule ─────────────────────────────────────────────────────────────────

export interface ScheduleSlotDto {
  id: number;
  semesterId: number;
  groupId: number;
  groupTitle: string | null;
  day: string;
  semesterClassId: number;
  weekType: number;
  subjectForSite: string;
  startTime: string | null;
  endTime: string | null;
  className: string | null;
  teacherFullName: string | null;
  roomName: string | null;
  lessonType: string | null;
  linkToMeeting: string | null;
}

export interface WeekDayDto {
  date: string;
  dayName: string;
  isReplacement: boolean;
  replacesDay: string | null;
  slots: ScheduleSlotDto[];
}

export interface CurrentWeekDto {
  weekNumber: number;
  weekType: string;
  weekStart: string;
  weekEnd: string;
  groupTitle: string;
  days: WeekDayDto[];
}

export async function getCurrentWeek(group?: string, date?: string): Promise<CurrentWeekDto> {
  const params = new URLSearchParams();
  if (group) params.set('group', group);
  if (date) params.set('date', date);
  const query = params.toString() ? `?${params}` : '';

  const response = await fetch(`${API_BASE_URL}/schedule/current-week${query}`, {
    credentials: 'include',
  });

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Помилка завантаження розкладу');
  }

  return response.json();
}

export interface GroupItemDto {
  id: number;
  title: string;
}

// ── Teachers ─────────────────────────────────────────────────────────────────

export interface TeacherItemDto {
  teacherId: { value: number };
  name: string;
  surname: string;
  patronymic: string;
  email: string | null;
}

export interface TeacherWeekDto {
  teacherFullName: string;
  weekType: string;
  days: WeekDayDto[];
}

export async function getTeachers(): Promise<TeacherItemDto[]> {
  const response = await fetch(`${API_BASE_URL}/teachers`, { credentials: 'include' });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('Failed to load teachers');
  return response.json();
}

export async function getTeacherSchedule(fullName: string, weekType: number): Promise<TeacherWeekDto> {
  const params = new URLSearchParams({ fullName, weekType: String(weekType) });
  const response = await fetch(`${API_BASE_URL}/teachers/schedule?${params}`, { credentials: 'include' });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('Failed to load teacher schedule');
  return response.json();
}

// ── Admin: Users ─────────────────────────────────────────────────────────────

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: string;
  group: string | null;
  teacherName: string | null;
}

export async function getUsers(): Promise<UserDto[]> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to load users');
  return response.json();
}

export async function updateUserRole(id: number, role: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to update role');
  }
}

export async function updateUserTeacherName(id: number, teacherName: string | null): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/admin/users/${id}/teacher-name`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherName }),
  });
  if (!r.ok) throw new Error(await r.text() || 'Failed to update teacher name');
}

export async function deleteUser(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to delete user');
  }
}

export async function getGroups(): Promise<GroupItemDto[]> {
  const response = await fetch(`${API_BASE_URL}/schedule/groups`, {
    credentials: 'include',
  });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('Failed to load groups');
  return response.json();
}

// ── Teacher workload ──────────────────────────────────────────────────────────

export interface TeacherWorkloadDto {
  teacherName: string;
  oddWeekSlots: number;
  evenWeekSlots: number;
  totalPerCycle: number;
  subjectCount: number;
  subjects: string[];
  groupCount: number;
}

export async function getTeacherWorkload(teacherName: string): Promise<TeacherWorkloadDto> {
  const r = await fetch(`${API_BASE_URL}/teachers/workload?teacherName=${encodeURIComponent(teacherName)}`, {
    credentials: 'include',
  });
  if (!r.ok) throw new Error(await r.text() || 'Failed to load workload');
  return r.json();
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationDto[]> {
  const r = await fetch(`${API_BASE_URL}/notifications`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to load notifications');
  return r.json();
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PUT', credentials: 'include' });
}

export async function deleteNotification(id: string): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
}

// ── Cancellations ─────────────────────────────────────────────────────────────

export interface ClassCancellationDto {
  id: string;
  semesterId: number;
  groupId: number;
  date: string;
  semesterClassId: number;
  reason: string | null;
  meetingLink: string | null;
  createdAt: string;
}

export interface CreateCancellationRequest {
  semesterId: number;
  groupId: number;
  date: string;
  semesterClassId: number;
  reason?: string;
  meetingLink?: string;
}

export async function getCancellations(semesterId: number, groupId?: number, from?: string, to?: string): Promise<ClassCancellationDto[]> {
  const params = new URLSearchParams({ semesterId: String(semesterId) });
  if (groupId != null) params.set('groupId', String(groupId));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const r = await fetch(`${API_BASE_URL}/cancellations?${params}`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to load cancellations');
  return r.json();
}

export async function getCancellationsByTeacher(semesterId: number, teacherName: string): Promise<ClassCancellationDto[]> {
  const params = new URLSearchParams({ semesterId: String(semesterId), teacherName });
  const r = await fetch(`${API_BASE_URL}/cancellations?${params}`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to load cancellations');
  return r.json();
}

export async function createCancellation(req: CreateCancellationRequest): Promise<{ id: string }> {
  const r = await fetch(`${API_BASE_URL}/cancellations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || 'Failed to create cancellation');
  }
  return r.json();
}

export async function deleteCancellation(id: string): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/cancellations/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!r.ok) throw new Error('Failed to delete cancellation');
}

// ── Semester Classes ──────────────────────────────────────────────────────────

export interface SemesterClassItemDto {
  id: number;
  className: string | null;
  startTime: string | null;
  endTime: string | null;
}

export async function getSemesterClasses(): Promise<SemesterClassItemDto[]> {
  const r = await fetch(`${API_BASE_URL}/semester-classes`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to load semester classes');
  return r.json();
}

// ── Free Rooms ────────────────────────────────────────────────────────────────

export interface FreeRoomsDto {
  date: string;
  weekType: string;
  dayName: string;
  slot: { semesterClassId: number; className: string | null; startTime: string | null; endTime: string | null } | null;
  freeRooms: { id: number; name: string }[];
}

export async function getFreeRooms(date: string, semesterClassId: number): Promise<FreeRoomsDto> {
  const params = new URLSearchParams({ date, semesterClassId: String(semesterClassId) });
  const r = await fetch(`${API_BASE_URL}/rooms/free?${params}`, { credentials: 'include' });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || 'Failed to load free rooms');
  }
  return r.json();
}
