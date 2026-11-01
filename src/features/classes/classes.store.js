import { create } from 'zustand';
import { classesApi } from './classes.api';
import { getClassPlanetUrl } from './components/ClassVisual';
import { useAcademicYearStore } from '../academic-years';

export const initialClasses = [];

export function sanitizeClassName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/^Lớp\s+/i, '').trim();
}

export function transformBackendClass(c) {
  const gradeKey = c.ageGroup ? c.ageGroup.toLowerCase().replace('_', '') : c.grade || 'nhatre';
  const gradeLabels = {
    nhatre: 'Khối Nhà trẻ',
    mam: 'Khối Mầm',
    choi: 'Khối Chồi',
    la: 'Khối Lá',
  };
  const gradeColors = {
    nhatre: 'amber',
    mam: 'blue',
    choi: 'coral',
    la: 'emerald',
  };

  return {
    id: c.id,
    publicId: c.publicId,
    classId: c.classId || c.class_id,
    name: sanitizeClassName(c.name || c.className),
    grade: gradeKey,
    ageGroup: c.ageGroup,
    schoolYearId: c.schoolYearId ? String(c.schoolYearId) : c.school_year_id ? String(c.school_year_id) : undefined,
    gradeLabel: gradeLabels[gradeKey] || c.gradeLabel || 'Khối Mầm',
    teacher: c.teacher || 'Chưa phân công',
    teachersCount: c.teachersCount !== undefined ? c.teachersCount : 1,
    capacity: c.capacity || 24,
    studentCount:
      c.studentCount !== undefined
        ? c.studentCount
        : c.studentsCount !== undefined
        ? c.studentsCount
        : c.student_enrollments?.length || c.students?.length || 0,
    remainingSlots:
      c.remainingSlots !== undefined
        ? c.remainingSlots
        : Math.max(0, (c.capacity || 24) - (c.studentCount || c.student_enrollments?.length || 0)),
    room: c.room || c.roomNumber || c.room_number || '',
    roomNumber: c.roomNumber || c.room_number || c.room || '',
    color: gradeColors[gradeKey] || c.color || 'emerald',
    avatarUrl: c.avatarUrl || getClassPlanetUrl(gradeKey, gradeColors[gradeKey]),
    transferRequestsCount: c.transferRequestsCount || 0,
    academicYear: c.academicYear || c.school_year?.name || 'Năm học 2026–2027',
    description: c.description || '',
    teachers: c.teachers || [],
  };
}

export function getGradeRank(cls) {
  const g = (cls?.grade || cls?.ageGroup || '').toLowerCase().replace(/[^a-z]/g, '');
  if (g.includes('nhatre')) return 1;
  if (g.includes('mam')) return 2;
  if (g.includes('choi')) return 3;
  if (g.includes('la')) return 4;
  return 99;
}

export function sortClassesByGrade(classList) {
  if (!Array.isArray(classList)) return [];
  return [...classList].sort((a, b) => {
    const rankA = getGradeRank(a);
    const rankB = getGradeRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || '').localeCompare(b.name || '', 'vi');
  });
}

