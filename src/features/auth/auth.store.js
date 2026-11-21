import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export function isBghRole(role) {
  if (!role) return false;
  const upper = String(role).toUpperCase();
  return (
    upper === 'PRINCIPAL_BGH' ||
    upper === 'ADMIN_BGH' ||
    upper === 'ADMIN' ||
    upper.includes('BGH') ||
    upper.includes('PRINCIPAL')
  );
}

export function isTeacherRole(role) {
  if (!role) return false;
  const upper = String(role).toUpperCase();
  return (
    upper === 'TEACHER_GV' ||
    upper === 'TEACHER' ||
    upper.includes('TEACHER') ||
    upper.includes('GV')
  );
}

export function isParentRole(role) {
  if (!role) return false;
  const upper = String(role).toUpperCase();
  return (
    upper === 'PARENT_PH' ||
    upper === 'PARENT' ||
    upper.includes('PARENT') ||
    upper.includes('PH')
  );
}

// Helper: Determine if two user objects represent the exact same child
const isSameChild = (u1, u2) => {
  if (!u1 || !u2) return false;
  // If account IDs match
  if (u1.id && u2.id && u1.id === u2.id) return true;
  // If student public IDs match
  const s1Id = u1.student?.id || u1.studentId;
  const s2Id = u2.student?.id || u2.studentId;
  if (s1Id && s2Id && s1Id === s2Id) return true;
  // If student codes match
  const code1 = u1.student?.studentCode || u1.student?.code || (u1.role === 'PARENT_PH' ? (u1.identifier || u1.username) : null);
  const code2 = u2.student?.studentCode || u2.student?.code || (u2.role === 'PARENT_PH' ? (u2.identifier || u2.username) : null);
  if (code1 && code2 && code1 === code2) return true;
  return false;
};

// Helper: Match targetKey against any identifier of an account
const matchesChildKey = (u, targetKey) => {
  if (!u || !targetKey) return false;
  const tk = String(targetKey).trim();
  return (
    String(u.id) === tk ||
    (u.student?.id && String(u.student.id) === tk) ||
    (u.student?.studentCode && String(u.student.studentCode) === tk) ||
    (u.student?.code && String(u.student.code) === tk) ||
    (u.username && String(u.username) === tk) ||
    (u.identifier && String(u.identifier) === tk)
  );
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      linkedAccounts: [], // Array of { user, accessToken } for multi-child accounts

      setAuth: (user, accessToken = null) => {
        if (!user) {
          set({ user: null, accessToken: null, linkedAccounts: [] });
          return;
        }

        const isDifferentUser =
          get().user &&
          (get().user.id !== user.id || get().user.identifier !== user.identifier);
        const token = isDifferentUser ? accessToken : (accessToken ?? get().accessToken);
        let accounts = get().linkedAccounts || [];

        // If PARENT_PH, maintain linkedAccounts list without wiping on adding 3rd or subsequent children
        if (user && user.role === 'PARENT_PH') {
          const exists = accounts.some((a) => isSameChild(a.user, user));
          if (!exists) {
            accounts = [...accounts, { user, accessToken: token }];
          } else {
            // Update the stored entry
            accounts = accounts.map((a) =>
              isSameChild(a.user, user)
                ? { user: { ...a.user, ...user }, accessToken: token || a.accessToken }
                : a,
            );
          }
        } else {
          accounts = [];
        }

        set({
          user,
          accessToken: token,
          linkedAccounts: accounts,
        });
      },

      updateUser: (patch) =>
        set((state) => {
          const updatedUser = state.user ? { ...state.user, ...patch } : null;
          const updatedLinked = (state.linkedAccounts || []).map((a) =>
            isSameChild(a.user, updatedUser) ? { ...a, user: updatedUser } : a,
          );
          return {
            user: updatedUser,
            linkedAccounts: updatedLinked,
          };
        }),

      setAccessToken: (accessToken) => set({ accessToken }),

      addLinkedAccount: (user, accessToken) => {
        const currentAccounts = get().linkedAccounts || [];
        const exists = currentAccounts.some((a) => isSameChild(a.user, user));
        const updatedAccounts = exists
          ? currentAccounts.map((a) =>
              isSameChild(a.user, user)
                ? { user: { ...a.user, ...user }, accessToken: accessToken || a.accessToken }
                : a,
            )
          : [...currentAccounts, { user, accessToken }];

        set({
          linkedAccounts: updatedAccounts,
          user,
          accessToken,
        });
      },

      switchAccount: (userId) => {
        if (!userId) return false;
        const currentAccounts = get().linkedAccounts || [];
        const target = currentAccounts.find((a) => matchesChildKey(a.user, userId));
        if (target) {
          set({
            user: target.user,
            accessToken: target.accessToken,
          });
          return true;
        }
        return false;
      },

      removeLinkedAccount: (userId) => {
        const currentAccounts = get().linkedAccounts || [];
        const remaining = currentAccounts.filter((a) => !matchesChildKey(a.user, userId));
        const isCurrentActive = matchesChildKey(get().user, userId);

        if (isCurrentActive) {
          if (remaining.length > 0) {
            set({
              user: remaining[0].user,
              accessToken: remaining[0].accessToken,
              linkedAccounts: remaining,
            });
          } else {
            set({
              user: null,
              accessToken: null,
              linkedAccounts: [],
            });
          }
        } else {
          set({ linkedAccounts: remaining });
        }
      },

      logout: () =>
        set({
          user: null,
          accessToken: null,
          linkedAccounts: [],
        }),

      logoutAll: () =>
        set({
          user: null,
          accessToken: null,
          linkedAccounts: [],
        }),
    }),
    {
      name: 'sorak-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
