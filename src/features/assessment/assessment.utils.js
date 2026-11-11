const pad = (n) => String(n).padStart(2, '0');

// Ngày bắt đầu năm học 2026-2027 (Thứ Hai, ngày 07/09/2026)
export const DEFAULT_ACADEMIC_START_DATE = new Date(2026, 8, 7, 0, 0, 0, 0);

// Danh sách các tháng trong năm học 2026-2027
export const ACADEMIC_MONTHS_CONFIG = [
  { month: 9, year: 2026, label: 'Tháng 9/2026' },
  { month: 10, year: 2026, label: 'Tháng 10/2026' },
  { month: 11, year: 2026, label: 'Tháng 11/2026' },
  { month: 12, year: 2026, label: 'Tháng 12/2026' },
  { month: 1, year: 2027, label: 'Tháng 1/2027' },
  { month: 2, year: 2027, label: 'Tháng 2/2027' },
  { month: 3, year: 2027, label: 'Tháng 3/2027' },
  { month: 4, year: 2027, label: 'Tháng 4/2027' },
  { month: 5, year: 2027, label: 'Tháng 5/2027' },
];

/**
 * Tạo danh sách toàn bộ các tháng và tuần học kỳ dựa trên ngày khai giảng.
 * Quy tắc:
 * - Không tính theo ngày 1 mùng một dương lịch.
 * - Mỗi tháng học gồm đúng 4 tuần trọn vẹn (28 ngày, Thứ Hai đến Chủ Nhật).
 * - Tháng 9: 07/09/2026 -> 04/10/2026 (4 tuần)
 * - Tháng 10: 05/10/2026 -> 01/11/2026 (4 tuần)
 * - Tháng 11: 02/11/2026 -> 29/11/2026 (4 tuần)
 * ...
 */
// Danh mục chủ đề & chủ đề nhánh giáo dục mầm non chuẩn theo các tuần học kỳ 2026–2027
const ACADEMIC_THEMES_MAP = {
  '2026-9': {
    1: { themeName: 'Trường mầm non của bé', subThemeName: 'Trường mầm non thân yêu' },
    2: { themeName: 'Trường mầm non của bé', subThemeName: 'Lớp học của bé và các góc chơi' },
    3: { themeName: 'Trường mầm non của bé', subThemeName: 'Bé vui Tết Trung Thu cùng bạn' },
    4: { themeName: 'Bản thân', subThemeName: 'Tôi là ai - Giới tính và sở thích' },
  },
  '2026-10': {
    1: { themeName: 'Bản thân', subThemeName: 'Tôi là ai - Giới tính và sở thích' },
    2: { themeName: 'Bản thân', subThemeName: 'Cơ thể khỏe mạnh và các giác quan' },
    3: { themeName: 'Bản thân', subThemeName: 'Bé cần gì để lớn lên khỏe mạnh' },
    4: { themeName: 'Gia đình yêu thương', subThemeName: 'Gia đình thân yêu của bé' },
  },
  '2026-11': {
    1: { themeName: 'Gia đình yêu thương', subThemeName: 'Ngôi nhà ấm cúng của bé' },
    2: { themeName: 'Gia đình yêu thương', subThemeName: 'Đồ dùng và an toàn trong gia đình' },
    3: { themeName: 'Nghề nghiệp quanh bé', subThemeName: 'Nghề dạy học - Ơn thầy cô (20/11)' },
    4: { themeName: 'Nghề nghiệp quanh bé', subThemeName: 'Nghề y tế chăm sóc sức khỏe' },
  },
  '2026-12': {
    1: { themeName: 'Nghề nghiệp quanh bé', subThemeName: 'Nghề xây dựng và kiến trúc' },
    2: { themeName: 'Nghề nghiệp quanh bé', subThemeName: 'Nghề nông nghiệp - Bác nông dân' },
    3: { themeName: 'Thế giới động vật', subThemeName: 'Vật nuôi hiền lành trong gia đình' },
    4: { themeName: 'Thế giới động vật', subThemeName: 'Chú bộ đội của em (22/12)' },
  },
  '2027-1': {
    1: { themeName: 'Thế giới động vật', subThemeName: 'Thế giới động vật dưới nước' },
    2: { themeName: 'Thế giới động vật', subThemeName: 'Những con thú sống trong rừng' },
    3: { themeName: 'Thế giới thực vật', subThemeName: 'Tết và Mùa xuân tươi đẹp' },
    4: { themeName: 'Thế giới thực vật', subThemeName: 'Cây xanh và các loài hoa quanh bé' },
  },
  '2027-2': {
    1: { themeName: 'Thế giới thực vật', subThemeName: 'Rau, củ, quả bé yêu thích' },
    2: { themeName: 'Phương tiện giao thông', subThemeName: 'Phương tiện giao thông đường bộ' },
    3: { themeName: 'Phương tiện giao thông', subThemeName: 'Phương tiện đường thủy và đường hàng không' },
    4: { themeName: 'Phương tiện giao thông', subThemeName: 'Bé học luật lệ giao thông' },
  },
  '2027-3': {
    1: { themeName: 'Hiện tượng tự nhiên', subThemeName: 'Nắng, mưa và các mùa trong năm' },
    2: { themeName: 'Hiện tượng tự nhiên', subThemeName: 'Nước và không khí quanh bé' },
    3: { themeName: 'Nước và Mùa hè', subThemeName: 'Tiết kiệm nước sạch' },
    4: { themeName: 'Nước và Mùa hè', subThemeName: 'Mùa hè rực rỡ của bé' },
  },
  '2027-4': {
    1: { themeName: 'Quê hương - Đất nước', subThemeName: 'Quê hương Hòn Tre của bé' },
    2: { themeName: 'Quê hương - Đất nước', subThemeName: 'Thủ đô Hà Nội và Bác Hồ kính yêu' },
    3: { themeName: 'Quê hương - Đất nước', subThemeName: 'Biển đảo Việt Nam tươi đẹp' },
    4: { themeName: 'Bé lên mẫu giáo', subThemeName: 'Chào tạm biệt lớp nhà trẻ' },
  },
  '2027-5': {
    1: { themeName: 'Bé chuẩn bị lên lớp mới', subThemeName: 'Lớp mới của bé' },
    2: { themeName: 'Bé chuẩn bị lên lớp mới', subThemeName: 'Đồ dùng học tập lớp mới' },
    3: { themeName: 'Tổng kết năm học', subThemeName: 'Bé vui liên hoan cuối năm' },
    4: { themeName: 'Tổng kết năm học', subThemeName: 'Chào mùa hè vui khỏe' },
  },
};

