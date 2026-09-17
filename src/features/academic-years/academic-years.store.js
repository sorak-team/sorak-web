
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { academicYearsApi } from './academic-years.api';

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
function toIsoDate(dmy) {
  if (!dmy) return new Date().toISOString().split('T')[0];
  const parts = dmy.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dmy;
}

// Helper to convert YYYY-MM-DD to DD/MM/YYYY
function toDisplayDate(iso) {
  if (!iso) return '07/09/2026';
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

// Helper to get the next day as DD/MM/YYYY
export function getDayAfterDisplayDate(dmy) {
  if (!dmy) return '';
  const parts = dmy.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextDay = String(date.getDate()).padStart(2, '0');
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    const nextYear = date.getFullYear();
    return `${nextDay}/${nextMonth}/${nextYear}`;
  }
  return '';
}

// Helper to determine if an academic year has been in use (has attendance, curriculum themes, goals, classes)
export function isAcademicYearInUse(year) {
  if (!year) return false;
  if (year.isUsed !== undefined) return Boolean(year.isUsed);
  if (year.usageSummary) {
    const { classes = 0, themes = 0, goals = 0, attendances = 0 } = year.usageSummary;
    if (classes > 0 || themes > 0 || goals > 0 || attendances > 0) return true;
  }
  if (
    (year.totalClasses && year.totalClasses > 0) ||
    (year.totalStudents && year.totalStudents > 0) ||
    (year.attendanceRate && year.attendanceRate !== '0%' && year.attendanceRate !== 0) ||
    (year.progress && year.progress > 0) ||
    (year.gradeDistribution && year.gradeDistribution.length > 0) ||
    (year.recentAttendance && year.recentAttendance.length > 0)
  ) {
    return true;
  }
  return false;
}

/**
 * DiceBear Glass style Electric preset palette:
 * - ff2e88: Electric Magenta / Pink
 * - 00e5ff: Electric Cyan / Blue
 * - ffe600: Electric Yellow
 * - 7cff00: Electric Lime / Teal Green
 * - ff6a00: Electric Orange
 * - b400ff: Electric Violet / Purple
 */
export const ELECTRIC_PRESET_COLORS = [
  'ff2e88',
  '00e5ff',
  'ffe600',
  '7cff00',
  'ff6a00',
  'b400ff',
];

export const ELECTRIC_PRESET_BG = 'ff2e88,00e5ff,ffe600,7cff00,ff6a00,b400ff';

/**
 * Basic clean color presets for school year DiceBear Glass emblem
 */
export const GLASS_THEME_PRESETS = [
  { id: 'blue', label: 'Xanh dương', colorHex: '#2563EB', bgHex: '00e5ff' },
  { id: 'teal', label: 'Xanh ngọc', colorHex: '#0D9488', bgHex: '14b8a6' },
  { id: 'orange', label: 'Cam', colorHex: '#EA580C', bgHex: 'ff6a00' },
  { id: 'pink', label: 'Hồng', colorHex: '#FF4B72', bgHex: 'ff2e88' },
  { id: 'purple', label: 'Tím', colorHex: '#8B5CF6', bgHex: 'b400ff' },
  { id: 'lime', label: 'Xanh lá', colorHex: '#84CC16', bgHex: '7cff00' },
  { id: 'amber', label: 'Vàng', colorHex: '#F59E0B', bgHex: 'ffe600' },
  { id: 'rose', label: 'Đỏ', colorHex: '#E11D48', bgHex: 'f43f5e' },
];

