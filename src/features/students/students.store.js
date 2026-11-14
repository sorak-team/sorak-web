import { create } from 'zustand';
import { studentsApi } from './students.api';
import { useAcademicYearStore } from '@/features/academic-years';

export function toDisplayDate(iso) {
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

export const STUDENT_DICEBEAR_BG = 'ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676';

export function getStudentAvatarUrl(avatar, studentCodeOrName) {
  if (
    avatar &&
    typeof avatar === 'string' &&
    avatar.trim() !== '' &&
    !avatar.includes('api.dicebear.com') &&
    !avatar.includes('default-avatar.webp') &&
    !avatar.includes('unsplash.com')
  ) {
    return avatar;
  }

  let seed = (studentCodeOrName || '').toString().trim();
  if (!seed && avatar && typeof avatar === 'string' && avatar.includes('api.dicebear.com')) {
    try {
      const parsedUrl = new URL(avatar);
      seed = parsedUrl.searchParams.get('seed') || '';
    } catch {
      // ignore
    }
  }

  seed = seed || 'student';
  return `https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${STUDENT_DICEBEAR_BG}`;
}

export const CLASS_TIER_WEIGHTS = {
  NHA_TRE: 1,
  MAM: 2,
  CHOI: 3,
  LA: 4,
  nhatre: 1,
  mam: 2,
  choi: 3,
  la: 4,
};

export function getStudentClassTier(student) {
  if (!student || !student.currentClass) return 999;

  const rawAgeGroup = String(student.currentClass.ageGroup || '').trim();
  if (CLASS_TIER_WEIGHTS[rawAgeGroup.toUpperCase()]) {
    return CLASS_TIER_WEIGHTS[rawAgeGroup.toUpperCase()];
  }
  if (CLASS_TIER_WEIGHTS[rawAgeGroup.toLowerCase()]) {
    return CLASS_TIER_WEIGHTS[rawAgeGroup.toLowerCase()];
  }

  const name = String(student.currentClass.className || student.currentClass.name || '').toLowerCase().trim();
  if (name.includes('nhà trẻ') || name.includes('nha tre')) return 1;
  if (name.includes('mầm') || name.includes('mam')) return 2;
  if (name.includes('chồi') || name.includes('choi')) return 3;
  if (name.includes('lá') || name.includes('la')) return 4;

  return 500;
}

export function sortStudentsByClassTier(a, b) {
  // 1. Priority 1: Năm học (School Year - Năm mới nhất lên trước, nhóm theo năm)
  const yearA = String(a.currentClass?.schoolYearName || a.enrollmentHistory?.[0]?.schoolYearName || '').trim();
  const yearB = String(b.currentClass?.schoolYearName || b.enrollmentHistory?.[0]?.schoolYearName || '').trim();

  if (yearA !== yearB) {
    if (!yearA) return 1;
    if (!yearB) return -1;
    const matchA = yearA.match(/\b(20\d\d)\b/);
    const matchB = yearB.match(/\b(20\d\d)\b/);
    const numA = matchA ? parseInt(matchA[1], 10) : 0;
    const numB = matchB ? parseInt(matchB[1], 10) : 0;
    if (numA !== numB) {
      return numB - numA; // Năm mới nhất (2026–2027) lên trước năm cũ
    }
    const yearComp = yearB.localeCompare(yearA, 'vi');
    if (yearComp !== 0) return yearComp;
  }

  // 2. Priority 2: Khối nhỏ đến lớn (1: Nhà trẻ -> 2: Mầm -> 3: Chồi -> 4: Lá -> 999: Chưa phân lớp)
  const tierA = getStudentClassTier(a);
  const tierB = getStudentClassTier(b);

  if (tierA !== tierB) {
    return tierA - tierB;
  }

  // 3. Priority 3: Mã số học sinh nhỏ đến lớn (HS26001, HS26002, ...)
  const codeA = String(a.studentCode || a.code || '').trim();
  const codeB = String(b.studentCode || b.code || '').trim();
  const codeComp = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  if (codeComp !== 0) return codeComp;

  // 4. Same code: Tên lớp học
  const classNameA = String(a.currentClass?.className || a.currentClass?.name || '').trim();
  const classNameB = String(b.currentClass?.className || b.currentClass?.name || '').trim();
  const classComp = classNameA.localeCompare(classNameB, 'vi');
  if (classComp !== 0) return classComp;

  // 5. Tên học sinh
  const nameA = String(a.fullName || '').trim();
  const nameB = String(b.fullName || '').trim();
  return nameA.localeCompare(nameB, 'vi');
}

export function generateStudentCode({
  joinDate,
  enrollmentDate,
  schoolYearStartYear,
  existingStudents = [],
}) {
  let admissionYear;
  const rawDate = joinDate || enrollmentDate;
  if (rawDate) {
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) admissionYear = parseInt(parts[2], 10);
    } else {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) admissionYear = d.getFullYear();
    }
  }

  if (!admissionYear || isNaN(admissionYear)) {
    admissionYear = schoolYearStartYear || new Date().getFullYear();
  }

  // Quy tắc: Mã số học sinh tối thiểu là từ năm 2000 (HS00xxx)
  if (admissionYear < 2000) {
    admissionYear = 2000;
  }

  const yearSuffix = String(admissionYear).slice(-2);
  const prefix = `HS${yearSuffix}`;

  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}(\\d{3})$`, 'i');
  for (const s of existingStudents) {
    const code = typeof s === 'string' ? s : (s?.studentCode || s?.code);
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

export const initialStudents = [];

export function transformBackendStudent(s) {
  if (!s) return null;
  const statusMap = {
    STUDYING: 'studying',
    RESERVED: 'reserved',
    TRANSFERRED: 'transferred',
    DROPPED_OUT: 'dropped_out',
    GRADUATED: 'graduated',
  };
  const statusKey = String(s.status || '').toUpperCase();
  const isMale = s.gender === 'MALE' || s.gender === 'Nam' || s.gender === 'nam';
  const isFemale = s.gender === 'FEMALE' || s.gender === 'Nữ' || s.gender === 'nu';

  return {
    id: s.id,
    publicId: s.publicId,
    studentCode: s.studentCode ? String(s.studentCode).toUpperCase() : '',
    fullName: s.fullName,
    dateOfBirth: s.dateOfBirth,
    dob: s.dob || toDisplayDate(s.dateOfBirth),
    gender: isMale ? 'Nam' : isFemale ? 'Nữ' : s.gender || '—',
    ethnic: s.ethnic || 'Kinh',
    nationality: s.nationality || 'Việt Nam',
    placeOfBirth: s.placeOfBirth || '',
    permanentResidence: s.permanentResidence || '',
    currentResidence: s.currentResidence || '',
    status: statusMap[statusKey] || s.status || 'studying',
    enrollmentDate: s.enrollmentDate,
    joinDate: s.joinDate || toDisplayDate(s.enrollmentDate),
    allergyNotes: s.allergyNotes || '',
    medicalNotes: s.medicalNotes || '',
    previousSchool: s.previousSchool || s.notes || '',
    notes: s.previousSchool || s.notes || '',
    avatar: getStudentAvatarUrl(s.avatarUrl || s.avatar, s.studentCode || s.fullName),
    currentClass: s.currentClass
      ? {
          classId: s.currentClass.classId,
          className: s.currentClass.className,
          roomNumber: s.currentClass.roomNumber,
          ageGroup: s.currentClass.ageGroup,
          schoolYearName: s.currentClass.schoolYearName,
        }
      : null,
    primaryParent: s.primaryParent
      ? {
          fullName: s.primaryParent.fullName,
          relationship: s.primaryParent.relationship,
          phone: s.primaryParent.phone,
        }
      : s.parents?.[0]
        ? {
            fullName: s.parents[0].fullName,
            relationship: s.parents[0].relationship,
            phone: s.parents[0].phone,
          }
        : null,
    parents: s.parents || [],
    account: s.account || null,
    enrollmentHistory: s.enrollmentHistory || [],
    transferHistory: s.transferHistory || [],
  };
}

const STUDENT_COLUMNS_STORAGE_KEY = 'sorak_students_visible_columns';

const DEFAULT_STUDENT_VISIBLE_COLUMNS = {
  currentClass: true,
  status: true,
  gender: true,
  age: true,
  joinDate: true,
  leftAt: true,
  notes: false,
};

function getSavedStudentVisibleColumns() {
  try {
    const raw = localStorage.getItem(STUDENT_COLUMNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_STUDENT_VISIBLE_COLUMNS,
          ...parsed,
          leftAt: parsed.leftAt !== undefined ? parsed.leftAt : true,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved visible columns for students:', e);
  }
  return DEFAULT_STUDENT_VISIBLE_COLUMNS;
}

export const useStudentStore = create((set, get) => ({
  // Core Data
  students: [],
  isLoading: true,
  error: null,

  // View & Filter States
  viewMode: 'list', // 'list' | 'grid'
  searchQuery: '',
  statusFilter: 'all', // 'all' | 'studying' | 'reserved' | 'transferred' | 'dropped_out' | 'graduated'
  genderFilter: 'all', // 'all' | 'male' | 'female'
  classFilter: 'all',

  // Pagination
  currentPage: 1,
  pageSize: 10,

  // Table Column Visibility
  visibleColumns: getSavedStudentVisibleColumns(),

  // Drawer (Create & Edit) State
  isDrawerOpen: false,
  drawerMode: 'create', // 'create' | 'edit'
  editingStudentId: null,

  // Delete Dialog State
  isDeleteDialogOpen: false,
  studentToDelete: null,

  // Transfer Dialog State
  isTransferDialogOpen: false,
  studentToTransfer: null,

  // Setters
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
  setStatusFilter: (status) => set({ statusFilter: status, currentPage: 1 }),
  setGenderFilter: (gender) => set({ genderFilter: gender, currentPage: 1 }),
  setClassFilter: (classId) => set({ classFilter: classId, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

  toggleColumn: (columnKey) =>
    set((state) => {
      const next = {
        ...state.visibleColumns,
        [columnKey]: !state.visibleColumns[columnKey],
      };
      try {
        localStorage.setItem(STUDENT_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to persist visible columns for students:', e);
      }
      return { visibleColumns: next };
    }),

  // Drawer Actions
  openCreateDrawer: () =>
    set({
      isDrawerOpen: true,
      drawerMode: 'create',
      editingStudentId: null,
    }),

  openEditDrawer: (id) =>
    set({
      isDrawerOpen: true,
      drawerMode: 'edit',
      editingStudentId: id,
    }),

  closeDrawer: () =>
    set({
      isDrawerOpen: false,
      editingStudentId: null,
    }),

  // Delete Dialog Actions
  openDeleteDialog: (student) =>
    set({
      isDeleteDialogOpen: true,
      studentToDelete: student,
    }),

  closeDeleteDialog: () =>
    set({
      isDeleteDialogOpen: false,
      studentToDelete: null,
    }),

  // Transfer Dialog Actions
  openTransferDialog: (student) =>
    set({
      isTransferDialogOpen: true,
      studentToTransfer: student,
    }),

  closeTransferDialog: () =>
    set({
      isTransferDialogOpen: false,
      studentToTransfer: null,
    }),

  // API Integration: Fetch Students
  fetchStudents: async (arg) => {
    set({ isLoading: true, error: null });
    try {
      const yearFromArg = typeof arg === 'object' ? arg?.schoolYearId : arg;
      const targetYearId =
        yearFromArg !== undefined
          ? yearFromArg
          : useAcademicYearStore.getState().selectedYearId;
      const params = { limit: 250 };
      if (targetYearId && targetYearId !== 'all') {
        params.schoolYearId = targetYearId;
      }
      const data = await studentsApi.list(params);
      if (data && data.items && data.items.length > 0) {
        const transformed = data.items.map(transformBackendStudent);
        transformed.sort(sortStudentsByClassTier);
        set({ students: transformed, isLoading: false });
      } else {
        set({ students: [], isLoading: false });
      }
    } catch (err) {
      console.error('API error fetching students:', err);
      set({ students: [], isLoading: false, error: err.message });
    }
  },

  // API Integration: Create Student
  createStudent: async (payload) => {
    const backendPayload = {
      studentCode: payload.studentCode,
      fullName: payload.fullName,
      dateOfBirth: toIsoDate(payload.dob),
      gender: payload.gender === 'Nam' ? 'MALE' : 'FEMALE',
      ethnic: payload.ethnic || 'Kinh',
      nationality: payload.nationality || 'Việt Nam',
      placeOfBirth: payload.placeOfBirth,
      permanentResidence: payload.permanentResidence,
      currentResidence: payload.currentResidence,
      status: (payload.status || 'studying').toUpperCase(),
      enrollmentDate: toIsoDate(payload.joinDate),
      allergyNotes: payload.allergyNotes,
      medicalNotes: payload.medicalNotes,
      previousSchool: payload.previousSchool || payload.notes || undefined,
      classId: payload.classId || undefined,
      parents: payload.parents || [],
      avatarUrl: payload.avatar || getStudentAvatarUrl(null, payload.studentCode || payload.fullName),
    };

    const result = await studentsApi.create(backendPayload);
    if (result) {
      const transformed = transformBackendStudent(result);
      set((state) => ({
        students: [transformed, ...state.students],
        isDrawerOpen: false,
      }));
      return transformed;
    }
  },

  // API Integration: Update Student
  updateStudent: async (id, payload) => {
    const backendPayload = {
      fullName: payload.fullName,
      dateOfBirth: payload.dob ? toIsoDate(payload.dob) : undefined,
      gender: payload.gender ? (payload.gender === 'Nam' ? 'MALE' : 'FEMALE') : undefined,
      ethnic: payload.ethnic,
      nationality: payload.nationality,
      placeOfBirth: payload.placeOfBirth,
      permanentResidence: payload.permanentResidence,
      currentResidence: payload.currentResidence,
      status: payload.status ? payload.status.toUpperCase() : undefined,
      enrollmentDate: payload.joinDate ? toIsoDate(payload.joinDate) : undefined,
      allergyNotes: payload.allergyNotes,
      medicalNotes: payload.medicalNotes,
      previousSchool: payload.previousSchool !== undefined ? payload.previousSchool : payload.notes,
      avatarUrl: payload.avatar,
      parents: payload.parents || undefined,
    };

    const result = await studentsApi.update(id, backendPayload);
    if (result) {
      const transformed = transformBackendStudent(result);
      set((state) => ({
        students: state.students.map((item) => (item.id === id || item.publicId === id ? transformed : item)),
        detailStudent: (state.detailStudent?.id === id || state.detailStudent?.publicId === id) ? transformed : state.detailStudent,
        isDrawerOpen: false,
      }));
      return transformed;
    }
  },

  // API Integration: Delete Student
  deleteStudent: async (id) => {
    await studentsApi.delete(id);

    set((state) => ({
      students: state.students.filter((item) => item.id !== id && item.publicId !== id),
      isDeleteDialogOpen: false,
      studentToDelete: null,
    }));
  },

  // API Integration: Request Class Transfer for Student (Creates PENDING transfer request)
  transferStudent: async (studentId, fromClassId, toClassId, targetClassName, reason, transferDate) => {
    let result = null;
    try {
      result = await studentsApi.transfer(studentId, {
        fromClassId,
        toClassId,
        reason,
        transferDate: transferDate || new Date().toISOString(),
        autoApprove: false,
      });
    } catch (err) {
      console.warn('Backend API transfer request failed:', err);
      throw err;
    }

    // Student remains in current class until request is approved by BGH
    // Append the pending transfer request to the student's transfer history in local state
    set((state) => ({
      students: state.students.map((item) => {
        if (String(item.id) === String(studentId)) {
          if (result && result.transferHistory) {
            return {
              ...item,
              ...transformBackendStudent(result),
              // Ensure currentClass is definitely preserved as current active enrollment
              currentClass: item.currentClass,
            };
          }
          const newTransfer = {
            transferId: String(Date.now()),
            fromClass: {
              classId: fromClassId,
              name: item.currentClass?.className || 'Lớp hiện tại',
            },
            toClass: {
              classId: toClassId,
              name: targetClassName,
            },
            transferDate: transferDate || new Date().toISOString(),
            reason: reason || '',
            status: 'PENDING',
            createdBy: 'Người dùng',
          };
          return {
            ...item,
            transferHistory: [newTransfer, ...(item.transferHistory || [])],
          };
        }
        return item;
      }),
      isTransferDialogOpen: false,
      studentToTransfer: null,
    }));
  },
}));

export default useStudentStore;