export const useClassesStore = create((set, get) => ({
  classes: [],
  attachedClassId: (() => {
    try {
      return localStorage.getItem('sorak_attached_class_id') || null;
    } catch {
      return null;
    }
  })(),
  searchQuery: '',
  collapsedGrades: {}, // { nhatre: false, mam: false, ... }
  isLoading: false,
  isFetching: false,
  hasLoaded: false,
  lastFetchedYearId: null,
  error: null,

  // Modal / Drawer / Command Menu UI state
  isCommandMenuOpen: false,
  isDrawerOpen: false,
  drawerMode: 'create', // 'create' | 'edit'
  editingClassId: null,
  isAddModalOpen: false,
  isDeleteModalOpen: false,
  classToDelete: null,

  // Settings active tab
  activeSettingsTab: 'general', // 'general' | 'teachers' | 'students' | 'transfers' | 'export'

  // View mode
  viewMode: 'grid', // 'grid' | 'table'

  // Fetch classes from backend API
  fetchClasses: async (schoolYearId, force = false) => {
    const targetYearId =
      schoolYearId !== undefined
        ? schoolYearId
        : useAcademicYearStore.getState().selectedYearId;

    const state = get();
    // Prevent duplicate concurrent requests
    if (state.isFetching) {
      return state.classes;
    }

    set({ isLoading: true, isFetching: true, error: null });
    try {
      const params = { limit: 100 };
      if (targetYearId && targetYearId !== 'all') {
        params.schoolYearId = targetYearId;
      }
      const res = await classesApi.list(params);
      if (res && Array.isArray(res.items)) {
        const transformed = res.items.map(transformBackendClass);
        const sorted = sortClassesByGrade(transformed);
        set({
          classes: sorted,
          isLoading: false,
          isFetching: false,
          hasLoaded: true,
          lastFetchedYearId: targetYearId ?? 'all',
        });
        return sorted;
      }
      set({
        classes: [],
        isLoading: false,
        isFetching: false,
        hasLoaded: true,
        lastFetchedYearId: targetYearId ?? 'all',
      });
      return [];
    } catch (err) {
      console.error('API error fetching classes:', err);
      set({
        classes: [],
        isLoading: false,
        isFetching: false,
        hasLoaded: true,
        error: err.message,
      });
      return [];
    }
  },

  upsertClass: (classData) => {
    if (!classData) return;
    const transformed = classData.gradeLabel ? classData : transformBackendClass(classData);
    set((state) => {
      const exists = state.classes.some(
        (c) => String(c.id) === String(transformed.id) || String(c.publicId) === String(transformed.publicId)
      );
      if (exists) {
        return {
          classes: state.classes.map((c) =>
            String(c.id) === String(transformed.id) || String(c.publicId) === String(transformed.publicId)
              ? { ...c, ...transformed }
              : c
          ),
        };
      }
      return {
        classes: sortClassesByGrade([...state.classes, transformed]),
      };
    });
  },

  fetchClassById: async (id) => {
    if (!id) return null;
    try {
      const res = await classesApi.getById(id);
      if (res && (res.id || res.publicId)) {
        const transformed = transformBackendClass(res);
        get().upsertClass(transformed);
        return transformed;
      }
      return null;
    } catch (err) {
      console.error('API error fetching class by id:', err);
      return null;
    }
  },

  // Actions
  setViewMode: (viewMode) => set({ viewMode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleGradeCollapse: (gradeKey) =>
    set((state) => ({
      collapsedGrades: {
        ...state.collapsedGrades,
        [gradeKey]: !state.collapsedGrades[gradeKey],
      },
    })),

  attachClass: (id) => {
    try {
      if (id) {
        localStorage.setItem('sorak_attached_class_id', id);
      } else {
        localStorage.removeItem('sorak_attached_class_id');
      }
    } catch {}
    set({ attachedClassId: id, isCommandMenuOpen: false });
  },
  detachClass: () => {
    try {
      localStorage.removeItem('sorak_attached_class_id');
    } catch {}
    set({ attachedClassId: null, isCommandMenuOpen: false });
  },

  setCommandMenuOpen: (open) => set({ isCommandMenuOpen: open }),

  openCreateDrawer: () =>
    set({ isDrawerOpen: true, drawerMode: 'create', editingClassId: null, isAddModalOpen: true }),
  openEditDrawer: (id) =>
    set({ isDrawerOpen: true, drawerMode: 'edit', editingClassId: id, isAddModalOpen: true }),
  closeDrawer: () =>
    set({ isDrawerOpen: false, editingClassId: null, isAddModalOpen: false }),

  openAddModal: () =>
    set({ isDrawerOpen: true, drawerMode: 'create', editingClassId: null, isAddModalOpen: true }),
  closeAddModal: () =>
    set({ isDrawerOpen: false, editingClassId: null, isAddModalOpen: false }),

  openDeleteModal: (classItem) =>
    set({ isDeleteModalOpen: true, classToDelete: classItem }),
  closeDeleteModal: () =>
    set({ isDeleteModalOpen: false, classToDelete: null }),

  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),

  addClass: async (newClassData) => {
    const cleanName = sanitizeClassName(newClassData.name);
    const ageGroupMap = {
      nhatre: 'NHA_TRE',
      mam: 'MAM',
      choi: 'CHOI',
      la: 'LA',
    };
    const ageGroup = ageGroupMap[newClassData.grade] || 'MAM';

    const selectedYearId = useAcademicYearStore.getState().selectedYearId;
    const res = await classesApi.create({
      name: cleanName,
      ageGroup,
      roomNumber: newClassData.room || '',
      description: newClassData.description || null,
      schoolYearId: selectedYearId,
    });
    const created = res?.data || res;

    const id = created?.id || created?.publicId || newClassData.id || `class-${Date.now()}`;
    const gradeLabels = {
      nhatre: 'Khối Nhà trẻ',
      mam: 'Khối Mầm',
      choi: 'Khối Chồi',
      la: 'Khối Lá',
    };
    const gradeColors = {
      nhatre: 'emerald',
      mam: 'coral',
      choi: 'teal',
      la: 'indigo',
    };
    const newItem = {
      id,
      publicId: created?.publicId,
      name: cleanName,
      grade: newClassData.grade || 'nhatre',
      gradeLabel: gradeLabels[newClassData.grade] || 'Khối Nhà trẻ',
      teacher: newClassData.teacher || 'Chưa phân công',
      teachersCount: newClassData.teachersCount || (newClassData.teacher ? 1 : 0),
      studentCount: newClassData.studentCount || 0,
      room: newClassData.room || 'Phòng 101',
      description: newClassData.description || '',
      color: gradeColors[newClassData.grade] || 'emerald',
      transferRequestsCount: 0,
      academicYear: 'Năm học 2026–2027',
    };
    set((state) => ({
      classes: [...state.classes, newItem],
      isAddModalOpen: false,
    }));
    if (selectedYearId) {
      get().fetchClasses(selectedYearId);
    }
    return newItem;
  },

  updateClass: async (id, updates) => {
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.name) {
      sanitizedUpdates.name = sanitizeClassName(sanitizedUpdates.name);
    }
    try {
      const payload = {};
      if (sanitizedUpdates.name) payload.name = sanitizedUpdates.name;
      if (sanitizedUpdates.room) payload.roomNumber = sanitizedUpdates.room;
      if (sanitizedUpdates.description !== undefined) payload.description = sanitizedUpdates.description || null;
      if (sanitizedUpdates.grade) {
        const ageGroupMap = { nhatre: 'NHA_TRE', mam: 'MAM', choi: 'CHOI', la: 'LA' };
        payload.ageGroup = ageGroupMap[sanitizedUpdates.grade] || 'MAM';
      }

      await classesApi.update(id, payload);
    } catch (e) {
      console.warn('API update class failed:', e.message);
      throw e;
    }

    set((state) => ({
      classes: state.classes.map((cls) =>
        cls.id === id ? { ...cls, ...sanitizedUpdates } : cls,
      ),
    }));
  },

  deleteClass: async (id) => {
    await classesApi.delete(id);

    if (get().attachedClassId === id) {
      try {
        localStorage.removeItem('sorak_attached_class_id');
      } catch {}
    }

    set((state) => ({
      classes: state.classes.filter((cls) => cls.id !== id && cls.publicId !== id),
      attachedClassId:
        state.attachedClassId === id ? null : state.attachedClassId,
      isDeleteModalOpen: false,
      classToDelete: null,
    }));
  },

  assignTeacherToClass: async (classId, teacherId) => {
    try {
      await classesApi.assignTeacher(classId, { teacherId });
      get().fetchClasses();
    } catch (e) {
      console.warn('API assign teacher failed:', e.message);
    }
  },

  removeTeacherFromClass: async (classId, teacherId) => {
    try {
      await classesApi.removeTeacher(classId, teacherId);
      get().fetchClasses();
    } catch (e) {
      console.warn('API remove teacher failed:', e.message);
    }
  },
}));