export function getAcademicMonths(academicStartDate = DEFAULT_ACADEMIC_START_DATE) {
  const startMonday = academicStartDate instanceof Date ? academicStartDate : new Date(academicStartDate);
  const now = new Date();

  let runningStart = new Date(startMonday);
  runningStart.setHours(0, 0, 0, 0);

  return ACADEMIC_MONTHS_CONFIG.map((mObj) => {
    const weeks = [];
    const monthStart = new Date(runningStart);
    const themeKey = `${mObj.year}-${mObj.month}`;
    const monthThemeData = ACADEMIC_THEMES_MAP[themeKey] || {};

    for (let w = 1; w <= 4; w++) {
      const wStart = new Date(runningStart);
      wStart.setHours(0, 0, 0, 0);

      const wEnd = new Date(runningStart);
      wEnd.setDate(wStart.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);

      const sDay = pad(wStart.getDate());
      const sMonth = pad(wStart.getMonth() + 1);
      const sYear = wStart.getFullYear();
      const eDay = pad(wEnd.getDate());
      const eMonth = pad(wEnd.getMonth() + 1);
      const eYear = wEnd.getFullYear();

      const isCurrentWeek = now >= wStart && now <= wEnd;
      const weekTheme = monthThemeData[w] || {};

      weeks.push({
        week: w,
        startDate: wStart,
        endDate: wEnd,
        startDateStr: `${sDay}/${sMonth}/${sYear}`,
        endDateStr: `${eDay}/${eMonth}/${eYear}`,
        shortLabel: `${sDay}/${sMonth} – ${eDay}/${eMonth}`,
        rangeText: `Từ ngày ${sDay}/${sMonth}/${sYear} đến ngày ${eDay}/${eMonth}/${eYear}`,
        isCurrentWeek,
        themeName: weekTheme.themeName || null,
        subThemeName: weekTheme.subThemeName || null,
      });

      runningStart.setDate(runningStart.getDate() + 7);
    }

    const monthEnd = new Date(weeks[3].endDate);
    const isEnded = monthEnd < now;
    const isCurrent = now >= monthStart && now <= monthEnd;
    const isFuture = !isEnded && !isCurrent;

    const msDay = pad(monthStart.getDate());
    const msMonth = pad(monthStart.getMonth() + 1);
    const msYear = monthStart.getFullYear();
    const meDay = pad(monthEnd.getDate());
    const meMonth = pad(monthEnd.getMonth() + 1);
    const meYear = monthEnd.getFullYear();

    const startDateStr = `${msDay}/${msMonth}/${msYear}`;
    const endDateStr = `${meDay}/${meMonth}/${meYear}`;
    const rangeText = `Từ ngày ${startDateStr} đến ngày ${endDateStr}`;

    return {
      month: String(mObj.month),
      year: String(mObj.year),
      label: mObj.label,
      startDate: monthStart,
      endDate: monthEnd,
      startDateStr,
      endDateStr,
      rangeText,
      isEnded,
      isCurrent,
      isFuture,
      weeks,
    };
  });
}

