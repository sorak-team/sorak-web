import { create } from 'zustand';
import { accountsApi } from './accounts.api';

export const initialStaffAccounts = [];

export const initialParentAccounts = [];

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

export function getAccountClassTier(acc) {
  if (!acc) return 999;
  const rawAgeGroup = String(acc.ageGroup || acc.studentProfile?.ageGroup || '').trim();
  if (CLASS_TIER_WEIGHTS[rawAgeGroup.toUpperCase()]) {
    return CLASS_TIER_WEIGHTS[rawAgeGroup.toUpperCase()];
  }
  if (CLASS_TIER_WEIGHTS[rawAgeGroup.toLowerCase()]) {
    return CLASS_TIER_WEIGHTS[rawAgeGroup.toLowerCase()];
  }

  const name = String(acc.studentClass || acc.studentProfile?.studentClass || '').toLowerCase().trim();
  if (name.includes('nhà trẻ') || name.includes('nha tre')) return 1;
  if (name.includes('mầm') || name.includes('mam')) return 2;
  if (name.includes('chồi') || name.includes('choi')) return 3;
  if (name.includes('lá') || name.includes('la')) return 4;

  return 500;
}

export function getAccountAvatarUrl(avatar, fullNameOrCode, role) {
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
  const seed = fullNameOrCode && String(fullNameOrCode).trim() ? String(fullNameOrCode).trim() : 'User';
  if (role === 'student' || role === 'STUDENT') {
    return `https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`;
  }
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

function transformBackendAccount(acc) {
  const isStaff = acc.role === 'PRINCIPAL_BGH' || acc.role === 'ADMIN_BGH' || acc.role === 'TEACHER_GV';
  const isParent = acc.role === 'PARENT_PH' || acc.role === 'PARENT' || acc.role === 'parents';
  const roleName = (acc.role === 'PRINCIPAL_BGH' || acc.role === 'ADMIN_BGH')
    ? 'leader'
    : acc.role === 'TEACHER_GV'
    ? 'teacher'
    : isParent
    ? 'parent'
    : 'student';
  const isStudentRole = acc.role === 'STUDENT' || roleName === 'student';
  
  const rawStudentCode = acc.studentProfile?.studentCode || (isStudentRole ? acc.username : null);
  const studentCode = rawStudentCode ? String(rawStudentCode).toUpperCase() : null;
  const username = isStudentRole ? (acc.username ? String(acc.username).toUpperCase() : (studentCode || '')) : acc.username;
  const teacherCode = acc.teacherProfile?.employeeCode || (isStaff ? acc.username : null);
  
  // Use full name as seed to match getTeacherAvatarUrl in teachers.store.js
  const teacherSeed = (acc.teacherProfile?.fullName || acc.fullName || 'GV').trim();
  const parentSeed = (acc.parentProfile?.fullName || acc.fullName || 'PH').trim();
  const studentSeed = (studentCode || acc.studentProfile?.fullName || acc.fullName || 'student').trim();
  const seed = isStaff ? teacherSeed : isParent ? parentSeed : studentSeed;

  const workStatus = acc.teacherProfile
    ? acc.teacherProfile.workStatus === 'WORKING'
      ? 'working'
      : acc.teacherProfile.workStatus === 'LEAVE_OF_ABSENCE'
        ? 'on_leave'
        : 'retired'
    : 'working';

  const teacherAvatar = acc.teacherProfile?.avatarUrl || acc.avatarUrl;
  const studentAvatar = acc.studentProfile?.avatarUrl || acc.avatarUrl;
  const parentAvatar = acc.parentProfile?.avatarUrl || acc.avatarUrl;

  const avatar = isStaff
    ? (teacherAvatar && typeof teacherAvatar === 'string' && teacherAvatar.trim() !== '' && !teacherAvatar.includes('unsplash.com') && !teacherAvatar.includes('api.dicebear.com')
        ? teacherAvatar
        : getAccountAvatarUrl(null, teacherSeed, 'teacher'))
    : isParent
    ? (parentAvatar && typeof parentAvatar === 'string' && parentAvatar.trim() !== '' && !parentAvatar.includes('unsplash.com') && !parentAvatar.includes('api.dicebear.com')
        ? parentAvatar
        : getAccountAvatarUrl(null, parentSeed, 'parent'))
    : (studentAvatar && typeof studentAvatar === 'string' && studentAvatar.trim() !== '' && !studentAvatar.includes('unsplash.com')
        ? studentAvatar
        : getAccountAvatarUrl(null, studentSeed, 'student'));

  const studentClass =
    acc.studentProfile?.currentClass?.className ||
    acc.studentProfile?.studentClass ||
    acc.studentProfile?.student_enrollments?.[0]?.class?.name ||
    acc.studentProfile?.student_enrollments?.[0]?.class?.class_name ||
    acc.studentClass ||
    '';

  const ageGroup =
    acc.studentProfile?.currentClass?.ageGroup ||
    acc.studentProfile?.ageGroup ||
    acc.studentProfile?.student_enrollments?.[0]?.class?.age_group ||
    acc.ageGroup ||
    null;

  return {
    id: acc.id,
    publicId: acc.publicId,
    username,
    studentCode,
    teacherCode,
    fullName: isStaff
      ? (acc.teacherProfile?.fullName || acc.fullName || username)
      : (acc.studentProfile?.fullName || acc.fullName || username),
    studentClass,
    ageGroup,
    studentProfile: acc.studentProfile,
    teacherProfile: acc.teacherProfile,
    email: acc.email || acc.teacherProfile?.email || '',
    phone: isStaff ? (acc.phone || acc.teacherProfile?.phone || '') : (acc.phone || ''),
    role: roleName,
    rawRole: acc.role,
    position: isStaff ? (acc.teacherProfile?.position || (roleName === 'leader' ? 'Hiệu trưởng' : 'Giáo viên')) : '',
    workStatus,
    accountStatus: acc.isActive ? 'active' : 'locked',
    lastLogin: acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString('vi-VN') : null,
    createdAt: acc.createdAt ? new Date(acc.createdAt).toLocaleString('vi-VN') : '',
    activatedAt: acc.isActive ? (acc.createdAt ? new Date(acc.createdAt).toLocaleString('vi-VN') : '') : null,
    lastPasswordChange: acc.passwordChangedAt
      ? new Date(acc.passwordChangedAt).toLocaleString('vi-VN')
      : null,
    accessStatus: acc.isActive ? 'normal' : 'locked',
    department: isStaff ? 'Mầm non Sorak' : 'Phụ huynh học sinh',
    avatar,
  };
}

const STAFF_COLUMNS_STORAGE_KEY = 'sorak_accounts_staff_visible_columns';
const STUDENT_COLUMNS_STORAGE_KEY = 'sorak_accounts_student_visible_columns';

const DEFAULT_STAFF_VISIBLE_COLUMNS = {
  role: true,
  workStatus: true,
  accountStatus: true,
  lastLogin: true,
};

const DEFAULT_STUDENT_VISIBLE_COLUMNS = {
  studentClass: true,
  accountStatus: true,
  lastLogin: true,
};

function getSavedStaffVisibleColumns() {
  try {
    const raw = localStorage.getItem(STAFF_COLUMNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_STAFF_VISIBLE_COLUMNS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved visible columns for staff accounts:', e);
  }
  return DEFAULT_STAFF_VISIBLE_COLUMNS;
}

function getSavedStudentVisibleColumns() {
  try {
    const raw = localStorage.getItem(STUDENT_COLUMNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_STUDENT_VISIBLE_COLUMNS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved visible columns for student accounts:', e);
  }
  return DEFAULT_STUDENT_VISIBLE_COLUMNS;
}

export const useAccountStore = create((set, get) => ({
  staffAccounts: [],
  parentAccounts: [],
  isLoading: true,
  error: null,

  // UI state
  activeTab: 'staff', // 'staff' | 'parents'
  viewMode: 'list', // 'list' | 'grid'
  searchQuery: '',
  statusFilter: 'all', // 'all' | 'active' | 'inactive' | 'locked'
  roleFilter: 'all', // 'all' | 'leader' | 'teacher'
  currentPage: 1,
  pageSize: 5,

  staffVisibleColumns: getSavedStaffVisibleColumns(),
  studentVisibleColumns: getSavedStudentVisibleColumns(),

  // Settings drawer state
  isSettingsDrawerOpen: false,
  selectedAccountId: null,

  // Add account modal
  isAddModalOpen: false,

  // Password reset modals
  isResetPasswordConfirmOpen: false,
  resetPasswordAccount: null,
  isTemporaryPasswordModalOpen: false,
  temporaryPassword: '',

  // Lock account confirmation modal
  isLockConfirmOpen: false,
  accountToLock: null,

  // Fetch accounts from API
  fetchAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await accountsApi.list({ limit: 100 });
      if (res && Array.isArray(res.items)) {
        const staff = [];
        const parents = [];
        for (const item of res.items) {
          const transformed = transformBackendAccount(item);
          if (item.role === 'PARENT_PH') {
            parents.push(transformed);
          } else {
            staff.push(transformed);
          }
        }
        set({
          staffAccounts: staff,
          parentAccounts: parents,
          isLoading: false,
        });
      } else {
        set({ staffAccounts: [], parentAccounts: [], isLoading: false });
      }
    } catch (err) {
      console.error('API error fetching accounts:', err);
      set({
        staffAccounts: [],
        parentAccounts: [],
        isLoading: false,
        error: err.message,
      });
    }
  },

  // Actions
  setActiveTab: (activeTab) => set({ activeTab, currentPage: 1, searchQuery: '', statusFilter: 'all', roleFilter: 'all' }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, currentPage: 1 }),
  setRoleFilter: (roleFilter) => set({ roleFilter, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),

  toggleColumn: (key, targetTab) =>
    set((state) => {
      const currentTab = targetTab || state.activeTab;
      if (currentTab === 'staff') {
        const next = {
          ...state.staffVisibleColumns,
          [key]: !state.staffVisibleColumns[key],
        };
        try {
          localStorage.setItem(STAFF_COLUMNS_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist visible columns for staff accounts:', e);
        }
        return { staffVisibleColumns: next };
      } else {
        const next = {
          ...state.studentVisibleColumns,
          [key]: !state.studentVisibleColumns[key],
        };
        try {
          localStorage.setItem(STUDENT_COLUMNS_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist visible columns for student accounts:', e);
        }
        return { studentVisibleColumns: next };
      }
    }),

  openSettingsDrawer: (id) =>
    set({
      isSettingsDrawerOpen: true,
      selectedAccountId: id,
    }),

  closeSettingsDrawer: () =>
    set({
      isSettingsDrawerOpen: false,
      selectedAccountId: null,
    }),

  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),

  openResetPasswordConfirm: (account) =>
    set({
      isResetPasswordConfirmOpen: true,
      resetPasswordAccount: account,
    }),

  closeResetPasswordConfirm: () =>
    set({
      isResetPasswordConfirmOpen: false,
      resetPasswordAccount: null,
    }),

  confirmResetPassword: async () => {
    const account = get().resetPasswordAccount;
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const specials = '@#$%!';
    const u1 = upper.charAt(Math.floor(Math.random() * upper.length));
    const l1 = lower.charAt(Math.floor(Math.random() * lower.length));
    const d1 = digits.charAt(Math.floor(Math.random() * digits.length));
    const d2 = digits.charAt(Math.floor(Math.random() * digits.length));
    const s1 = specials.charAt(Math.floor(Math.random() * specials.length));
    const u2 = upper.charAt(Math.floor(Math.random() * upper.length));
    const tempPass = `Sorak@${u1}${l1}${d1}${d2}${s1}${u2}`;

    const targetId = account?.publicId || account?.id || account?.username;
    if (!targetId) {
      toast.error('Không tìm thấy tài khoản cần đặt lại mật khẩu');
      set({
        isResetPasswordConfirmOpen: false,
        resetPasswordAccount: null,
        temporaryPassword: '',
      });
      return;
    }

    try {
      await accountsApi.resetPassword(targetId, tempPass);
      set({
        isResetPasswordConfirmOpen: false,
        isTemporaryPasswordModalOpen: true,
        temporaryPassword: tempPass,
      });
    } catch (e) {
      console.error('API reset password failed:', e);
      set({
        isResetPasswordConfirmOpen: false,
        isTemporaryPasswordModalOpen: false,
        temporaryPassword: '',
        resetPasswordAccount: null,
      });
      const errMsg = e.response?.data?.message || e.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      toast.error(errMsg);
    }
  },

  closeTemporaryPasswordModal: () =>
    set({
      isTemporaryPasswordModalOpen: false,
      temporaryPassword: '',
      resetPasswordAccount: null,
    }),

  openLockConfirm: (account) => set({ isLockConfirmOpen: true, accountToLock: account }),
  closeLockConfirm: () => set({ isLockConfirmOpen: false, accountToLock: null }),

  updateAccountRole: async (id, newRole) => {
    const roleEnum = newRole === 'leader' ? 'PRINCIPAL_BGH' : 'TEACHER_GV';
    try {
      await accountsApi.update(id, { role: roleEnum });
      set((state) => ({
        staffAccounts: state.staffAccounts.map((acc) =>
          acc.id === id ? { ...acc, role: newRole } : acc,
        ),
      }));
      return true;
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message || 'Cập nhật vai trò thất bại';
      console.warn('API update role failed:', errMsg);
      throw new Error(errMsg);
    }
  },

  toggleAccountStatus: async (id) => {
    const current =
      get().staffAccounts.find((a) => a.id === id) ||
      get().parentAccounts.find((a) => a.id === id);
    const nextStatus = current?.accountStatus === 'active' ? 'locked' : 'active';
    const isActive = nextStatus === 'active';

    try {
      await accountsApi.toggleStatus(id, isActive);
      set((state) => ({
        staffAccounts: state.staffAccounts.map((acc) => {
          if (acc.id === id) {
            return { ...acc, accountStatus: nextStatus };
          }
          return acc;
        }),
        parentAccounts: state.parentAccounts.map((acc) => {
          if (acc.id === id) {
            return { ...acc, accountStatus: nextStatus };
          }
          return acc;
        }),
      }));
      return nextStatus;
    } catch (e) {
      const errMsg = e.response?.data?.message || e.message || 'Cập nhật trạng thái thất bại';
      console.warn('API toggle status failed:', errMsg);
      throw new Error(errMsg);
    }
  },

  createAccount: async (newAccount) => {
    // Backend API mapping
    const roleEnum = newAccount.role === 'leader' ? 'PRINCIPAL_BGH' : newAccount.role === 'teacher' ? 'TEACHER_GV' : 'PARENT_PH';
    const created = await accountsApi.create({
      username:
        newAccount.username ||
        newAccount.studentCode ||
        newAccount.email?.split('@')[0] ||
        (newAccount.phone ? `PH_${newAccount.phone.slice(-6)}` : `user_${Date.now()}`),
      email: newAccount.email || null,
      phone: newAccount.phone || null,
      role: roleEnum,
      isActive: newAccount.accountStatus === 'active',
      password: 'SorakPassword123!',
    });

    await get().fetchAccounts();
    set({ isAddModalOpen: false });
    return created;
  },

  createBulkAccounts: async (accountsList) => {
    for (const newAccount of accountsList) {
      const roleEnum = newAccount.role === 'leader' ? 'PRINCIPAL_BGH' : newAccount.role === 'teacher' ? 'TEACHER_GV' : 'PARENT_PH';
      await accountsApi.create({
        username:
          newAccount.username ||
          newAccount.studentCode ||
          newAccount.employeeCode ||
          newAccount.email?.split('@')[0] ||
          `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        email: newAccount.email || null,
        phone: newAccount.phone || null,
        role: roleEnum,
        isActive: newAccount.accountStatus !== 'inactive',
        password: 'SorakPassword123!',
        teacherId: newAccount.teacherId || null,
        studentId: newAccount.studentId || null,
      });
    }

    await get().fetchAccounts();
    set({ isAddModalOpen: false });
  },

  deleteAccount: async (id) => {
    try {
      await accountsApi.delete(id);
    } catch (e) {
      console.warn('API delete account failed:', e.message);
    }
    set((state) => ({
      staffAccounts: state.staffAccounts.filter((a) => a.id !== id),
      parentAccounts: state.parentAccounts.filter((a) => a.id !== id),
    }));
  },
}));
