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
          const exists = accounts.some(
            (a) => a.user?.id === user.id || a.user?.identifier === user.identifier,
          );
          if (!exists) {
            accounts = [...accounts, { user, accessToken: token }];
          } else {
            // Update the stored entry
            accounts = accounts.map((a) =>
              a.user?.id === user.id || a.user?.identifier === user.identifier
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
            a.user?.id === updatedUser?.id ? { ...a, user: updatedUser } : a,
          );
          return {
            user: updatedUser,
            linkedAccounts: updatedLinked,
          };
        }),

      setAccessToken: (accessToken) => set({ accessToken }),

      addLinkedAccount: (user, accessToken) => {
        const currentAccounts = get().linkedAccounts || [];
        const exists = currentAccounts.some(
          (a) => a.user?.id === user.id || a.user?.identifier === user.identifier,
        );
        const updatedAccounts = exists
          ? currentAccounts.map((a) =>
              a.user?.id === user.id || a.user?.identifier === user.identifier
                ? { user, accessToken }
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
        const currentAccounts = get().linkedAccounts || [];
        const target = currentAccounts.find(
          (a) => a.user?.id === userId || a.user?.identifier === userId,
        );
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
        const remaining = currentAccounts.filter(
          (a) => a.user?.id !== userId && a.user?.identifier !== userId,
        );
        const isCurrentActive =
          get().user?.id === userId || get().user?.identifier === userId;

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