/**
 * Find classes that a teacher teaches in a given school year
 */
export function findTeacherClassesForYear(user, classes, yearId) {
  const isTeacher =
    user?.role === 'TEACHER_GV' ||
    user?.role === 'TEACHER' ||
    user?.role?.toLowerCase()?.includes('teacher');

  if (!user || !isTeacher) return [];
  if (!Array.isArray(classes) || classes.length === 0) return [];

  const yearClasses = yearId
    ? classes.filter((c) => String(c.schoolYearId) === String(yearId))
    : classes;
  const pool = yearId ? yearClasses : classes;
  if (pool.length === 0) return [];

  const userTeacherIds = [
    user.id,
    user.teacherId,
    user.teacher?.id,
    user.publicId,
    user.teacher?.publicId,
  ]
    .filter(Boolean)
    .map(String);

  const matched = pool.filter((c) => {
    // 1. Direct name match
    if (user.fullName && (c.teacher === user.fullName || c.teacher === user.name)) return true;
    if (user.name && (c.teacher === user.name || c.teacher === user.fullName)) return true;

    // 2. Direct teacherId match
    if (c.teacherId && userTeacherIds.includes(String(c.teacherId))) return true;

    // 3. Teachers array match
    if (Array.isArray(c.teachers) && c.teachers.length > 0) {
      if (
        c.teachers.some((t) => {
          const tIds = [t.id, t.teacherId, t.publicId].filter(Boolean).map(String);
          const idMatch = tIds.some((tid) => userTeacherIds.includes(tid));
          const codeMatch =
            user.employeeCode &&
            t.employeeCode &&
            String(user.employeeCode).toLowerCase() === String(t.employeeCode).toLowerCase();
          const nameMatch =
            user.fullName &&
            (t.fullName === user.fullName ||
              t.name === user.fullName ||
              t.fullName === user.name);
          return idMatch || codeMatch || nameMatch;
        })
      ) {
        return true;
      }
    }

    // 4. Assigned classes in user profile
    if (Array.isArray(user.assignedClasses) && user.assignedClasses.length > 0) {
      if (
        user.assignedClasses.some((ac) => {
          const classMatch =
            String(ac.classId) === String(c.id) ||
            String(ac.classId) === String(c.publicId) ||
            (ac.className && ac.className.toLowerCase() === c.name?.toLowerCase());
          const yearMatch =
            !ac.schoolYearId || !yearId || String(ac.schoolYearId) === String(yearId);
          return classMatch && yearMatch;
        })
      ) {
        return true;
      }
    }
    return false;
  });

  return matched;
}

/**
 * Find the primary/current class a teacher teaches in a given school year
 */
export function findTeacherClassForYear(user, classes, yearId) {
  const teacherClasses = findTeacherClassesForYear(user, classes, yearId);
  if (teacherClasses.length > 0) {
    const matched = teacherClasses.find((c) => {
      if (c.teacher && (c.teacher === user?.fullName || c.teacher === user?.name || (user?.fullName && c.teacher.includes(user.fullName)) || (user?.name && c.teacher.includes(user.name)))) return true;
      if (Array.isArray(c.teachers) && c.teachers.some((t) => t.fullName === user?.fullName || t.teacherId === user?.teacherId)) return true;
      if (Array.isArray(user?.assignedClasses)) {
        const ac = user.assignedClasses.find(
          (a) => String(a.classId) === String(c.id) || String(a.classId) === String(c.publicId)
        );
        if (ac) return true;
      }
      return false;
    });
    return matched || teacherClasses[0];
  }
  return null;
}