/**
 * Lấy danh sách 4 tuần học cho một tháng cụ thể (theo lịch học kỳ)
 * @param {number|string} month Tháng (9, 10, 11, ...)
 * @param {number|string} year Năm (2026, 2027)
 * @param {Date} [academicStartDate] Ngày bắt đầu năm học
 * @returns {Array} Danh sách 4 tuần với đầy đủ ngày bắt đầu và kết thúc
 */
export function getMonthWeekRanges(month, year, academicStartDate = DEFAULT_ACADEMIC_START_DATE) {
  const numMonth = String(month);
  const numYear = String(year);
  const allMonths = getAcademicMonths(academicStartDate);
  const found = allMonths.find((m) => m.month === numMonth && m.year === numYear);
  return found ? found.weeks : [];
}

/**
 * Lấy khoảng thời gian của 1 tuần cụ thể trong tháng
 */
export function getWeekRange(month, year, weekNumber, academicStartDate = DEFAULT_ACADEMIC_START_DATE) {
  const ranges = getMonthWeekRanges(month, year, academicStartDate);
  return ranges.find((r) => r.week === Number(weekNumber)) || null;
}

/**
 * Format exam date into compact "dd/mm/yyyy" or "—"
 */
export function formatExamDateDescription(examDate, defaultYear = 2026) {
  if (!examDate || examDate === '--' || examDate === '—' || examDate === 'Chưa đánh giá' || examDate === 'Chưa có đợt đo') {
    return '—';
  }
  let str = String(examDate).trim();
  // Strip "đo ngày" or "ngày khám:" if already prefixed
  str = str.replace(/^(đo ngày|ngày khám:?)\s*/i, '').trim();

  if (!str || str === '--' || str === '—') {
    return '—';
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    return str;
  }
  if (/^\d{1,2}\/\d{1,2}$/.test(str)) {
    return `${str}/${defaultYear}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const d = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return str;
}

/**
 * Format numeric measurement with unit (e.g. 95.1 cm, 15.7 kg) or null if invalid/empty
 */
export function formatMeasurement(val, unit = '') {
  if (val == null || val === '' || val === '--' || val === '—' || val === 'Chưa đánh giá') {
    return null;
  }
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    return null;
  }
  const rounded = Math.round(num * 10) / 10;
  return unit ? `${rounded} ${unit}` : `${rounded}`;
}

export const HEALTH_COLOR_MAP = {
  emerald: {
    textColor: 'text-emerald-600 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  amber: {
    textColor: 'text-amber-600 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  rose: {
    textColor: 'text-rose-600 dark:text-rose-400',
    dotColor: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  },
  blue: {
    textColor: 'text-blue-600 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  slate: {
    textColor: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground/40',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
};

export function buildHealthEvaluation(label, color = 'emerald') {
  const meta = HEALTH_COLOR_MAP[color] || HEALTH_COLOR_MAP.emerald;
  return {
    label,
    color,
    textColor: meta.textColor,
    dotColor: meta.dotColor,
    badgeClass: meta.badgeClass,
  };
}

/**
 * Standard badge classes and labels for height & weight evaluation
 */
export function getSingleHealthEvaluation(statusLabel, type = 'height') {
  if (!statusLabel || statusLabel === 'Chưa đánh giá' || statusLabel === '--' || statusLabel === '—') {
    return buildHealthEvaluation('Chưa đánh giá', 'slate');
  }

  const clean = String(statusLabel).trim();

  // 1. Height evaluations (HAZ)
  if (type === 'height') {
    if (clean.includes('Thấp còi độ 2') || clean.includes('thấp còi độ 2')) {
      return buildHealthEvaluation('Thấp còi độ 2 (nặng)', 'rose');
    }
    if (clean.includes('Thấp còi') || clean.includes('thấp còi')) {
      return buildHealthEvaluation('Thấp còi độ 1', 'amber');
    }
    if (clean.includes('Cao hơn') || clean.includes('cao hơn')) {
      return buildHealthEvaluation('Cao hơn tuổi', 'blue');
    }
    return buildHealthEvaluation('Đạt chuẩn', 'emerald');
  }

  // 2. Weight evaluations (WAZ & BAZ)
  if (clean.includes('Béo phì') || clean.includes('béo phì')) {
    return buildHealthEvaluation('Béo phì', 'rose');
  }
  if (clean.includes('Thừa cân') || clean.includes('thừa cân')) {
    return buildHealthEvaluation('Thừa cân', 'rose');
  }
  if (clean.includes('Nguy cơ thừa cân') || clean.includes('nguy cơ thừa cân')) {
    return buildHealthEvaluation('Nguy cơ thừa cân', 'amber');
  }
  if (clean.includes('Suy dinh dưỡng nặng') || clean.includes('suy dinh dưỡng nặng')) {
    return buildHealthEvaluation('Suy dinh dưỡng nặng', 'rose');
  }
  if (clean.includes('nhẹ cân') || clean.includes('Nhẹ cân') || clean.includes('suy dinh dưỡng') || clean.includes('Suy dinh dưỡng')) {
    return buildHealthEvaluation('Suy dinh dưỡng nhẹ cân', 'amber');
  }
  if (clean.includes('Gầy còm') || clean.includes('gầy còm')) {
    return buildHealthEvaluation('Gầy còm', 'amber');
  }
  if (clean.includes('Cân nặng cao hơn') || clean.includes('cân nặng cao hơn')) {
    return buildHealthEvaluation('Cân nặng cao hơn tuổi', 'blue');
  }

  return buildHealthEvaluation('Đạt chuẩn', 'emerald');
}

/**
 * Resolves child growth into separate Height and Weight evaluations according to WHO standards,
 * matching StudentReportPage and handling both Z-scores and status classifications.
 */
export function resolveStudentHealthEvaluations(item) {
  if (!item) {
    const unassessed = buildHealthEvaluation('Chưa đánh giá', 'slate');
    return { heightEvaluation: unassessed, weightEvaluation: unassessed };
  }

  // 1. If explicit Z-scores are provided
  const hz = item.heightZ ?? item.height_for_age_zscore ?? item.zscoreHeight ?? item.heightZscore;
  const wz = item.weightZ ?? item.weight_for_age_zscore ?? item.zscoreWeight ?? item.weightZscore;
  const bz = item.bmiZ ?? item.bmi_for_age_zscore ?? item.zscoreBmi ?? item.bmiZscore;

  if (hz != null || wz != null || bz != null) {
    let heightEvaluation = buildHealthEvaluation('Đạt chuẩn', 'emerald');
    if (hz != null && !isNaN(Number(hz))) {
      const numHz = Number(hz);
      if (numHz < -3) {
        heightEvaluation = buildHealthEvaluation('Thấp còi độ 2 (nặng)', 'rose');
      } else if (numHz < -2) {
        heightEvaluation = buildHealthEvaluation('Thấp còi độ 1', 'amber');
      } else if (numHz > 2) {
        heightEvaluation = buildHealthEvaluation('Cao hơn tuổi', 'blue');
      }
    }

    let weightEvaluation = buildHealthEvaluation('Đạt chuẩn', 'emerald');
    if (bz != null && !isNaN(Number(bz))) {
      const numBz = Number(bz);
      const numWz = wz != null ? Number(wz) : null;
      if (numBz > 3) {
        weightEvaluation = buildHealthEvaluation('Béo phì', 'rose');
      } else if (numBz > 2) {
        weightEvaluation = buildHealthEvaluation('Thừa cân', 'rose');
      } else if (numBz > 1.5 && (numWz == null || numWz > 1.5)) {
        weightEvaluation = buildHealthEvaluation('Nguy cơ thừa cân', 'amber');
      } else if (numBz < -3) {
        weightEvaluation = buildHealthEvaluation('Gầy còm nặng', 'rose');
      } else if (numBz < -2) {
        weightEvaluation = buildHealthEvaluation('Gầy còm', 'amber');
      }
    }

    if (weightEvaluation.color === 'emerald' && wz != null && !isNaN(Number(wz))) {
      const numWz = Number(wz);
      if (numWz < -3) {
        weightEvaluation = buildHealthEvaluation('Suy dinh dưỡng nặng', 'rose');
      } else if (numWz < -2) {
        weightEvaluation = buildHealthEvaluation('Suy dinh dưỡng nhẹ cân', 'amber');
      } else if (numWz > 2) {
        weightEvaluation = buildHealthEvaluation('Cân nặng cao hơn tuổi', 'blue');
      }
    }

    return { heightEvaluation, weightEvaluation };
  }

  // 2. If explicit heightStatus and weightStatus are present
  if (item?.heightStatus || item?.weightStatus) {
    return {
      heightEvaluation: getSingleHealthEvaluation(item.heightStatus, 'height'),
      weightEvaluation: getSingleHealthEvaluation(item.weightStatus, 'weight'),
    };
  }

  // 3. Fallback from overall healthStatus string
  const overallStatus = item?.healthStatus || item?.status;
  if (!overallStatus || overallStatus === 'Chưa đánh giá' || overallStatus === '--' || overallStatus === '—') {
    const unassessed = buildHealthEvaluation('Chưa đánh giá', 'slate');
    return { heightEvaluation: unassessed, weightEvaluation: unassessed };
  }

  const clean = String(overallStatus)
    .replace(/\s*\(Đạt chuẩn WHO\)/gi, '')
    .replace(/\s*Đạt chuẩn WHO/gi, '')
    .trim();

  let heightEval = buildHealthEvaluation('Đạt chuẩn', 'emerald');
  let weightEval = buildHealthEvaluation('Đạt chuẩn', 'emerald');

  if (clean.includes('thấp còi độ 2') || clean.includes('Thấp còi độ 2')) {
    heightEval = buildHealthEvaluation('Thấp còi độ 2 (nặng)', 'rose');
  } else if (clean.includes('thấp còi') || clean.includes('Thấp còi')) {
    heightEval = buildHealthEvaluation('Thấp còi độ 1', 'amber');
  } else if (clean.includes('Cao hơn') || clean.includes('cao hơn')) {
    heightEval = buildHealthEvaluation('Cao hơn tuổi', 'blue');
  }

  if (clean.includes('béo phì') || clean.includes('Béo phì')) {
    weightEval = buildHealthEvaluation('Béo phì', 'rose');
  } else if (clean.includes('thừa cân') || clean.includes('Thừa cân')) {
    weightEval = buildHealthEvaluation('Thừa cân', 'rose');
  } else if (clean.includes('Nguy cơ thừa cân') || clean.includes('nguy cơ thừa cân')) {
    weightEval = buildHealthEvaluation('Nguy cơ thừa cân', 'amber');
  } else if (clean.includes('suy dinh dưỡng nặng') || clean.includes('Suy dinh dưỡng nặng')) {
    weightEval = buildHealthEvaluation('Suy dinh dưỡng nặng', 'rose');
  } else if (clean.includes('nhẹ cân') || clean.includes('Nhẹ cân') || clean.includes('suy dinh dưỡng') || clean.includes('Suy dinh dưỡng')) {
    weightEval = buildHealthEvaluation('Suy dinh dưỡng nhẹ cân', 'amber');
  } else if (clean.includes('gầy còm') || clean.includes('Gầy còm')) {
    weightEval = buildHealthEvaluation('Gầy còm', 'amber');
  } else if (clean.includes('Cân nặng cao hơn') || clean.includes('cân nặng cao hơn')) {
    weightEval = buildHealthEvaluation('Cân nặng cao hơn tuổi', 'blue');
  }

  return { heightEvaluation: heightEval, weightEvaluation: weightEval };
}