export function buildSchoolYearAvatarUrl(seed = '2026-2027', bgHex = '00e5ff') {
  const cleanSeed = encodeURIComponent(seed || '2026-2027');
  const cleanBg = String(bgHex || '00e5ff').replace(/#/g, '');
  return `https://api.dicebear.com/10.x/glass/svg?seed=${cleanSeed}&backgroundColor=${cleanBg}`;
}

/**
 * Color configuration per school year (distinguished by the start year).
 * Maps each school year to its distinct color from the Electric preset palette.
 */
export const YEAR_CONFIG_MAP = {
  '2026': {
    theme: 'blue',
    bgColor: '00e5ff',
    seed: '2026-2027',
  },
  '2025': {
    theme: 'teal',
    bgColor: '14b8a6',
    seed: '2025-2026',
  },
  '2027': {
    theme: 'orange',
    bgColor: 'ff6a00',
    seed: '2027-2028',
  },
  '2024': {
    theme: 'purple',
    bgColor: 'b400ff',
    seed: '2024-2025',
  },
  '2028': {
    theme: 'pink',
    bgColor: 'ff2e88',
    seed: '2028-2029',
  },
};

/**
 * Resolves the starting year and emblem configuration.
 * Prioritizes custom theme, color, and avatar if specified.
 */
export function getSchoolYearInfo(yearOrInput) {
  if (!yearOrInput) {
    const config = YEAR_CONFIG_MAP['2026'];
    return {
      yearKey: '2026',
      theme: config.theme,
      bgColor: config.bgColor,
      seed: config.seed,
      avatarUrl: buildSchoolYearAvatarUrl(config.seed, config.bgColor),
    };
  }

  // If passed directly a preset theme string (e.g. 'pink', 'teal')
  if (typeof yearOrInput === 'string' && GLASS_THEME_PRESETS.some((p) => p.id === yearOrInput)) {
    const preset = GLASS_THEME_PRESETS.find((p) => p.id === yearOrInput);
    return {
      yearKey: 'custom',
      theme: preset.id,
      bgColor: preset.bgHex,
      seed: 'school-year',
      avatarUrl: buildSchoolYearAvatarUrl('school-year', preset.bgHex),
    };
  }

  // If already a URL with backgroundColor, strip any leftover tags=animation and update blobs to glass
  if (typeof yearOrInput === 'string' && yearOrInput.startsWith('http')) {
    const cleanedUrl = yearOrInput
      .replace('/blobs/', '/glass/')
      .replace(/[?&]tags=animation/g, '')
      .replace(/\?&/g, '?');
    if (cleanedUrl.includes('backgroundColor=')) {
      const match = cleanedUrl.match(/seed=([^&]+)/);
      const seed = match ? decodeURIComponent(match[1]) : '2026-2027';
      const yearMatch = seed.match(/(20\d{2})/);
      const yearKey = yearMatch ? yearMatch[1] : '2026';
      const bgMatch = cleanedUrl.match(/backgroundColor=([^&]+)/);
      const bg = bgMatch ? bgMatch[1] : '00e5ff';
      const matchedPreset = GLASS_THEME_PRESETS.find((p) => p.bgHex === bg);
      const config = YEAR_CONFIG_MAP[yearKey] || YEAR_CONFIG_MAP['2026'];
      return {
        yearKey,
        theme: matchedPreset ? matchedPreset.id : config.theme,
        bgColor: bg,
        seed,
        avatarUrl: cleanedUrl,
      };
    }
  }

  // Extract explicit customization if object was provided
  const isObj = typeof yearOrInput === 'object' && yearOrInput !== null;
  const rawId = isObj ? String(yearOrInput?.id || '') : String(yearOrInput);
  const name = isObj ? String(yearOrInput?.name || '') : '';
  const range = isObj ? String(yearOrInput?.range || '') : '';
  const explicitTheme = isObj ? (yearOrInput?.colorTheme || yearOrInput?.theme) : null;
  const explicitAvatar = isObj ? yearOrInput?.avatarUrl : null;
  const explicitBg = isObj ? yearOrInput?.glassBgColor : null;
  const explicitSeed = isObj ? yearOrInput?.glassSeed : null;

  const combined = `${name} ${range} ${rawId}`;

  // Match the first 4-digit year occurring in the string (start year of school year)
  const match = combined.match(/(20\d{2})/);
  let yearKey = match ? match[1] : null;

  // Fallback for numeric database IDs (1: 2026-2027, 2: 2025-2026, 3: 2027-2028)
  if (!yearKey) {
    if (rawId === '1') yearKey = '2026';
    else if (rawId === '2') yearKey = '2025';
    else if (rawId === '3') yearKey = '2027';
    else if (rawId === '4') yearKey = '2028';
    else yearKey = '2026';
  }

  const baseConfig = YEAR_CONFIG_MAP[yearKey] || {
    theme: 'blue',
    bgColor: '00e5ff',
    seed: yearKey ? `${yearKey}-${Number(yearKey) + 1}` : rawId || 'school-year',
  };

  const finalTheme = explicitTheme || baseConfig.theme;
  const matchedPreset = GLASS_THEME_PRESETS.find((p) => p.id === finalTheme);
  const finalSeed = explicitSeed || baseConfig.seed;
  const finalBg = explicitBg || (matchedPreset ? matchedPreset.bgHex : baseConfig.bgColor);

  const resolvedAvatar = explicitAvatar && (explicitAvatar.includes('backgroundColor=') || explicitAvatar.includes('/glass/'))
    ? explicitAvatar.replace('/blobs/', '/glass/').replace(/[?&]tags=animation/g, '').replace(/\?&/g, '?')
    : buildSchoolYearAvatarUrl(finalSeed, finalBg);

  return {
    yearKey,
    theme: finalTheme,
    bgColor: finalBg,
    seed: finalSeed,
    avatarUrl: resolvedAvatar,
  };
}

export function getSchoolYearAvatarUrl(yearOrInput) {
  return getSchoolYearInfo(yearOrInput).avatarUrl;
}

export function getSchoolYearTheme(yearOrInput) {
  return getSchoolYearInfo(yearOrInput).theme;
}

export const INITIAL_ACADEMIC_YEARS = [];

export const useAcademicYearStore = create(
  persist(
    (set, get) => ({
      academicYears: [],
      yearCustomizations: {}, // Map of yearId -> { colorTheme, glassBgColor, glassSeed, avatarUrl }
      selectedYearId: null,
      viewMode: 'list', // 'list' | 'grid'
      searchQuery: '',
      filterStatus: 'all', // 'all' | 'active' | 'ended'
      sortBy: 'newest', // 'newest' | 'oldest' | 'name' | 'startDate' | 'endDate' | 'classCount'
      hideEnded: false,
      onlyActive: false,
      isLoading: true,
      isInitialized: false,

      // Drawer state
      isDrawerOpen: false,
      drawerMode: 'edit', // 'edit' | 'create'
      drawerYearId: null,

      // Actions
      setSelectedYearId: (id) => set({ selectedYearId: id ? String(id) : null }),
      selectActiveYear: () => {
        const { academicYears } = get();
        const activeYear = academicYears.find(
          (y) => y.status === 'ACTIVE' || y.active === true,
        );
        if (activeYear) {
          const id = String(activeYear.id);
          set({ selectedYearId: id });
          return id;
        } else if (academicYears.length > 0) {
          const id = String(academicYears[0].id);
          set({ selectedYearId: id });
          return id;
        }
        return null;
      },
      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setHideEnded: (val) => set({ hideEnded: val }),
      setOnlyActive: (val) => set({ onlyActive: val }),

      openEditDrawer: (id) => {
        const targetId = id || get().selectedYearId;
        set({
          isDrawerOpen: true,
          drawerMode: 'edit',
          drawerYearId: targetId,
        });
      },

      openCreateDrawer: () =>
        set({
          isDrawerOpen: true,
          drawerMode: 'create',
          drawerYearId: null,
        }),

      closeDrawer: () =>
        set({
          isDrawerOpen: false,
          drawerYearId: null,
        }),

      /**
       * Update DiceBear Glass emblem color
       */
      setAcademicYearGlassColor: (id, colorThemeOrObj) => {
        const chosenTheme =
          typeof colorThemeOrObj === 'string'
            ? colorThemeOrObj
            : colorThemeOrObj?.colorTheme || 'blue';
        const preset =
          GLASS_THEME_PRESETS.find((p) => p.id === chosenTheme) ||
          GLASS_THEME_PRESETS[0];

        set((state) => {
          const target = state.academicYears.find((y) => y.id === id);
          if (!target) return state;

          const seed = target.glassSeed || target.range || target.name || '2026-2027';
          const avatarUrl = buildSchoolYearAvatarUrl(seed, preset.bgHex);

          const updated = state.academicYears.map((y) => {
            if (y.id !== id) return y;
            return {
              ...y,
              colorTheme: preset.id,
              glassBgColor: preset.bgHex,
              avatarUrl,
            };
          });

          const existingCustom = state.yearCustomizations || {};
          return {
            academicYears: updated,
            yearCustomizations: {
              ...existingCustom,
              [id]: {
                colorTheme: preset.id,
                glassBgColor: preset.bgHex,
                avatarUrl,
              },
            },
          };
        });

        // Đồng bộ màu lên Backend API để mọi tài khoản/máy khác nhận được
        academicYearsApi.update(id, { colorTheme: preset.id }).catch((err) => {
          console.warn('API update color theme failed, retained locally:', err?.message);
        });
      },

      /**
       * Fetch school years from Backend API with graceful fallback to mock data
       * @param {Object|boolean} [options] - Pass true or { forceActive: true } to enforce selecting the active year
       */
      fetchAcademicYears: async (options = {}) => {
        const forceActive = typeof options === 'boolean' ? options : Boolean(options?.forceActive);
        set({ isLoading: true });
        try {
          const data = await academicYearsApi.list({ limit: 100 });
          const apiItems = data?.items || (Array.isArray(data) ? data : []);

          if (apiItems.length > 0) {
            const customizations = get().yearCustomizations || {};
            const mapped = apiItems.map((item) => {
              const range = item.name.replace(/^[^\d]*/, '') || '2026–2027';
              const isActive = item.status === 'ACTIVE' || item.isActive;
              const custom = customizations[String(item.id)] || customizations[item.name] || {};
              const resolvedColorTheme = item.colorTheme || item.color_theme || custom.colorTheme;
              const info = getSchoolYearInfo({
                ...item,
                colorTheme: resolvedColorTheme,
                glassBgColor: custom.glassBgColor,
                glassSeed: custom.glassSeed,
                avatarUrl: custom.avatarUrl,
              });
              return {
                id: String(item.id),
                name: item.name,
                range,
                active: isActive,
                status: item.status,
                totalClasses: item.totalClasses || 0,
                isUsed: item.isUsed !== undefined ? item.isUsed : isAcademicYearInUse(item),
                usageSummary: item.usageSummary || null,
                startDate: toDisplayDate(item.startDate),
                semester1EndDate: toDisplayDate(item.semester1EndDate || item.semester_1_end_date || '15/01/2027'),
                endDate: toDisplayDate(item.endDate),
                totalStudents: item.totalStudents || 0,
                teachers: item.teachers || 0,
                attendanceRate: isActive ? '96.8%' : '100%',
                progress: isActive ? 45 : item.status === 'COMPLETED' ? 100 : 0,
                colorTheme: info.theme,
                avatarUrl: info.avatarUrl,
                glassBgColor: info.bgColor,
                glassSeed: info.seed,
                gradeDistribution: item.gradeDistribution || [
                  { grade: 'Mầm', count: 0, height: 20 },
                  { grade: 'Chồi', count: 0, height: 20 },
                  { grade: 'Lá', count: 0, height: 20 },
                  { grade: 'Nhà trẻ', count: 0, height: 20 },
                  { grade: 'Khác', count: 0, height: 20 },
                ],
                recentAttendance: item.recentAttendance || [
                  { day: 'T2', rate: 0, height: 20 },
                  { day: 'T3', rate: 0, height: 20 },
                  { day: 'T4', rate: 0, height: 20 },
                  { day: 'T5', rate: 0, height: 20 },
                  { day: 'T6', rate: 0, height: 20 },
                  { day: 'T7', rate: 0, height: 20 },
                  { day: 'CN', rate: 0, height: 20 },
                ],
                healthStats: item.healthStats || { complete: 0, missing: 0, special: 0 },
              };
            });

            const activeYear = mapped.find((y) => y.active || y.status === 'ACTIVE') || mapped[0];
            let nextSelectedId;

            if (forceActive && activeYear) {
              nextSelectedId = String(activeYear.id);
            } else {
              const currentSelectedId = get().selectedYearId;
              const matchingSelected = mapped.find(
                (y) =>
                  String(y.id) === String(currentSelectedId) ||
                  (currentSelectedId === '2026-2027' && (String(y.id) === '1' || y.name?.includes('2026'))),
              );
              nextSelectedId =
                matchingSelected ? String(matchingSelected.id) : (activeYear ? String(activeYear.id) : mapped[0]?.id || '');
            }

            set({
              academicYears: mapped,
              selectedYearId: nextSelectedId,
              isInitialized: true,
            });
          } else {
            set({
              academicYears: [],
              isInitialized: true,
            });
          }
        } catch (err) {
          console.error('Backend API error fetching academic years:', err);
          set({
            academicYears: [],
            isInitialized: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

  /**
   * Update academic year via API with optimistic local update
   */
  updateAcademicYear: async (id, data) => {
    const target = get().academicYears.find((y) => y.id === id);
    let patchData = { ...data };
    if (target && isAcademicYearInUse(target)) {
      // Năm học đã sử dụng: Giữ nguyên tên, ngày bắt đầu và ngày kết thúc năm học
      patchData = {
        ...patchData,
        name: target.name,
        startDate: target.startDate,
        endDate: target.endDate,
      };
    }

    // Optimistic local state update
    set((state) => {
      const updated = state.academicYears.map((y) => {
        if (y.id !== id) {
          if (patchData.active) return { ...y, active: false, status: 'COMPLETED' };
          return y;
        }
        const updatedName = patchData.name || y.name;
        const mergedTheme = patchData.colorTheme || patchData.theme || y.colorTheme;
        const mergedBgColor = patchData.glassBgColor || y.glassBgColor;
        const mergedSeed = patchData.glassSeed || y.glassSeed;
        const mergedAvatarUrl = patchData.avatarUrl;

        const info = getSchoolYearInfo({
          id: y.id,
          name: updatedName,
          colorTheme: mergedTheme,
          glassBgColor: mergedBgColor,
          glassSeed: mergedSeed,
          avatarUrl: mergedAvatarUrl,
        });

        return {
          ...y,
          ...patchData,
          status: patchData.active ? 'ACTIVE' : patchData.status || y.status,
          range: patchData.name ? patchData.name.replace(/^[^\d]*/, '') : y.range,
          colorTheme: info.theme,
          avatarUrl: info.avatarUrl,
          glassBgColor: info.bgColor,
          glassSeed: info.seed,
        };
      });

      const existingCustom = state.yearCustomizations || {};
      const newCustom = {
        colorTheme: patchData.colorTheme || patchData.theme,
        glassBgColor: patchData.glassBgColor,
        glassSeed: patchData.glassSeed,
        avatarUrl: patchData.avatarUrl,
      };
      Object.keys(newCustom).forEach((k) => newCustom[k] === undefined && delete newCustom[k]);

      return {
        academicYears: updated,
        yearCustomizations: {
          ...existingCustom,
          [id]: {
            ...(existingCustom[id] || {}),
            ...newCustom,
          },
        },
      };
    });

    try {
      const payload = {};
      if (patchData.name) payload.name = patchData.name;
      if (patchData.startDate) payload.startDate = toIsoDate(patchData.startDate);
      if (patchData.semester1EndDate) payload.semester1EndDate = toIsoDate(patchData.semester1EndDate);
      if (patchData.endDate) payload.endDate = toIsoDate(patchData.endDate);
      if (patchData.status) payload.status = patchData.status;
      else if (patchData.active !== undefined) payload.status = patchData.active ? 'ACTIVE' : 'UPCOMING';
      if (patchData.colorTheme || patchData.theme) payload.colorTheme = patchData.colorTheme || patchData.theme;

      await academicYearsApi.update(id, payload);
      await get().fetchAcademicYears();
    } catch (err) {
      console.warn('API update failed, local state retained:', err.message);
    }
  },

  /**
   * Create academic year via API
   */
  createAcademicYear: async (data) => {
    const range = data.name ? data.name.replace(/^[^d]*/, '') : '2027–2028';
    const tempId = `year-${Date.now()}`;
    const info = getSchoolYearInfo({
      id: tempId,
      name: data.name,
      range,
      colorTheme: data.colorTheme || data.theme,
      glassBgColor: data.glassBgColor,
      glassSeed: data.glassSeed,
      avatarUrl: data.avatarUrl,
    });
    const newYear = {
      id: tempId,
      name: data.name || `Năm học ${range}`,
      range,
      active: Boolean(data.active),
      status: data.active ? 'ACTIVE' : 'UPCOMING',
      totalClasses: data.totalClasses || 0,
      startDate: data.startDate || '05/09/2027',
      semester1EndDate: data.semester1EndDate || '15/01/2028',
      endDate: data.endDate || '31/05/2028',
      totalStudents: 0,
      teachers: 0,
      attendanceRate: '0%',
      progress: 0,
      colorTheme: info.theme,
      avatarUrl: info.avatarUrl,
      glassBgColor: info.bgColor,
      glassSeed: info.seed,
      gradeDistribution: [],
      recentAttendance: [],
      healthStats: { complete: 0, missing: 0, special: 0 },
    };

    set((state) => ({
      academicYears: [newYear, ...state.academicYears],
      selectedYearId: tempId,
    }));

    try {
      const payload = {
        name: data.name,
        startDate: toIsoDate(data.startDate),
        semester1EndDate: toIsoDate(data.semester1EndDate),
        endDate: toIsoDate(data.endDate),
        status: data.active ? 'ACTIVE' : 'UPCOMING',
      };
      if (data.colorTheme || data.theme) {
        payload.colorTheme = data.colorTheme || data.theme;
      }
      await academicYearsApi.create(payload);
      await get().fetchAcademicYears();
    } catch (err) {
      console.warn('API create failed, local item retained:', err.message);
    }
  },

  /**
   * Delete academic year
   */
  deleteAcademicYear: async (id) => {
    set((state) => {
      const filtered = state.academicYears.filter((y) => y.id !== id);
      const nextSelected =
        state.selectedYearId === id ? filtered[0]?.id || '' : state.selectedYearId;
      return {
        academicYears: filtered,
        selectedYearId: nextSelected,
      };
    });

    try {
      await academicYearsApi.delete(id);
      await get().fetchAcademicYears();
    } catch (err) {
      console.warn('API delete failed, local item removed:', err.message);
    }
  },
  /**
   * Activate academic year
   */
  activateAcademicYear: async (id) => {
    set((state) => ({
      academicYears: state.academicYears.map((y) => ({
        ...y,
        active: y.id === id,
        status: y.id === id ? 'ACTIVE' : y.status === 'ACTIVE' ? 'COMPLETED' : y.status,
      })),
      selectedYearId: id,
    }));

    try {
      await academicYearsApi.activate(id);
      await get().fetchAcademicYears();
    } catch (err) {
      console.warn('API activate failed:', err.message);
    }
  },
}),
    {
      name: 'sorak-academic-year-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedYearId: state.selectedYearId === '2026-2027' ? '1' : state.selectedYearId,
        yearCustomizations: state.yearCustomizations,
      }),
    },
  ),
);
