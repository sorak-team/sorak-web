import React, { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/shared/lib/utils';
import { exportSingleChartPng } from '../services/who-growth-export.service';

// WHO Child Growth Standards (0–72 months) Reference Points
// Data points based on official WHO standards for Height-for-age (cm) and Weight-for-age (kg)
const WHO_DATA = {
  girl: {
    height: [
      { month: 0,  sd_n3: 43.6, sd_n2: 45.4, med: 49.1, sd_p2: 52.9, sd_p3: 54.7 },
      { month: 6,  sd_n3: 59.5, sd_n2: 61.5, med: 65.7, sd_p2: 70.0, sd_p3: 72.1 },
      { month: 12, sd_n3: 66.3, sd_n2: 68.9, med: 74.0, sd_p2: 79.2, sd_p3: 81.7 },
      { month: 18, sd_n3: 72.8, sd_n2: 74.9, med: 80.7, sd_p2: 85.7, sd_p3: 88.2 },
      { month: 24, sd_n3: 77.5, sd_n2: 80.0, med: 86.4, sd_p2: 92.0, sd_p3: 94.6 },
      { month: 30, sd_n3: 82.3, sd_n2: 85.0, med: 91.2, sd_p2: 97.4, sd_p3: 100.2 },
      { month: 36, sd_n3: 86.8, sd_n2: 89.8, med: 95.1, sd_p2: 101.6, sd_p3: 104.7 },
      { month: 42, sd_n3: 90.9, sd_n2: 93.9, med: 99.0, sd_p2: 105.7, sd_p3: 109.0 },
      { month: 48, sd_n3: 94.8, sd_n2: 97.6, med: 102.7, sd_p2: 109.4, sd_p3: 112.9 },
      { month: 54, sd_n3: 98.4, sd_n2: 101.3, med: 106.2, sd_p2: 113.2, sd_p3: 116.8 },
      { month: 60, sd_n3: 101.8, sd_n2: 104.7, med: 109.4, sd_p2: 116.8, sd_p3: 120.4 },
      { month: 66, sd_n3: 105.0, sd_n2: 108.0, med: 112.5, sd_p2: 120.2, sd_p3: 123.9 },
      { month: 72, sd_n3: 108.0, sd_n2: 111.0, med: 115.5, sd_p2: 123.5, sd_p3: 127.4 },
    ],
    weight: [
      { month: 0,  sd_n3: 2.0,  sd_n2: 2.4,  med: 3.2,  sd_p2: 4.2,  sd_p3: 4.8 },
      { month: 6,  sd_n3: 5.4,  sd_n2: 5.9,  med: 7.3,  sd_p2: 9.3,  sd_p3: 10.4 },
      { month: 12, sd_n3: 6.3,  sd_n2: 7.0,  med: 8.9,  sd_p2: 11.5, sd_p3: 12.8 },
      { month: 18, sd_n3: 7.4,  sd_n2: 8.1,  med: 10.2, sd_p2: 13.2, sd_p3: 14.8 },
      { month: 24, sd_n3: 8.5,  sd_n2: 9.2,  med: 11.5, sd_p2: 14.8, sd_p3: 16.5 },
      { month: 30, sd_n3: 9.4,  sd_n2: 10.2, med: 12.7, sd_p2: 16.4, sd_p3: 18.4 },
      { month: 36, sd_n3: 10.3, sd_n2: 11.3, med: 13.9, sd_p2: 18.1, sd_p3: 20.2 },
      { month: 42, sd_n3: 11.2, sd_n2: 12.2, med: 15.0, sd_p2: 19.8, sd_p3: 22.1 },
      { month: 48, sd_n3: 12.0, sd_n2: 13.0, med: 16.1, sd_p2: 21.5, sd_p3: 24.2 },
      { month: 54, sd_n3: 12.8, sd_n2: 13.9, med: 17.2, sd_p2: 23.2, sd_p3: 26.2 },
      { month: 60, sd_n3: 13.6, sd_n2: 14.8, med: 18.2, sd_p2: 24.9, sd_p3: 28.2 },
      { month: 66, sd_n3: 14.5, sd_n2: 15.7, med: 19.3, sd_p2: 26.6, sd_p3: 30.3 },
      { month: 72, sd_n3: 15.3, sd_n2: 16.6, med: 20.2, sd_p2: 28.5, sd_p3: 32.5 },
    ],
  },
  boy: {
    height: [
      { month: 0,  sd_n3: 44.2, sd_n2: 46.1, med: 49.9, sd_p2: 53.7, sd_p3: 55.6 },
      { month: 6,  sd_n3: 61.2, sd_n2: 63.3, med: 67.6, sd_p2: 71.9, sd_p3: 74.0 },
      { month: 12, sd_n3: 68.6, sd_n2: 71.0, med: 75.7, sd_p2: 80.5, sd_p3: 82.9 },
      { month: 18, sd_n3: 74.9, sd_n2: 77.2, med: 82.3, sd_p2: 87.3, sd_p3: 89.8 },
      { month: 24, sd_n3: 80.0, sd_n2: 82.5, med: 87.8, sd_p2: 93.2, sd_p3: 95.8 },
      { month: 30, sd_n3: 84.4, sd_n2: 87.1, med: 92.4, sd_p2: 98.3, sd_p3: 101.1 },
      { month: 36, sd_n3: 88.7, sd_n2: 91.4, med: 96.1, sd_p2: 102.7, sd_p3: 105.7 },
      { month: 42, sd_n3: 92.5, sd_n2: 95.4, med: 100.2, sd_p2: 106.8, sd_p3: 109.9 },
      { month: 48, sd_n3: 96.0, sd_n2: 99.1, med: 103.3, sd_p2: 110.7, sd_p3: 113.9 },
      { month: 54, sd_n3: 99.4, sd_n2: 102.6, med: 106.3, sd_p2: 114.5, sd_p3: 117.8 },
      { month: 60, sd_n3: 102.5, sd_n2: 105.8, med: 110.0, sd_p2: 118.2, sd_p3: 121.6 },
      { month: 66, sd_n3: 105.5, sd_n2: 108.9, med: 113.4, sd_p2: 121.7, sd_p3: 125.2 },
      { month: 72, sd_n3: 108.3, sd_n2: 111.8, med: 116.5, sd_p2: 125.0, sd_p3: 128.7 },
    ],
    weight: [
      { month: 0,  sd_n3: 2.1,  sd_n2: 2.5,  med: 3.3,  sd_p2: 4.4,  sd_p3: 5.0 },
      { month: 6,  sd_n3: 5.9,  sd_n2: 6.4,  med: 7.9,  sd_p2: 9.8,  sd_p3: 10.9 },
      { month: 12, sd_n3: 7.1,  sd_n2: 7.7,  med: 9.6,  sd_p2: 12.0, sd_p3: 13.3 },
      { month: 18, sd_n3: 8.2,  sd_n2: 8.8,  med: 10.9, sd_p2: 13.7, sd_p3: 15.3 },
      { month: 24, sd_n3: 9.1,  sd_n2: 9.7,  med: 12.2, sd_p2: 15.3, sd_p3: 17.1 },
      { month: 30, sd_n3: 9.9,  sd_n2: 10.7, med: 13.3, sd_p2: 16.9, sd_p3: 19.0 },
      { month: 36, sd_n3: 10.8, sd_n2: 11.6, med: 14.3, sd_p2: 18.3, sd_p3: 20.7 },
      { month: 42, sd_n3: 11.7, sd_n2: 12.5, med: 15.3, sd_p2: 19.7, sd_p3: 22.4 },
      { month: 48, sd_n3: 12.4, sd_n2: 13.3, med: 16.3, sd_p2: 21.2, sd_p3: 24.2 },
      { month: 54, sd_n3: 13.2, sd_n2: 14.2, med: 17.3, sd_p2: 22.7, sd_p3: 26.2 },
      { month: 60, sd_n3: 14.1, sd_n2: 15.2, med: 18.3, sd_p2: 24.2, sd_p3: 28.2 },
      { month: 66, sd_n3: 15.0, sd_n2: 16.1, med: 19.4, sd_p2: 25.8, sd_p3: 30.2 },
      { month: 72, sd_n3: 15.9, sd_n2: 17.1, med: 20.5, sd_p2: 27.4, sd_p3: 32.3 },
    ],
  },
};

// Generates smooth SVG cubic Bezier curve string through given points [{x, y}]
function createSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const tension = 0.2;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Generates a shaded area polygon path between topPoints and bottomPoints
function createAreaPath(topPoints, bottomPoints) {
  const topPath = createSplinePath(topPoints);
  const bottomPointsReversed = [...bottomPoints].reverse();
  const bottomPath = createSplinePath(bottomPointsReversed);

  const bottomWithoutM = bottomPath.replace(/^M\s*[\d.]+\s*[\d.]+/, '');
  return `${topPath} L ${bottomPointsReversed[0].x.toFixed(1)} ${bottomPointsReversed[0].y.toFixed(1)} ${bottomWithoutM} Z`;
}

function parseDateFlexible(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  if (typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const partsVN = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (partsVN) {
    const d = parseInt(partsVN[1], 10);
    const m = parseInt(partsVN[2], 10) - 1;
    const y = parseInt(partsVN[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Helper to evaluate child growth according to Ministry of Health & WHO standards
 * 2 distinct columns (Chiều cao / Tuổi & Cân nặng / Thể trạng)
 */
export function evaluateChildGrowth({ heightZ, weightZ, bmiZ }) {
  const hz = heightZ != null ? Number(heightZ) : null;
  const wz = weightZ != null ? Number(weightZ) : null;
  const bz = bmiZ != null ? Number(bmiZ) : null;

  // 1. Chiều cao theo tuổi (HAZ)
  let heightEvaluation = {
    label: 'Đạt chuẩn',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };
  if (hz != null && !isNaN(hz)) {
    if (hz < -3) {
      heightEvaluation = {
        label: 'Thấp còi độ 2 (nặng)',
        color: 'rose',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      };
    } else if (hz < -2) {
      heightEvaluation = {
        label: 'Thấp còi độ 1',
        color: 'amber',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      };
    } else if (hz > 2) {
      heightEvaluation = {
        label: 'Cao hơn tuổi',
        color: 'blue',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    }
  }

  // 2. Cân nặng / Thể trạng (WAZ & BAZ)
  let weightEvaluation = {
    label: 'Đạt chuẩn',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  };

  if (bz != null && !isNaN(bz)) {
    if (bz > 3) {
      weightEvaluation = {
        label: 'Béo phì',
        color: 'rose',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      };
    } else if (bz > 2) {
      weightEvaluation = {
        label: 'Thừa cân',
        color: 'rose',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      };
    } else if (bz > 1.5 && (wz == null || wz > 1.5)) {
      weightEvaluation = {
        label: 'Nguy cơ thừa cân',
        color: 'amber',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      };
    } else if (bz < -3) {
      weightEvaluation = {
        label: 'Gầy còm nặng',
        color: 'rose',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      };
    } else if (bz < -2) {
      weightEvaluation = {
        label: 'Gầy còm',
        color: 'amber',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      };
    }
  }

  // Nếu BMI đạt chuẩn, đối chiếu thêm cân nặng theo tuổi (WAZ)
  if (weightEvaluation.color === 'emerald' && wz != null && !isNaN(wz)) {
    if (wz < -3) {
      weightEvaluation = {
        label: 'Suy dinh dưỡng nặng',
        color: 'rose',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      };
    } else if (wz < -2) {
      weightEvaluation = {
        label: 'Nhẹ cân',
        color: 'amber',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      };
    } else if (wz > 2) {
      weightEvaluation = {
        label: 'Cân nặng cao hơn tuổi',
        color: 'blue',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    }
  }

  return { heightEvaluation, weightEvaluation };
}

export function WhoGrowthCharts({ student, healthData, hideCharts = false, highlightedId = null }) {
  // Determine standard reference: girl or boy
  const isGirl = useMemo(() => {
    const g = String(student?.gender || '').toLowerCase();
    return g.includes('nữ') || g.includes('female') || g.includes('gái');
  }, [student?.gender]);

  const [activeTooltip, setActiveTooltip] = useState(null);
  const heightSvgRef = useRef(null);
  const weightSvgRef = useRef(null);
  const [exportingChart, setExportingChart] = useState(null);

  const minMonth = 24;
  const maxMonth = 72;
  const data = isGirl ? WHO_DATA.girl : WHO_DATA.boy;

  // Chart dimensions & margins
  const svgWidth = 1100;
  const svgHeight = 320;
  const margin = { top: 38, right: 35, bottom: 35, left: 52 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // X scale: 24 to 72 months (Preschool focus, cutting off infant 0-24m)
  const getX = (month) => {
    const clamped = Math.max(minMonth, Math.min(maxMonth, month));
    return margin.left + ((clamped - minMonth) / (maxMonth - minMonth)) * chartWidth;
  };

  // Y scales
  const minH = 70;
  const maxH = 135;
  const getYHeight = (cm) => {
    const clamped = Math.max(minH, Math.min(maxH, cm));
    return margin.top + (1 - (clamped - minH) / (maxH - minH)) * chartHeight;
  };

  const minW = 7;
  const maxW = 35;
  const getYWeight = (kg) => {
    const clamped = Math.max(minW, Math.min(maxW, kg));
    return margin.top + (1 - (clamped - minW) / (maxW - minW)) * chartHeight;
  };

  // Calculate student age in months for measurement points
  const studentPoints = useMemo(() => {
    const history = healthData?.history || [];
    if (!history.length) return [];

    const dob = parseDateFlexible(student?.dateOfBirth || student?.dob);
    const baseAge = 36;

    const sorted = [...history]
      .filter((r) => (Number(r.height) > 0 || Number(r.weight) > 0) && r.date !== 'Chưa đo')
      .sort((a, b) => {
        const da = parseDateFlexible(a.date || a.assessmentDate || a.dateFormatted);
        const db = parseDateFlexible(b.date || b.assessmentDate || b.dateFormatted);
        if (da && db) return da.getTime() - db.getTime();
        return (a.roundIndex || 0) - (b.roundIndex || 0);
      });

    const oldestDate = parseDateFlexible(sorted[0]?.date || sorted[0]?.assessmentDate || sorted[0]?.dateFormatted);

    const mapped = sorted.map((record, idx) => {
      const recordDate = parseDateFlexible(record.date || record.assessmentDate || record.dateFormatted);
      let ageInMonths;

      if (dob && recordDate) {
        const diffMs = recordDate.getTime() - dob.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        ageInMonths = Math.max(minMonth, Math.min(maxMonth, Number((diffDays / 30.4375).toFixed(2))));
      } else if (recordDate && oldestDate) {
        const deltaMonths = (recordDate.getTime() - oldestDate.getTime()) / (86400000 * 30.4375);
        ageInMonths = Math.max(minMonth, Math.min(maxMonth, Number((baseAge + deltaMonths).toFixed(2))));
      } else {
        ageInMonths = baseAge + idx * 1.5;
      }

      const rIndex = record.roundIndex != null ? record.roundIndex : (idx + 1);
      const roundName = record.roundName || `Đợt ${rIndex}`;
      const rawX = getX(ageInMonths);

      return {
        ...record,
        roundIndex: rIndex,
        roundName,
        ageInMonths,
        rawX,
        heightY: getYHeight(Number(record.height) || 90),
        weightY: getYWeight(Number(record.weight) || 14),
      };
    });

    const minSpacing = 28;
    for (let i = 1; i < mapped.length; i++) {
      if (mapped[i].rawX - mapped[i - 1].rawX < minSpacing) {
        mapped[i].rawX = mapped[i - 1].rawX + minSpacing;
      }
    }

    return mapped.map((item) => ({
      ...item,
      heightX: item.rawX,
      weightX: item.rawX,
    }));
  }, [healthData?.history, student?.dateOfBirth, student?.dob, chartWidth, chartHeight]);

  const latestPoint = studentPoints[studentPoints.length - 1] || null;

  // Single chart PNG export (pure SVG-to-Canvas, 0% failure rate)
  const handleExportChartPng = async (type) => {
    const svgEl = type === 'height' ? heightSvgRef.current : weightSvgRef.current;
    if (!svgEl) {
      toast.error('Chưa tải xong biểu đồ để xuất ảnh');
      return;
    }
    const typeLabel = type === 'height' ? 'Chiều cao theo tuổi' : 'Cân nặng theo tuổi';

    try {
      setExportingChart(type);
      toast.loading(`Đang xuất ảnh biểu đồ ${typeLabel}...`, { id: `export-chart-${type}` });

      await exportSingleChartPng({
        svgElement: svgEl,
        type,
        student,
        latestPoint,
        studentPoints,
        isGirl,
      });

      toast.success(`Đã xuất ảnh biểu đồ ${typeLabel} thành công!`, { id: `export-chart-${type}` });
    } catch (err) {
      console.error('Error exporting chart to PNG:', err);
      toast.error(`Không thể xuất ảnh biểu đồ: ${err.message || 'Lỗi xử lý'}`, { id: `export-chart-${type}` });
    } finally {
      setExportingChart(null);
    }
  };

  // X ticks: 24, 30, 36, 42, 48, 54, 60, 66, 72 (every 6 months)
  const xTicks = [24, 30, 36, 42, 48, 54, 60, 66, 72];

  // Helper to render Height SVG chart with bulletproof explicit SVG attributes (zero black boxes)
  const renderHeightChart = () => {
    const hData = data.height.filter((d) => d.month >= minMonth);
    const topCapPoints = hData.map((d) => ({ x: getX(d.month), y: margin.top }));
    const p3Points = hData.map((d) => ({ x: getX(d.month), y: getYHeight(d.sd_p3) }));
    const p2Points = hData.map((d) => ({ x: getX(d.month), y: getYHeight(d.sd_p2) }));
    const medPoints = hData.map((d) => ({ x: getX(d.month), y: getYHeight(d.med) }));
    const n2Points = hData.map((d) => ({ x: getX(d.month), y: getYHeight(d.sd_n2) }));
    const n3Points = hData.map((d) => ({ x: getX(d.month), y: getYHeight(d.sd_n3) }));
    const bottomCapPoints = hData.map((d) => ({ x: getX(d.month), y: margin.top + chartHeight }));

    const areaYellow = createAreaPath(topCapPoints, p2Points);
    const areaBlue = createAreaPath(p2Points, n2Points);
    const areaPink1 = createAreaPath(n2Points, n3Points);
    const areaPink2 = createAreaPath(n3Points, bottomCapPoints);

    const pathP3 = createSplinePath(p3Points);
    const pathP2 = createSplinePath(p2Points);
    const pathMed = createSplinePath(medPoints);
    const pathN2 = createSplinePath(n2Points);
    const pathN3 = createSplinePath(n3Points);

    const yTicks = [75, 90, 105, 120, 135];

    return (
      <svg
        ref={heightSvgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto select-none"
        style={{ minWidth: '760px' }}
      >
        {/* Shaded WHO Bands */}
        <path d={areaYellow} fill="#FEF9C3" fillOpacity="0.85" />
        <path d={areaBlue} fill="#D6F1FD" fillOpacity="0.85" />
        <path d={areaPink1} fill="#FED7AA" fillOpacity="0.85" />
        <path d={areaPink2} fill="#EE7D8D" fillOpacity="0.85" />

        {/* Horizontal gridlines */}
        {yTicks.map((val) => {
          const y = getYHeight(val);
          return (
            <g key={val}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
                stroke="#94A3B8"
                strokeOpacity="0.25"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <text
                x={margin.left - 8}
                y={y + 3.5}
                textAnchor="end"
                fill="#64748B"
                fontSize="10px"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Y Axis Unit */}
        <text
          x={margin.left - 8}
          y={margin.top - 12}
          textAnchor="end"
          fill="#475569"
          fontSize="10px"
          fontWeight="600"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          cm
        </text>

        {/* Vertical Month gridlines & ticks */}
        {xTicks.map((month) => {
          const x = getX(month);
          return (
            <g key={month}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + chartHeight}
                stroke="#94A3B8"
                strokeOpacity="0.25"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
              <text
                x={x}
                y={margin.top + chartHeight + 16}
                textAnchor="middle"
                fill="#64748B"
                fontSize="10px"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              >
                {month}
              </text>
            </g>
          );
        })}

        {/* X Axis Label */}
        <text
          x={margin.left + chartWidth / 2}
          y={margin.top + chartHeight + 30}
          textAnchor="middle"
          fill="#64748B"
          fontSize="10px"
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          Tháng tuổi
        </text>

        {/* Curve boundary lines */}
        <path d={pathP3} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d={pathP2} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d={pathN2} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d={pathN3} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />

        {/* Median Green Line (0 SD) */}
        <path d={pathMed} fill="none" stroke="#16A34A" strokeWidth="1.8" />

        {/* Right SD Labels at month 72 */}
        {(() => {
          const last = hData[hData.length - 1];
          const rx = margin.left + chartWidth + 7;
          return (
            <g fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" fontSize="10px" fontWeight="600">
              <text x={rx} y={getYHeight(last.sd_p3) + 3.5} fill="#475569">
                3
              </text>
              <text x={rx} y={getYHeight(last.sd_p2) + 3.5} fill="#475569">
                2
              </text>
              <text x={rx} y={getYHeight(last.med) + 3.5} fill="#16A34A" fontWeight="700">
                0
              </text>
              <text x={rx} y={getYHeight(last.sd_n2) + 3.5} fill="#475569">
                -2
              </text>
              <text x={rx} y={getYHeight(last.sd_n3) + 3.5} fill="#475569">
                -3
              </text>
            </g>
          );
        })()}

        {/* Student Connecting Polyline */}
        {studentPoints.length > 1 && (
          <path
            d={studentPoints.reduce(
              (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.heightX.toFixed(1)} ${p.heightY.toFixed(1)}`,
              ''
            )}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Student Measurement Points */}
        {studentPoints.map((pt, idx) => {
          const isLatest = idx === studentPoints.length - 1;
          const isHovered = activeTooltip?.id === `h-${pt.id}` || String(highlightedId) === String(pt.id);
          return (
            <g
              key={`h-${pt.id}`}
              className="cursor-pointer"
              onMouseEnter={() => {
                const rawHz = pt.heightZscore ?? pt.zscoreHeight;
                const hz = rawHz != null ? Number(rawHz) : null;
                let heightStatus = 'Chiều cao chuẩn';
                if (hz != null && !isNaN(hz)) {
                  if (hz < -3) heightStatus = 'Thấp còi độ 2';
                  else if (hz < -2) heightStatus = 'Thấp còi độ 1';
                  else if (hz > 2) heightStatus = 'Cao hơn tuổi';
                }
                setActiveTooltip({
                  chart: 'height',
                  id: `h-${pt.id}`,
                  x: pt.heightX,
                  y: pt.heightY,
                  roundName: pt.roundName || `Đợt ${idx + 1}`,
                  date: pt.dateFormatted || pt.date || '',
                  value: `${pt.height} cm`,
                  age: `${pt.ageInMonths} tháng`,
                  classification: heightStatus,
                  zscore: hz != null && !isNaN(hz) ? `Z: ${hz > 0 ? '+' : ''}${hz.toFixed(2)} SD` : null,
                  isLatest,
                });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <circle cx={pt.heightX} cy={pt.heightY} r="14" fill="transparent" />

              {isLatest && !isHovered && (
                <circle
                  cx={pt.heightX}
                  cy={pt.heightY}
                  r="7.5"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="1.2"
                  strokeDasharray="2.5 2"
                  strokeOpacity="0.75"
                />
              )}

              {isHovered && (
                <circle
                  cx={pt.heightX}
                  cy={pt.heightY}
                  r="9.5"
                  fill="#2563EB"
                  fillOpacity="0.2"
                />
              )}

              {/* Dot label badge: Đ1, Đ2, ... (Explicit SVG attributes prevent black box fallback) */}
              <g className="select-none pointer-events-none">
                <rect
                  x={pt.heightX - 12}
                  y={pt.heightY - 21}
                  width="24"
                  height="13"
                  rx="2"
                  fill={isHovered ? '#2563EB' : isLatest ? '#0F172A' : '#FFFFFF'}
                  stroke={isHovered ? '#2563EB' : isLatest ? '#0F172A' : '#CBD5E1'}
                  strokeWidth="1"
                />
                <text
                  x={pt.heightX}
                  y={pt.heightY - 11}
                  textAnchor="middle"
                  fill={isHovered || isLatest ? '#FFFFFF' : '#334155'}
                  fontSize="9px"
                  fontWeight="700"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  Đ{pt.roundIndex || idx + 1}
                </text>
              </g>

              {/* Crisp solid blue dot with clean white border */}
              <circle
                cx={pt.heightX}
                cy={pt.heightY}
                r={isHovered ? 5.5 : 4}
                fill={isLatest ? '#2563EB' : '#3B82F6'}
                stroke="#FFFFFF"
                strokeWidth={isHovered ? 2.5 : 2}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  // Helper to render Weight SVG chart with bulletproof explicit SVG attributes (zero black boxes)
  const renderWeightChart = () => {
    const wData = data.weight.filter((d) => d.month >= minMonth);
    const topCapPoints = wData.map((d) => ({ x: getX(d.month), y: margin.top }));
    const p3Points = wData.map((d) => ({ x: getX(d.month), y: getYWeight(d.sd_p3) }));
    const p2Points = wData.map((d) => ({ x: getX(d.month), y: getYWeight(d.sd_p2) }));
    const medPoints = wData.map((d) => ({ x: getX(d.month), y: getYWeight(d.med) }));
    const n2Points = wData.map((d) => ({ x: getX(d.month), y: getYWeight(d.sd_n2) }));
    const n3Points = wData.map((d) => ({ x: getX(d.month), y: getYWeight(d.sd_n3) }));
    const bottomCapPoints = wData.map((d) => ({ x: getX(d.month), y: margin.top + chartHeight }));

    const areaYellow = createAreaPath(topCapPoints, p2Points);
    const areaBlue = createAreaPath(p2Points, n2Points);
    const areaPink1 = createAreaPath(n2Points, n3Points);
    const areaPink2 = createAreaPath(n3Points, bottomCapPoints);

    const pathP3 = createSplinePath(p3Points);
    const pathP2 = createSplinePath(p2Points);
    const pathMed = createSplinePath(medPoints);
    const pathN2 = createSplinePath(n2Points);
    const pathN3 = createSplinePath(n3Points);

    const yTicks = [7, 14, 21, 28, 35];

    return (
      <svg
        ref={weightSvgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto select-none"
        style={{ minWidth: '760px' }}
      >
        {/* Shaded WHO Bands */}
        <path d={areaYellow} fill="#FEF9C3" fillOpacity="0.85" />
        <path d={areaBlue} fill="#D6F1FD" fillOpacity="0.85" />
        <path d={areaPink1} fill="#FED7AA" fillOpacity="0.85" />
        <path d={areaPink2} fill="#EE7D8D" fillOpacity="0.85" />

        {/* Horizontal gridlines */}
        {yTicks.map((val) => {
          const y = getYWeight(val);
          return (
            <g key={val}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
                stroke="#94A3B8"
                strokeOpacity="0.25"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <text
                x={margin.left - 8}
                y={y + 3.5}
                textAnchor="end"
                fill="#64748B"
                fontSize="10px"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Y Axis Unit */}
        <text
          x={margin.left - 8}
          y={margin.top - 12}
          textAnchor="end"
          fill="#475569"
          fontSize="10px"
          fontWeight="600"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          kg
        </text>

        {/* Vertical Month gridlines & ticks */}
        {xTicks.map((month) => {
          const x = getX(month);
          return (
            <g key={month}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + chartHeight}
                stroke="#94A3B8"
                strokeOpacity="0.25"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
              <text
                x={x}
                y={margin.top + chartHeight + 16}
                textAnchor="middle"
                fill="#64748B"
                fontSize="10px"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              >
                {month}
              </text>
            </g>
          );
        })}

        {/* X Axis Label */}
        <text
          x={margin.left + chartWidth / 2}
          y={margin.top + chartHeight + 30}
          textAnchor="middle"
          fill="#64748B"
          fontSize="10px"
          fontWeight="500"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          Tháng tuổi
        </text>

        {/* Curve boundary lines */}
        <path d={pathP3} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d={pathP2} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d={pathN2} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />
        <path d={pathN3} fill="none" stroke="#64748B" strokeWidth="0.9" strokeOpacity="0.45" />

        {/* Median Green Line (0 SD) */}
        <path d={pathMed} fill="none" stroke="#16A34A" strokeWidth="1.8" />

        {/* Right SD Labels at month 72 */}
        {(() => {
          const last = wData[wData.length - 1];
          const rx = margin.left + chartWidth + 7;
          return (
            <g fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" fontSize="10px" fontWeight="600">
              <text x={rx} y={getYWeight(last.sd_p3) + 3.5} fill="#475569">
                3
              </text>
              <text x={rx} y={getYWeight(last.sd_p2) + 3.5} fill="#475569">
                2
              </text>
              <text x={rx} y={getYWeight(last.med) + 3.5} fill="#16A34A" fontWeight="700">
                0
              </text>
              <text x={rx} y={getYWeight(last.sd_n2) + 3.5} fill="#475569">
                -2
              </text>
              <text x={rx} y={getYWeight(last.sd_n3) + 3.5} fill="#475569">
                -3
              </text>
            </g>
          );
        })()}

        {/* Student Connecting Polyline */}
        {studentPoints.length > 1 && (
          <path
            d={studentPoints.reduce(
              (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.weightX.toFixed(1)} ${p.weightY.toFixed(1)}`,
              ''
            )}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Student Measurement Points */}
        {studentPoints.map((pt, idx) => {
          const isLatest = idx === studentPoints.length - 1;
          const isHovered = activeTooltip?.id === `w-${pt.id}` || String(highlightedId) === String(pt.id);
          return (
            <g
              key={`w-${pt.id}`}
              className="cursor-pointer"
              onMouseEnter={() => {
                const rawWz = pt.weightZscore ?? pt.zscoreWeight;
                const wz = rawWz != null ? Number(rawWz) : null;
                let weightStatus = 'Cân nặng chuẩn';
                if (wz != null && !isNaN(wz)) {
                  if (wz < -3) weightStatus = 'Suy dinh dưỡng nặng';
                  else if (wz < -2) weightStatus = 'Suy dinh dưỡng vừa';
                  else if (wz > 2) weightStatus = 'Cân nặng cao hơn tuổi';
                }
                setActiveTooltip({
                  chart: 'weight',
                  id: `w-${pt.id}`,
                  x: pt.weightX,
                  y: pt.weightY,
                  roundName: pt.roundName || `Đợt ${idx + 1}`,
                  date: pt.dateFormatted || pt.date || '',
                  value: `${pt.weight} kg`,
                  age: `${pt.ageInMonths} tháng`,
                  classification: weightStatus,
                  zscore: wz != null && !isNaN(wz) ? `Z: ${wz > 0 ? '+' : ''}${wz.toFixed(2)} SD` : null,
                  isLatest,
                });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <circle cx={pt.weightX} cy={pt.weightY} r="14" fill="transparent" />

              {isLatest && !isHovered && (
                <circle
                  cx={pt.weightX}
                  cy={pt.weightY}
                  r="7.5"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="1.2"
                  strokeDasharray="2.5 2"
                  strokeOpacity="0.75"
                />
              )}

              {isHovered && (
                <circle
                  cx={pt.weightX}
                  cy={pt.weightY}
                  r="9.5"
                  fill="#2563EB"
                  fillOpacity="0.2"
                />
              )}

              {/* Dot label badge: Đ1, Đ2, ... (Explicit SVG attributes prevent black box fallback) */}
              <g className="select-none pointer-events-none">
                <rect
                  x={pt.weightX - 12}
                  y={pt.weightY - 21}
                  width="24"
                  height="13"
                  rx="2"
                  fill={isHovered ? '#2563EB' : isLatest ? '#0F172A' : '#FFFFFF'}
                  stroke={isHovered ? '#2563EB' : isLatest ? '#0F172A' : '#CBD5E1'}
                  strokeWidth="1"
                />
                <text
                  x={pt.weightX}
                  y={pt.weightY - 11}
                  textAnchor="middle"
                  fill={isHovered || isLatest ? '#FFFFFF' : '#334155'}
                  fontSize="9px"
                  fontWeight="700"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  Đ{pt.roundIndex || idx + 1}
                </text>
              </g>

              {/* Crisp solid blue dot with clean white border */}
              <circle
                cx={pt.weightX}
                cy={pt.weightY}
                r={isHovered ? 5.5 : 4}
                fill={isLatest ? '#2563EB' : '#3B82F6'}
                stroke="#FFFFFF"
                strokeWidth={isHovered ? 2.5 : 2}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  // Render clean, minimalist white popover with concise text
  const renderTooltipOverlay = (tooltip) => {
    if (!tooltip) return null;

    const pctX = (tooltip.x / svgWidth) * 100;
    const pctY = (tooltip.y / svgHeight) * 100;
    const isNearTop = pctY < 32;

    let translateX = '-translate-x-1/2';
    let caretLeft = '50%';
    if (pctX < 18) {
      translateX = '-translate-x-[12%]';
      caretLeft = '18%';
    } else if (pctX > 82) {
      translateX = '-translate-x-[88%]';
      caretLeft = '82%';
    }

    const cleanClassification = (tooltip.classification || '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim() || 'Bình thường';

    const cleanAge = (tooltip.age || '').replace(/\s*tuổi/g, '').trim();

    return (
      <div
        style={{
          left: `${pctX}%`,
          top: `${pctY}%`,
        }}
        className={`absolute z-30 pointer-events-none select-none transition-all duration-75 ${translateX} ${
          isNearTop ? 'translate-y-2.5' : '-translate-y-full -mt-2.5'
        }`}
      >
        <div className="relative w-[215px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-md shadow-lg border border-slate-200/90 dark:border-slate-800 px-3 py-2 text-left font-sans">
          <div
            style={{ left: caretLeft }}
            className={`absolute size-2 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 rotate-45 -translate-x-1/2 ${
              isNearTop
                ? '-top-1 border-l border-t'
                : '-bottom-1 border-r border-b'
            }`}
          />

          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 text-[10px]">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {tooltip.roundName}
            </span>
            <span className="font-mono text-slate-400 dark:text-slate-500">
              {tooltip.date}
            </span>
          </div>

          <div className="pt-1.5 flex items-baseline justify-between">
            <span className="text-[14px] font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {tooltip.value}
            </span>
            <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
              {cleanAge}
            </span>
          </div>

          <div className="pt-1 flex items-center justify-between gap-1.5 text-[10.5px]">
            <span className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
              {cleanClassification}
            </span>
            {tooltip.zscore && (
              <span className="font-mono text-[9.5px] text-slate-400 dark:text-slate-500 shrink-0">
                {tooltip.zscore}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" data-name="WHO Growth Monitoring">
      {/* 2. WHO Growth Charts (Height & Weight) */}
      {!hideCharts && (
        <div className="space-y-4">
          {/* Chart 1: Height-for-age */}
          <div className="border border-border bg-card shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-card">
              <div>
                <h4 className="text-[14px] font-semibold text-foreground">
                  Chiều cao theo tuổi · {isGirl ? 'Bé gái' : 'Bé trai'}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tham chiếu WHO · Chiều cao (cm) · 24–72 tháng (Độ tuổi Mầm non)
                  {studentPoints.length > 0 && (
                    <span className="text-primary font-medium ml-1.5">
                      · Hiển thị đầy đủ {studentPoints.length} đợt đo (Đ1 → Đ{studentPoints.length})
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                  {latestPoint
                    ? `Đo gần nhất: ${latestPoint.dateFormatted || latestPoint.date || '—'} · ${latestPoint.height} cm (${latestPoint.ageInMonths} tháng)`
                    : 'Chưa có số đo'}
                </span>
                <button
                  type="button"
                  onClick={() => handleExportChartPng('height')}
                  disabled={exportingChart === 'height'}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium border border-border bg-background hover:bg-muted text-foreground rounded-none transition-colors cursor-pointer select-none disabled:opacity-50"
                  title="Xuất ảnh biểu đồ chiều cao độ phân giải cao (PNG)"
                >
                  <HugeiconsIcon icon={Download01Icon} size={13} className="text-muted-foreground" />
                  <span>{exportingChart === 'height' ? 'Đang xuất...' : 'Xuất ảnh PNG'}</span>
                </button>
              </div>
            </div>

            {/* Legend strip */}
            <div className="px-3.5 py-2 border-b border-border/60 bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#FEF9C3] border border-[#FDE047]" />
                <span className="text-foreground/90">Cao hơn so với tuổi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#D6F1FD] border border-[#7DD3FC]" />
                <span className="text-foreground/90">Chiều cao bình thường</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#FED7AA] border border-[#FDBA74]" />
                <span className="text-foreground/90">Thấp còi độ 1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#EE7D8D] border border-[#E11D48]" />
                <span className="text-foreground/90">Thấp còi độ 2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#16A34A]" />
                <span className="text-foreground/90 font-medium text-emerald-700 dark:text-emerald-400">
                  Trung vị (0)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#2563EB]" />
                <span className="text-[#2563EB] font-semibold">
                  {student?.fullName || 'Học sinh'}
                </span>
                {studentPoints.length > 0 && (
                  <span className="font-mono text-muted-foreground ml-1">
                    ({studentPoints.length} đợt đo: Đ1 → Đ{studentPoints.length})
                  </span>
                )}
              </div>
            </div>

            {/* SVG Canvas Container with HTML Tooltip Overlay */}
            <div className="p-2 sm:p-3 overflow-x-auto bg-card">
              <div className="relative min-w-[760px]">
                {renderHeightChart()}
                {activeTooltip?.chart === 'height' && renderTooltipOverlay(activeTooltip)}
              </div>
            </div>
          </div>

          {/* Chart 2: Weight-for-age */}
          <div className="border border-border bg-card shadow-xs overflow-hidden">
            {/* Header */}
            <div className="p-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-card">
              <div>
                <h4 className="text-[14px] font-semibold text-foreground">
                  Cân nặng theo tuổi · {isGirl ? 'Bé gái' : 'Bé trai'}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tham chiếu WHO · Cân nặng (kg) · 24–72 tháng (Độ tuổi Mầm non)
                  {studentPoints.length > 0 && (
                    <span className="text-primary font-medium ml-1.5">
                      · Hiển thị đầy đủ {studentPoints.length} đợt đo (Đ1 → Đ{studentPoints.length})
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                  {latestPoint
                    ? `Đo gần nhất: ${latestPoint.dateFormatted || latestPoint.date || '—'} · ${latestPoint.weight} kg (${latestPoint.ageInMonths} tháng)`
                    : 'Chưa có số đo'}
                </span>
                <button
                  type="button"
                  onClick={() => handleExportChartPng('weight')}
                  disabled={exportingChart === 'weight'}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium border border-border bg-background hover:bg-muted text-foreground rounded-none transition-colors cursor-pointer select-none disabled:opacity-50"
                  title="Xuất ảnh biểu đồ cân nặng độ phân giải cao (PNG)"
                >
                  <HugeiconsIcon icon={Download01Icon} size={13} className="text-muted-foreground" />
                  <span>{exportingChart === 'weight' ? 'Đang xuất...' : 'Xuất ảnh PNG'}</span>
                </button>
              </div>
            </div>

            {/* Legend strip */}
            <div className="px-3.5 py-2 border-b border-border/60 bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#FEF9C3] border border-[#FDE047]" />
                <span className="text-foreground/90">Cân nặng cao hơn so với tuổi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#D6F1FD] border border-[#7DD3FC]" />
                <span className="text-foreground/90">Cân nặng bình thường</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#FED7AA] border border-[#FDBA74]" />
                <span className="text-foreground/90">Suy dinh dưỡng vừa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-none bg-[#EE7D8D] border border-[#E11D48]" />
                <span className="text-foreground/90">Suy dinh dưỡng nặng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#16A34A]" />
                <span className="text-foreground/90 font-medium text-emerald-700 dark:text-emerald-400">
                  Trung vị (0)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#2563EB]" />
                <span className="text-[#2563EB] font-semibold">
                  {student?.fullName || 'Học sinh'}
                </span>
                {studentPoints.length > 0 && (
                  <span className="font-mono text-muted-foreground ml-1">
                    ({studentPoints.length} đợt đo: Đ1 → Đ{studentPoints.length})
                  </span>
                )}
              </div>
            </div>

            {/* SVG Canvas Container with HTML Tooltip Overlay */}
            <div className="p-2 sm:p-3 overflow-x-auto bg-card">
              <div className="relative min-w-[760px]">
                {renderWeightChart()}
                {activeTooltip?.chart === 'weight' && renderTooltipOverlay(activeTooltip)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reference Standards Information */}
      <div className="border border-border bg-card shadow-xs text-xs">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-card">
          <span className="text-[13px] font-semibold text-foreground">
            Căn cứ y tế & Tiêu chuẩn phát triển
          </span>
          <div className="text-[12px] text-muted-foreground font-mono">
            <span>Đối tượng: </span>
            <span className="font-medium text-foreground">{isGirl ? 'Bé gái (24–72 tháng)' : 'Bé trai (24–72 tháng)'}</span>
          </div>
        </div>

        <div className="p-4 space-y-2 text-[12px] text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground font-medium">• Quy chuẩn WHO:</strong> Bảng tăng trưởng Chiều cao và Cân nặng theo độ tuổi (24–60 tháng áp dụng <em>WHO 2006</em>; 61–72 tháng áp dụng <em>WHO 2007</em>).
          </p>
          <p>
            <strong className="text-foreground font-medium">• Quy định học đường:</strong> Thông tư liên tịch 13/2016/TTLT-BYT-BGDĐT về quản lý, theo dõi thể lực định kỳ cho học sinh mầm non.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WhoGrowthCharts;
