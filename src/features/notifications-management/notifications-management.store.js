import { create } from 'zustand';
import { toast } from 'sonner';
import { notificationsManagementApi } from './notifications-management.api';

export const useNotificationsManagementStore = create((set, get) => ({
  // Tab control: 'broadcasts' (Bản tin nhà trường) | 'automated' (Thông báo tự động)
  activeTab: 'broadcasts',

  // Tab 1: Broadcasts
  broadcasts: [],
  isLoading: false,
  error: null,

  // Tab 2: Automated Notifications
  automatedNotifications: [],
  isAutomatedLoading: false,
  automatedCategoryFilter: 'all',
  automatedRoleFilter: 'all',
  automatedStatusFilter: 'all',
  automatedVisibleColumns: {
    recipient: true,
    role: true,
    createdAt: true,
    isRead: true,
  },
  selectedAutomatedNotification: null,
  isAutomatedDetailOpen: false,

  // Toolbar & filters
  searchQuery: '',
  scopeFilter: 'all',
  statusFilter: 'all',
  currentPage: 1,
  viewMode: 'list', // 'list' | 'grid'
  visibleColumns: {
    targetScope: true,
    status: true,
    dispatchTime: true,
    readRate: true,
  },

  // Drawer state (for broadcasts)
  isDrawerOpen: false,
  drawerMode: 'create', // 'create' | 'view' | 'edit'
  activeBatchId: null,
  activeBroadcastDetail: null,
  isDetailLoading: false,

  // Delete dialog state
  isDeleteDialogOpen: false,
  deletingBatchId: null,
  isDeleting: false,

  setActiveTab: (activeTab) => {
    set({
      activeTab,
      currentPage: 1,
      searchQuery: '',
    });
    if (activeTab === 'automated' && get().automatedNotifications.length === 0) {
      get().fetchAutomatedNotifications();
    } else if (activeTab === 'broadcasts' && get().broadcasts.length === 0) {
      get().fetchBroadcasts();
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setScopeFilter: (scopeFilter) => set({ scopeFilter, currentPage: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, currentPage: 1 }),
  setAutomatedCategoryFilter: (automatedCategoryFilter) =>
    set({ automatedCategoryFilter, currentPage: 1 }),
  setAutomatedRoleFilter: (automatedRoleFilter) =>
    set({ automatedRoleFilter, currentPage: 1 }),
  setAutomatedStatusFilter: (automatedStatusFilter) =>
    set({ automatedStatusFilter, currentPage: 1 }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setViewMode: (viewMode) => set({ viewMode }),

  toggleColumn: (key) =>
    set((state) => ({
      visibleColumns: {
        ...state.visibleColumns,
        [key]: !state.visibleColumns[key],
      },
    })),

  toggleAutomatedColumn: (key) =>
    set((state) => ({
      automatedVisibleColumns: {
        ...state.automatedVisibleColumns,
        [key]: !state.automatedVisibleColumns[key],
      },
    })),

  openAutomatedDetail: (notif) =>
    set({
      selectedAutomatedNotification: notif,
      isAutomatedDetailOpen: true,
    }),

  closeAutomatedDetail: () =>
    set({
      selectedAutomatedNotification: null,
      isAutomatedDetailOpen: false,
    }),

  openCreateDrawer: () =>
    set({
      isDrawerOpen: true,
      drawerMode: 'create',
      activeBatchId: null,
      activeBroadcastDetail: null,
    }),

  openEditDrawer: async (batchOrDetail) => {
    if (typeof batchOrDetail === 'object' && batchOrDetail !== null) {
      set({
        isDrawerOpen: true,
        drawerMode: 'edit',
        activeBatchId: batchOrDetail.batchId,
        activeBroadcastDetail: batchOrDetail,
        isDetailLoading: false,
      });
      return;
    }
    const batchId = batchOrDetail;
    set({
      isDrawerOpen: true,
      drawerMode: 'edit',
      activeBatchId: batchId,
      isDetailLoading: true,
    });
    try {
      const detail = await notificationsManagementApi.getById(batchId);
      set({ activeBroadcastDetail: detail, isDetailLoading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải thông tin thông báo');
      set({ isDetailLoading: false });
    }
  },

  openViewDrawer: async (batchId) => {
    set({
      isDrawerOpen: true,
      drawerMode: 'view',
      activeBatchId: batchId,
      isDetailLoading: true,
    });
    try {
      const detail = await notificationsManagementApi.getById(batchId);
      set({ activeBroadcastDetail: detail, isDetailLoading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải chi tiết bản tin');
      set({ isDetailLoading: false });
    }
  },

  closeDrawer: () =>
    set({
      isDrawerOpen: false,
      activeBatchId: null,
      activeBroadcastDetail: null,
      isDetailLoading: false,
    }),

  openDeleteDialog: (batchId) =>
    set({
      isDeleteDialogOpen: true,
      deletingBatchId: batchId,
    }),

  closeDeleteDialog: () =>
    set({
      isDeleteDialogOpen: false,
      deletingBatchId: null,
    }),

  fetchBroadcasts: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await notificationsManagementApi.list({ limit: 100 });
      set({ broadcasts: data?.items || [], isLoading: false });
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể tải danh sách bản tin';
      set({ error: msg, isLoading: false });
      toast.error(msg);
    }
  },

  fetchAutomatedNotifications: async () => {
    set({ isAutomatedLoading: true });
    try {
      const data = await notificationsManagementApi.listAutomated({ limit: 100 });
      set({ automatedNotifications: data?.items || [], isAutomatedLoading: false });
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể tải danh sách thông báo tự động';
      toast.error(msg);
      set({ isAutomatedLoading: false });
    }
  },

  createBroadcast: async (payload) => {
    try {
      const res = await notificationsManagementApi.create(payload);
      toast.success('Phát hành bản tin thành công');
      get().closeDrawer();
      await get().fetchBroadcasts();
      return res;
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status && status < 500 && err.response?.data?.message
          ? err.response.data.message
          : 'Không thể phát hành bản tin lúc này. Vui lòng thử lại sau.';
      toast.error(msg);
      throw err;
    }
  },

  updateBroadcast: async (batchId, payload) => {
    try {
      const res = await notificationsManagementApi.update(batchId, payload);
      toast.success('Cập nhật bản tin thành công');
      get().closeDrawer();
      await get().fetchBroadcasts();
      return res;
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status && status < 500 && err.response?.data?.message
          ? err.response.data.message
          : 'Không thể cập nhật bản tin lúc này. Vui lòng thử lại sau.';
      toast.error(msg);
      throw err;
    }
  },

  deleteBroadcast: async () => {
    const { deletingBatchId } = get();
    if (!deletingBatchId) return;

    set({ isDeleting: true });
    try {
      await notificationsManagementApi.delete(deletingBatchId);
      toast.success('Đã thu hồi bản tin thành công');
      get().closeDeleteDialog();
      await get().fetchBroadcasts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể thu hồi bản tin';
      toast.error(msg);
    } finally {
      set({ isDeleting: false });
    }
  },
}));

