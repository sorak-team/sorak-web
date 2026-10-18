import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  UnfoldMoreIcon,
  Cancel01Icon,
  Tick02Icon,
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';
import { useCurriculumStore } from '../curriculum.store';
import { curriculumApi } from '../curriculum.api';
import { cn } from '@/shared/lib/utils';

// Standard fallback themes matching Thông tư 51
const FALLBACK_THEMES = [
  { id: 'th-1', code: '01', name: 'Bản thân', weeks: 3, subThemeCount: 3, startDate: '2025-09-01', endDate: '2025-09-21' },
  { id: 'th-2', code: '02', name: 'Gia đình', weeks: 3, subThemeCount: 3, startDate: '2025-09-22', endDate: '2025-10-12' },
  { id: 'th-3', code: '03', name: 'Trường mầm non', weeks: 3, subThemeCount: 3, startDate: '2025-10-13', endDate: '2025-11-02' },
  { id: 'th-4', code: '04', name: 'Nghề nghiệp', weeks: 4, subThemeCount: 4, startDate: '2025-11-03', endDate: '2025-11-30' },
  { id: 'th-5', code: '05', name: 'Thế giới thực vật', weeks: 4, subThemeCount: 4, startDate: '2025-12-01', endDate: '2025-12-28' },
  { id: 'th-6', code: '06', name: 'Thế giới động vật', weeks: 4, subThemeCount: 4, startDate: '2025-12-29', endDate: '2026-01-25' },
  { id: 'th-7', code: '07', name: 'Giao thông', weeks: 3, subThemeCount: 3, startDate: '2026-02-02', endDate: '2026-02-22' },
  { id: 'th-8', code: '08', name: 'Nước & hiện tượng tự nhiên', weeks: 3, subThemeCount: 3, startDate: '2026-02-23', endDate: '2026-03-15' },
  { id: 'th-9', code: '09', name: 'Quê hương đất nước', weeks: 4, subThemeCount: 4, startDate: '2026-03-16', endDate: '2026-04-12' },
];

export function ThemeCommandMenu({
  yearId = '2025-2026',
  ageGroup = 'nhatre',
  currentThemeId = '02',
  currentThemeName = '',
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const storeThemes = useCurriculumStore((state) => state.themes);
  const setStoreThemes = useCurriculumStore((state) => state.setThemes);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [themes, setThemes] = useState(storeThemes || []);

  // Sync with store themes
  useEffect(() => {
    if (storeThemes && storeThemes.length > 0) {
      setThemes(storeThemes);
    }
  }, [storeThemes]);

  // If storeThemes is empty, fetch them from API
  useEffect(() => {
    if (!storeThemes || storeThemes.length === 0) {
      let isMounted = true;
      curriculumApi
        .getThemeSetDetail({
          year: yearId.replace('-', '–'),
          ageGroup,
        })
        .then((data) => {
          if (isMounted && data?.themes?.length > 0) {
            setThemes(data.themes);
            setStoreThemes(data.themes);
          }
        })
        .catch(() => {
          if (isMounted) setThemes(FALLBACK_THEMES);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [yearId, ageGroup, storeThemes, setStoreThemes]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const displayThemes = themes.length > 0 ? themes : FALLBACK_THEMES;

  // Filter themes by search keyword
  const filteredThemes = displayThemes.filter((th) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      th.name?.toLowerCase().includes(q) ||
      th.code?.toLowerCase().includes(q)
    );
  });

  // Check if a theme is current
  const isCurrentTheme = (th) => {
    if (th.id && th.id === currentThemeId) return true;
    if (th.code && th.code === currentThemeId) return true;
    if (currentThemeName && th.name === currentThemeName) return true;
    return false;
  };

  const handleSelectTheme = (th) => {
    const targetId = th.id || th.code || '01';
    navigate(`/curriculum/themes/${yearId}/${ageGroup}/${targetId}`);
    setIsOpen(false);
    setSearch('');
  };

  const handleCloseTheme = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate(`/curriculum/themes/${yearId}/${ageGroup}`);
  };

  const formatDdMm = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return isoStr;
  };

  return (
    <div
      className="relative inline-flex items-center"
      ref={menuRef}
      data-name="ThemeCommandMenu"
    >
      {/* Breadcrumb Trigger Button matching ClassCommandMenu */}
      <div className="group inline-flex items-center border border-border bg-background hover:bg-muted/70 transition-colors h-7 px-2 gap-1 rounded-none text-[13px] font-normal text-foreground">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 cursor-pointer outline-none focus:outline-none"
          title="Chuyển chủ đề chính"
          data-name="Theme Switcher Trigger"
        >
          <span className="font-medium text-foreground">
            {currentThemeName || 'Chọn chủ đề'}
          </span>
          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            size={14}
            className="text-muted-foreground"
          />
        </button>

        {/* Detach / Close [x] separator and button - shown on hover */}
        <div className="hidden group-hover:flex items-center ml-0.5">
          <div className="h-3 w-px bg-border mr-1" />
          <button
            type="button"
            onClick={handleCloseTheme}
            className="size-4 rounded-none flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Đóng & quay lại danh sách chủ đề"
            data-name="Close Theme Button"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} />
          </button>
        </div>
      </div>

      {/* Command Menu Dropdown - only shown when clicked (isOpen) */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 w-[310px] sm:w-[360px] bg-card border border-border shadow-xl z-50 rounded-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          data-name="Theme Command Menu Dropdown"
        >
          {/* Search Bar with Esc shortcut badge */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="text-muted-foreground shrink-0"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm chủ đề chính..."
              autoFocus
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:ring-0 shadow-none"
            />
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded-none">
              Esc
            </kbd>
          </div>

          {/* Themes List */}
          <div className="max-h-[280px] overflow-y-auto p-1 divide-y divide-border/30">
            {filteredThemes.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-muted-foreground">
                Không tìm thấy chủ đề phù hợp.
              </div>
            ) : (
              filteredThemes.map((th) => {
                const selected = isCurrentTheme(th);
                const subCount = th.subThemes?.length || th.subThemeCount || 0;
                const dateText =
                  th.startDate && th.endDate
                    ? `${formatDdMm(th.startDate)} -> ${formatDdMm(th.endDate)}`
                    : '';

                return (
                  <button
                    key={th.id || th.code}
                    type="button"
                    onClick={() => handleSelectTheme(th)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-none transition-colors cursor-pointer text-[13px]',
                      selected
                        ? 'bg-muted text-foreground font-medium'
                        : 'hover:bg-muted/60 text-foreground',
                    )}
                  >
                    <span className="shrink-0 px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-muted border border-border text-foreground rounded-none">
                      {(() => {
                        const c = String(th.code || '');
                        const match = c.match(/(\d+)$/);
                        return match ? match[1].padStart(2, '0') : '01';
                      })()}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1 leading-tight">
                      <span className="truncate font-medium">{th.name}</span>
                      <span className="text-[11.5px] text-muted-foreground truncate">
                        {subCount > 0 ? `${subCount} chủ đề nhánh` : 'Chưa có nhánh'}
                        {dateText ? ` · ${dateText}` : ''}
                      </span>
                    </div>
                    {selected && (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        size={15}
                        className="text-primary shrink-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: Quay lại danh sách bộ chủ đề */}
          <div className="border-t border-border p-1.5 bg-muted/20">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(`/curriculum/themes/${yearId}/${ageGroup}`);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer rounded-none"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
              <span>Quay lại danh sách bộ chủ đề</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeCommandMenu;
