import { create } from 'zustand';
import { teachersApi } from './teachers.api';

function toDisplayDate(iso) {
  if (!iso) return '';
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function toIsoDate(dmy) {
  if (!dmy) return new Date().toISOString().split('T')[0];
  const parts = dmy.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dmy;
}

export function getTeacherAvatarUrl(avatar, fullName) {
  if (
    avatar &&
    typeof avatar === 'string' &&
    avatar.trim() !== '' &&
    !avatar.includes('default-avatar.webp') &&
    !avatar.includes('unsplash.com') &&
    !avatar.includes('api.dicebear.com')
  ) {
    return avatar;
  }
  const seed = fullName && fullName.trim() ? fullName.trim() : 'GV';
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}


export function generateTeacherCode(existingTeachers = [], joinDate) {
  let joinYear;
  if (typeof joinDate === 'string' && joinDate.includes('/')) {
    const parts = joinDate.split('/');
    if (parts.length === 3) joinYear = parseInt(parts[2], 10);
  } else if (joinDate) {
    const parsed = new Date(joinDate).getFullYear();
    if (!isNaN(parsed)) joinYear = parsed;
  }
  // Quy tắc: Mã số cán bộ tối thiểu là từ năm 2000 (CB00xxx)
  if (!joinYear || isNaN(joinYear)) {
    joinYear = new Date().getFullYear();
  } else if (joinYear < 2000) {
    joinYear = 2000;
  }

  const yearSuffix = String(joinYear).slice(-2);
  const prefix = `CB${yearSuffix}`;

  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}(\\d{3})$`, 'i');
  for (const t of existingTeachers) {
    const code = typeof t === 'string' ? t : (t?.employeeCode || t?.code || t?.username);
    const match = String(code || '').trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${nextSeq}`;
}

export const initialTeachers = [];

function transformBackendTeacher(t) {
  const status =
    t.workStatus === 'WORKING'
      ? 'active'
      : t.workStatus === 'LEAVE_OF_ABSENCE'
        ? 'on_leave'
        : 'resigned';

  const fullName = t.fullName || t.name || '';
  const avatar = getTeacherAvatarUrl(t.avatarUrl || t.account?.avatarUrl || t.avatar, fullName);

  return {
    id: t.id,
    publicId: t.publicId,
    employeeCode: t.employeeCode,
    fullName,
    role: t.position || 'Giáo viên',
    position: t.position || 'Giáo viên',
    status,
    citizenId: t.citizenId || '',
    address: t.address || '',
    email: t.email || t.account?.email || '',
    phone: t.phone || t.account?.phone || '',
    gender: t.gender === 'MALE' ? 'Nam' : 'Nữ',
    dob: toDisplayDate(t.dateOfBirth),
    joinDate: toDisplayDate(t.startDate),
    avatar,
    account: t.account || null,
    assignedClasses: (t.assignedClasses || []).map((ac) => ({
      ...ac,
      className: (ac.className || ac.class?.name || '').replace(/^Lớp\s+/i, '').trim(),
    })),
  };
}

const TEACHER_COLUMNS_STORAGE_KEY = 'sorak_teachers_visible_columns';

const DEFAULT_TEACHER_VISIBLE_COLUMNS = {
  status: true,
  email: true,
  phone: true,
  gender: true,
  dob: true,
  position: true,
  joinDate: true,
};

