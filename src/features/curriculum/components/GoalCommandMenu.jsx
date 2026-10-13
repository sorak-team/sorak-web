import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  UnfoldMoreIcon,
  Cancel01Icon,
  Tick02Icon,
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';
import { curriculumApi } from '../curriculum.api';
import { cn } from '@/shared/lib/utils';

export function GoalCommandMenu({
  yearId = '2026-2027',
  ageGroup = 'nhatre',
  currentGoalId = 'g1-1',
  currentGoalCode = '',
  currentGoalTitle = '',
}) {
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    let isMounted = true;
    curriculumApi
      .getSingleGoalDetail({
        year: yearId.replace('-', '–'),
        ageGroup,
        goalId: currentGoalId,
      })
      .then((data) => {
        if (isMounted && data.allGoals) {
          setGoals(data.allGoals);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [yearId, ageGroup, currentGoalId]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
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
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentGoal =
    goals.find((g) => g.id === currentGoalId || g.code === currentGoalId) || null;

  const displayCode = currentGoal?.code || currentGoalCode || 'MT';
  const displayTitle = currentGoal?.title || currentGoalTitle || '';

  const filteredGoals = goals.filter((g) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      g.code?.toLowerCase().includes(q) ||
      g.title?.toLowerCase().includes(q) ||
      g.indicatorCode?.toLowerCase().includes(q) ||
      g.domainLabel?.toLowerCase().includes(q)
    );
  });

  const handleSelectGoal = (g) => {
    setIsOpen(false);
    setSearch('');
    navigate(`/curriculum/goals/${yearId}/${ageGroup}/${g.id}`);
  };

  const handleCloseGoal = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate(`/curriculum/goals/${yearId}/${ageGroup}`);
  };

  return (
    <div
      className="relative inline-flex items-center"
      ref={menuRef}
      data-name="GoalCommandMenu"
    >
      {/* Breadcrumb Trigger Button matching ClassCommandMenu */}
      <div className="group inline-flex items-center border border-border bg-background hover:bg-muted/70 transition-colors h-7 px-2 gap-1 rounded-none text-[13px] font-normal text-foreground">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none"
          title="Chuyển mục tiêu"
          data-name="Goal Switcher Trigger"
        >
          <span className="font-semibold text-primary">{displayCode}</span>
          {displayTitle && (
            <span className="max-w-[130px] truncate text-muted-foreground font-normal">
              · {displayTitle}
            </span>
          )}
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
            onClick={handleCloseGoal}
            className="size-4 rounded-none flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Đóng & quay lại ngân hàng mục tiêu"
            data-name="Close Goal Button"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} />
          </button>
        </div>
      </div>

      {/* Command Menu Dropdown - only shown when clicked (isOpen) */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 w-[320px] sm:w-[380px] bg-card border border-border shadow-xl z-50 rounded-none overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          data-name="Goal Command Menu Dropdown"
        >
          {/* Search Bar with Esc shortcut badge matching ClassCommandMenu */}
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
              placeholder="Tìm mã hoặc tên mục tiêu..."
              autoFocus
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none border-0 focus:outline-none focus:ring-0 shadow-none"
            />
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded-none">
              Esc
            </kbd>
          </div>

          {/* Goals List matching ClassCommandMenu */}
          <div className="max-h-[280px] overflow-y-auto p-1 divide-y divide-border/30">
            {filteredGoals.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-muted-foreground">
                Không tìm thấy mục tiêu phù hợp.
              </div>
            ) : (
              filteredGoals.map((g) => {
                const isSelected =
                  g.id === currentGoalId || g.code === currentGoalId;
                return (
                  <button
                    key={g.id || g.code}
                    type="button"
                    onClick={() => handleSelectGoal(g)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-none transition-colors cursor-pointer text-[13px]',
                      isSelected
                        ? 'bg-muted text-foreground font-medium'
                        : 'hover:bg-muted/60 text-foreground',
                    )}
                  >
                    <span className="shrink-0 min-w-[44px] px-1.5 py-0.5 text-[11px] font-mono font-semibold text-center bg-muted border border-border text-foreground rounded-none">
                      {g.code}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1 leading-tight">
                      <span className="truncate font-medium">{g.title}</span>
                      <span className="text-[11.5px] text-muted-foreground truncate">
                        {g.indicatorCode
                          ? g.indicatorCode
                          : 'Chưa có chỉ số'}
                        {g.domainLabel ? ` · ${g.domainLabel}` : ''}
                      </span>
                    </div>
                    {isSelected && (
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

          {/* Footer: Quay lại danh sách ngân hàng mục tiêu */}
          <div className="border-t border-border p-1.5 bg-muted/20">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate(`/curriculum/goals/${yearId}/${ageGroup}`);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer rounded-none"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
              <span>Quay lại ngân hàng mục tiêu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalCommandMenu;