function getSavedTeacherVisibleColumns() {
  try {
    const raw = localStorage.getItem(TEACHER_COLUMNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_TEACHER_VISIBLE_COLUMNS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved visible columns for teachers:', e);
  }
  return DEFAULT_TEACHER_VISIBLE_COLUMNS;
}

export const useTeacherStore = create((set, get) => ({
  teachers: [],
  isLoading: true,
  error: null,

  // Filters & State
  viewMode: 'list', // 'list' | 'grid'
  searchQuery: '',
  statusFilter: 'all', // 'all' | 'active' | 'on_leave' | 'resigned'
  currentPage: 1,
  pageSize: 6,

  visibleColumns: getSavedTeacherVisibleColumns(),

  // Drawer & Dialog State
  isDrawerOpen: false,
  drawerMode: 'create', // 'create' | 'edit'
  editingTeacherId: null,

  isDeleteDialogOpen: false,
  deletingTeacherId: null,

  // Fetch teachers from backend
  fetchTeachers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await teachersApi.list({ limit: 100 });
      if (res && Array.isArray(res.items)) {
        const transformed = res.items.map(transformBackendTeacher);
        set({
          teachers: transformed,
          isLoading: false,
        });
      } else {
        set({ teachers: [], isLoading: false });
      }
    } catch (err) {
      console.error('API error fetching teachers:', err);
      set({ teachers: [], isLoading: false, error: err.message });
    }
  },

  // Actions
  setViewMode: (viewMode) => set({ viewMode }),
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),

  toggleColumn: (columnKey) =>
    set((state) => {
      const next = {
        ...state.visibleColumns,
        [columnKey]: !state.visibleColumns[columnKey],
      };
      try {
        localStorage.setItem(TEACHER_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist visible columns for teachers:', e);
      }
      return { visibleColumns: next };
    }),

  openCreateDrawer: () =>
    set({
      isDrawerOpen: true,
      drawerMode: 'create',
      editingTeacherId: null,
    }),

  openEditDrawer: (id) =>
    set({
      isDrawerOpen: true,
      drawerMode: 'edit',
      editingTeacherId: id,
    }),

  closeDrawer: () =>
    set({
      isDrawerOpen: false,
      editingTeacherId: null,
    }),

  openDeleteDialog: (id) =>
    set({
      isDeleteDialogOpen: true,
      deletingTeacherId: id,
    }),

  closeDeleteDialog: () =>
    set({
      isDeleteDialogOpen: false,
      deletingTeacherId: null,
    }),

  createTeacher: async (newTeacher) => {
    // Call backend API
    try {
      const workStatus =
        newTeacher.status === 'on_leave'
          ? 'LEAVE_OF_ABSENCE'
          : newTeacher.status === 'resigned'
            ? 'RESIGNED'
            : 'WORKING';

      await teachersApi.create({
        employeeCode: newTeacher.employeeCode || `GV${String(Date.now()).slice(-4)}`,
        fullName: newTeacher.fullName,
        dateOfBirth: toIsoDate(newTeacher.dob),
        gender: newTeacher.gender === 'Nam' ? 'MALE' : 'FEMALE',
        citizenId: newTeacher.citizenId || `079${String(Date.now()).slice(-9)}`,
        address: newTeacher.address || null,
        position: newTeacher.role || 'Giáo viên',
        workStatus,
        startDate: toIsoDate(newTeacher.joinDate),
        email: newTeacher.email,
        phone: newTeacher.phone,
        avatarUrl: newTeacher.avatar || undefined,
      });
    } catch (e) {
      console.warn('API create teacher failed, keeping local:', e.message);
    }

    const fullName = newTeacher.fullName || '';
    const teacher = {
      ...newTeacher,
      id: String(Date.now()),
      employeeCode: newTeacher.employeeCode || `GV${String(Date.now()).slice(-4)}`,
      role: newTeacher.role || 'Giáo viên',
      avatar: getTeacherAvatarUrl(newTeacher.avatar, fullName),
    };
    set((state) => ({
      teachers: [teacher, ...state.teachers],
      isDrawerOpen: false,
    }));
  },

  updateTeacher: async (id, updatedFields) => {
    try {
      const payload = {};
      if (updatedFields.fullName) payload.fullName = updatedFields.fullName;
      if (updatedFields.dob) payload.dateOfBirth = toIsoDate(updatedFields.dob);
      if (updatedFields.gender) payload.gender = updatedFields.gender === 'Nam' ? 'MALE' : 'FEMALE';
      if (updatedFields.role) payload.position = updatedFields.role;
      if (updatedFields.email) payload.email = updatedFields.email;
      if (updatedFields.phone) payload.phone = updatedFields.phone;
      if (updatedFields.citizenId) payload.citizenId = updatedFields.citizenId;
      if (updatedFields.address) payload.address = updatedFields.address;
      if (updatedFields.avatar !== undefined) payload.avatarUrl = updatedFields.avatar;
      if (updatedFields.status) {
        payload.workStatus =
          updatedFields.status === 'on_leave'
            ? 'LEAVE_OF_ABSENCE'
            : updatedFields.status === 'resigned'
              ? 'RESIGNED'
              : 'WORKING';
      }

      await teachersApi.update(id, payload);
    } catch (e) {
      console.warn('API update teacher failed:', e.message);
    }

    set((state) => ({
      teachers: state.teachers.map((t) =>
        t.id === id ? { ...t, ...updatedFields } : t,
      ),
      isDrawerOpen: false,
      editingTeacherId: null,
    }));
  },

  deleteTeacher: async (id) => {
    try {
      await teachersApi.delete(id);
    } catch (e) {
      console.warn('API delete teacher failed:', e.message);
    }

    set((state) => ({
      teachers: state.teachers.filter((t) => t.id !== id),
      isDeleteDialogOpen: false,
      deletingTeacherId: null,
    }));
  },

  assignClass: async (teacherId, payload) => {
    try {
      await teachersApi.assignClass(teacherId, payload);
    } catch (e) {
      console.warn('API assign class failed:', e.message);
    }
  },

  removeClass: async (teacherId, classId) => {
    try {
      await teachersApi.removeClass(teacherId, classId);
    } catch (e) {
      console.warn('API remove class failed:', e.message);
    }
  },
}));
