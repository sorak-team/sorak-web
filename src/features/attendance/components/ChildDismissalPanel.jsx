import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Cancel01Icon,
  Edit02Icon,
  UndoIcon,
  MoreHorizontalIcon,
  ArrowDown01Icon,
  Tick02Icon,
  Upload01Icon,
  ArrowReloadHorizontalIcon,
  TaskDone01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { attendanceApi } from '../attendance.api';
import { uploadApi } from '@/shared/api/upload.api';
import { getTeacherAvatarUrl } from '../../teachers/teachers.store';
import { PickupAuthorizationsModal } from './PickupAuthorizationsModal';

const RELATIONSHIP_OPTIONS = [
  'Bố',
  'Mẹ',
  'Ông nội',
  'Bà nội',
  'Ông ngoại',
  'Bà ngoại',
  'Cô/Dì',
  'Chú/Bác',
  'Người được ủy quyền',
  'Khác',
];

export function getParentAvatarUrl(avatarUrl, fullName) {
  if (
    avatarUrl &&
    typeof avatarUrl === 'string' &&
    avatarUrl.trim() !== '' &&
    !avatarUrl.includes('default-avatar.webp') &&
    !avatarUrl.includes('unsplash.com') &&
    !avatarUrl.includes('api.dicebear.com')
  ) {
    return avatarUrl;
  }
  // Strip relationship prefix if present (e.g. "Bố: Trần Văn Bảo" -> "Trần Văn Bảo")
  const cleanName = (fullName || '')
    .replace(/^(bố|mẹ|ông nội|bà nội|ông ngoại|bà ngoại|cô|dì|chú|bác|anh|chị|người thân|người ủy quyền)[\s:]+/i, '')
    .trim() || fullName || 'PH';
  return getTeacherAvatarUrl(null, cleanName);
}

export function getShortRelationshipLabel(rel = '') {
  if (rel.includes('Bố') || rel.includes('Ba') || rel.includes('Cha')) return 'Bố';
  if (rel.includes('Mẹ') || rel.includes('Má')) return 'Mẹ';
  if (rel.includes('Ông')) return 'Ông';
  if (rel.includes('Bà')) return 'Bà';
  if (rel.includes('Cô')) return 'Cô';
  if (rel.includes('Dì')) return 'Dì';
  if (rel.includes('Chú')) return 'Chú';
  if (rel.includes('Bác')) return 'Bác';
  if (rel.includes('Anh')) return 'Anh';
  if (rel.includes('Chị')) return 'Chị';
  if (rel.includes('ủy quyền') || rel.includes('Ủy quyền')) return 'Ủy quyền';
  return rel || 'PH';
}

export function ChildDismissalPanel({
  classId = '5',
  date,
  slot,
  onClose,
  onTabChange,
  onDismissalChange,
  className,
  hideHeader = false,
}) {
  const { t, i18n } = useTranslation();
  const isVi = (i18n.language || 'vi').startsWith('vi');
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // MinIO Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // LocalStorage mapping: { [studentId]: { id, name, relationship, phone, citizenId } }
  const [defaultsMap, setDefaultsMap] = useState(() => {
    try {
      const raw = localStorage.getItem(`sorak_pickup_defaults_${classId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Modal custom / detail pickup state
  const [modalStudent, setModalStudent] = useState(null);
  const [activePersonTab, setActivePersonTab] = useState('CUSTOM'); // 'PARENT_<id>' | 'AUTH_<id>' | 'CUSTOM'
  const [modalForm, setModalForm] = useState({
    pickupName: '',
    pickupRelationship: 'Bố',
    pickupPhone: '',
    pickupCitizenId: '',
    pickupPhotoUrl: '',
    pickupTime: '',
    pickupNote: '',
  });

  // Lightbox preview for parent avatar or pickup photo
  const [zoomImage, setZoomImage] = useState(null);

  // Confirmation dialogs
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);

  // Pickup Authorizations Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingAuthorizationsCount = data?.summary?.pendingAuthorizationsCount || 0;

  useEffect(() => {
    if (!zoomImage) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setZoomImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomImage]);

  // Save student default to localStorage
  const saveStudentDefault = useCallback(
    (studentId, personData) => {
      try {
        const key = `sorak_pickup_defaults_${classId}`;
        const raw = localStorage.getItem(key);
        const existing = raw ? JSON.parse(raw) : {};
        const isCustom = Boolean(
          personData.isCustom ||
            (!personData.id &&
              personData.relationship !== 'Bố' &&
              personData.relationship !== 'Mẹ' &&
              !personData.isAuth)
        );
        const updated = {
          ...existing,
          [studentId]: {
            id: personData.id ? String(personData.id) : null,
            relationship: personData.relationship || null,
            isCustom,
            isAuth: Boolean(personData.isAuth),
            customName: isCustom ? personData.name || personData.full_name || '' : null,
            customPhone: isCustom ? personData.phone || '' : null,
            customCitizenId: isCustom ? personData.citizenId || '' : null,
            updatedAt: new Date().toISOString(),
          },
        };
        localStorage.setItem(key, JSON.stringify(updated));
        setDefaultsMap(updated);
      } catch (e) {
        console.warn('Failed to save pickup default to localStorage:', e);
      }
    },
    [classId]
  );

  // Get active default pickup person for student
  // (Trong thời gian ủy quyền mặc định chọn người ủy quyền, nhưng nếu giáo viên chọn Mẹ đón thì các ngày sau mặc định chọn Mẹ)
  const getStudentDefaultPerson = useCallback(
    (student) => {
      const validParents = (student.parents || []).filter((p) => p.canPickup !== false);
      const validAuths = student.authorizations || [];
      const activeAuth = validAuths[0];
      const saved = defaultsMap[student.id];

      // Helper to resolve parent from saved
      const resolveParent = () => {
        if (!saved) return null;
        if (saved.id && !saved.isAuth) {
          const matchedParent = validParents.find((p) => String(p.id) === String(saved.id));
          if (matchedParent) {
            return {
              id: matchedParent.id,
              name: matchedParent.name,
              relationship: matchedParent.relationship,
              phone: matchedParent.phone || '',
              citizenId: matchedParent.citizenId || '',
            };
          }
        }
        if (saved.relationship && !saved.isAuth && !saved.isCustom) {
          const matchedByRel = validParents.find((p) => p.relationship === saved.relationship);
          if (matchedByRel) {
            return {
              id: matchedByRel.id,
              name: matchedByRel.name,
              relationship: matchedByRel.relationship,
              phone: matchedByRel.phone || '',
              citizenId: matchedByRel.citizenId || '',
            };
          }
        }
        if (saved.isCustom && saved.customName) {
          return {
            id: null,
            name: saved.customName,
            relationship: saved.relationship || 'Người đón',
            phone: saved.customPhone || '',
            citizenId: saved.customCitizenId || '',
            isCustom: true,
          };
        }
        return null;
      };

      // 1. TRONG THỜI GIAN CÓ ỦY QUYỀN HỢP LỆ:
      if (activeAuth) {
        // Kiểm tra xem giáo viên có chủ động chọn người khác (ví dụ: Mẹ) sau khi ủy quyền bắt đầu không:
        if (saved && saved.updatedAt) {
          const savedTime = new Date(saved.updatedAt).getTime();
          const authCreatedTime = activeAuth.createdAt
            ? new Date(activeAuth.createdAt).getTime()
            : 0;

          // Nếu giáo viên vừa chủ động chọn người khác sau mốc tạo ủy quyền:
          if (authCreatedTime > 0 && savedTime > authCreatedTime) {
            if (saved.isAuth && String(saved.id) === String(activeAuth.id)) {
              return {
                id: activeAuth.id,
                name: activeAuth.name,
                relationship: activeAuth.relationship || 'Ủy quyền',
                phone: activeAuth.phone || '',
                citizenId: activeAuth.citizenId || '',
                photoUrl: activeAuth.photoUrl || '',
                isAuth: true,
              };
            }
            const parentFromSaved = resolveParent();
            if (parentFromSaved) return parentFromSaved;
          }
        }

        // Mặc định ban đầu khi có ủy quyền: Chọn người được ủy quyền (Chú Trần Minh Khôi, Dì...)
        return {
          id: activeAuth.id,
          name: activeAuth.name,
          relationship: activeAuth.relationship || 'Ủy quyền',
          phone: activeAuth.phone || '',
          citizenId: activeAuth.citizenId || '',
          photoUrl: activeAuth.photoUrl || '',
          isAuth: true,
        };
      }

      // 2. KHI HẾT THỜI GIAN ỦY QUYỀN (hoặc không có ủy quyền):
      const parentFromSaved = resolveParent();
      if (parentFromSaved) return parentFromSaved;

      // Mặc định gốc: Phụ huynh hợp lệ đầu tiên từ Database (Bố hoặc Mẹ)
      const parent = validParents[0];
      if (parent) {
        return {
          id: parent.id,
          name: parent.name,
          relationship: parent.relationship || 'Phụ huynh',
          phone: parent.phone || '',
          citizenId: parent.citizenId || '',
        };
      }

      return {
        id: null,
        name: '',
        relationship: 'Phụ huynh',
        phone: '',
        citizenId: '',
      };
    },
    [defaultsMap]
  );

  const onDismissalChangeRef = useRef(onDismissalChange);
  useEffect(() => {
    onDismissalChangeRef.current = onDismissalChange;
  }, [onDismissalChange]);

  // Fetch dismissal overview data from backend
  const fetchDismissalData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await attendanceApi.getDismissalOverview(classId, { date });
      setData(res);
      const mapped = (res?.students || []).map((s) => ({
        ...s,
        pickupNote: s.pickupNote || '',
      }));
      setStudents(mapped);
      setInitialSnapshot(
        JSON.stringify(
          mapped.map((s) => ({
            id: s.id,
            isDismissed: s.isDismissed,
            pickupPersonName: s.pickupPersonName || '',
            pickupRelationship: s.pickupRelationship || '',
            pickupNote: s.pickupNote || '',
          }))
        )
      );
      if (onDismissalChangeRef.current) {
        onDismissalChangeRef.current(res);
      }
    } catch (err) {
      console.error('Failed to load dismissal data:', err);
      toast.error(isVi ? 'Không thể tải dữ liệu đón trẻ' : 'Failed to load dismissal data');
    } finally {
      setLoading(false);
    }
  }, [classId, date, isVi]);

  useEffect(() => {
    fetchDismissalData();
  }, [fetchDismissalData]);

  // Dirty check to activate bottom "Lưu đón trẻ" button
  const isDirty = useMemo(() => {
    if (!initialSnapshot || students.length === 0) return false;
    const current = JSON.stringify(
      students.map((s) => ({
        id: s.id,
        isDismissed: s.isDismissed,
        pickupPersonName: s.pickupPersonName || '',
        pickupRelationship: s.pickupRelationship || '',
        pickupNote: s.pickupNote || '',
      }))
    );
    return current !== initialSnapshot;
  }, [students, initialSnapshot]);

  // Counts
  const dismissedCount = useMemo(() => students.filter((s) => s.isDismissed).length, [students]);
  const presentCount = useMemo(() => students.filter((s) => s.isPresent).length, [students]);
  const undismissedPresentCount = useMemo(
    () => students.filter((s) => s.isPresent && !s.isDismissed).length,
    [students]
  );
  const formattedDate = useMemo(() => {
    if (!date) return new Date().toLocaleDateString('vi-VN');
    const parts = date.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return date;
  }, [date]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.pickupPersonName && s.pickupPersonName.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Quick 1-click dismissal using default choice
  const handleQuickDismissal = async (student, person) => {
    if (!student.isPresent) return;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const targetDateStr = date || new Date().toISOString().slice(0, 10);
    const targetTimeIso = now.toISOString();

    const pName =
      person.name || (person.relationship ? `${person.relationship} bé` : 'Phụ huynh');
    const pRel = person.relationship || 'Phụ huynh';
    const pPhone = person.phone || null;
    const pCitizenId = person.citizenId || null;

    // Optimistic local update
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === student.id) {
          return {
            ...s,
            isDismissed: true,
            checkOutTime: targetTimeIso,
            checkOutTimeFormatted: currentTime,
            pickupPersonName: pName,
            pickupRelationship: pRel,
            pickupPersonPhone: pPhone,
            pickupCitizenId: pCitizenId,
            isAuthPickup: Boolean(person.isAuth || (person.id && String(person.id).startsWith('auth_'))),
          };
        }
        return s;
      })
    );

    try {
      await attendanceApi.recordDismissal(classId, {
        date: targetDateStr,
        records: [
          {
            studentId: student.id,
            pickupPersonName: pName,
            pickupRelationship: pRel,
            pickupPersonPhone: pPhone,
            pickupCitizenId: pCitizenId,
            pickupNote: student.pickupNote || null,
            checkOutTime: targetTimeIso,
          },
        ],
      });
      toast.success(
        isVi
          ? `Đã ghi nhận ${pRel} (${pName}) đón bé ${student.name} lúc ${currentTime}!`
          : `Dismissal recorded for ${student.name}!`
      );
    } catch (err) {
      console.error('Quick dismissal failed:', err);
      toast.error(
        err?.response?.data?.message ||
        (isVi ? 'Ghi nhận đón trẻ thất bại' : 'Failed to record dismissal')
      );
      fetchDismissalData();
    }
  };

  // Switch default person & immediately record dismissal
  const handleSelectAndSwitchDefault = async (student, person) => {
    saveStudentDefault(student.id, person);
    await handleQuickDismissal(student, person);
  };

  // Open modal with pre-selected person
  const handleOpenPickupModal = (student, preselectedPerson = null) => {
    if (!student.isPresent) {
      toast.error(
        isVi
          ? 'Học sinh vắng mặt hoặc chưa điểm danh, không thể đón trẻ!'
          : 'Student is absent or not checked in!'
      );
      return;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    setModalStudent(student);

    if (preselectedPerson && preselectedPerson !== 'CUSTOM') {
      const isAuth =
        preselectedPerson.isAuth ||
        (preselectedPerson.id && String(preselectedPerson.id).startsWith('auth_'));
      if (isAuth) {
        setActivePersonTab(`AUTH_${preselectedPerson.id}`);
      } else {
        setActivePersonTab(preselectedPerson.id ? `PARENT_${preselectedPerson.id}` : 'CUSTOM');
      }
      setModalForm({
        pickupName: preselectedPerson.name || preselectedPerson.full_name || '',
        pickupRelationship: preselectedPerson.relationship || 'Bố',
        pickupPhone: preselectedPerson.phone || '',
        pickupCitizenId: preselectedPerson.citizenId || '',
        pickupPhotoUrl: student.pickupPhotoUrl || '',
        pickupTime: student.checkOutTimeFormatted || currentTime,
        pickupNote: student.pickupNote || '',
      });
    } else if (preselectedPerson === 'CUSTOM') {
      setActivePersonTab('CUSTOM');
      setModalForm({
        pickupName: '',
        pickupRelationship: 'Người được ủy quyền',
        pickupPhone: '',
        pickupCitizenId: '',
        pickupPhotoUrl: student.pickupPhotoUrl || '',
        pickupTime: currentTime,
        pickupNote: student.pickupNote || '',
      });
    } else {
      if (student.isDismissed) {
        const matchedParent = (student.parents || []).find(
          (p) =>
            (student.pickupPersonName && p.name === student.pickupPersonName) ||
            (student.pickupRelationship && p.relationship === student.pickupRelationship)
        );
        const matchedAuth = (student.authorizations || []).find(
          (a) =>
            (student.pickupPersonName && a.name === student.pickupPersonName) ||
            (student.pickupRelationship && a.relationship === student.pickupRelationship)
        );

        if (matchedAuth) {
          setActivePersonTab(`AUTH_${matchedAuth.id}`);
        } else if (matchedParent) {
          setActivePersonTab(`PARENT_${matchedParent.id}`);
        } else {
          setActivePersonTab('CUSTOM');
        }

        setModalForm({
          pickupName: student.pickupPersonName || '',
          pickupRelationship: student.pickupRelationship || 'Phụ huynh',
          pickupPhone: student.pickupPersonPhone || '',
          pickupCitizenId: student.pickupCitizenId || '',
          pickupPhotoUrl: student.pickupPhotoUrl || '',
          pickupTime: student.checkOutTimeFormatted || currentTime,
          pickupNote: student.pickupNote || '',
        });
      } else {
        const defaultPerson = getStudentDefaultPerson(student);
        if (defaultPerson.isAuth) {
          setActivePersonTab(`AUTH_${defaultPerson.id}`);
        } else {
          setActivePersonTab(defaultPerson.id ? `PARENT_${defaultPerson.id}` : 'CUSTOM');
        }
        setModalForm({
          pickupName: defaultPerson.name || '',
          pickupRelationship: defaultPerson.relationship || 'Bố',
          pickupPhone: defaultPerson.phone || '',
          pickupCitizenId: defaultPerson.citizenId || '',
          pickupPhotoUrl: student.pickupPhotoUrl || '',
          pickupTime: currentTime,
          pickupNote: student.pickupNote || '',
        });
      }
    }
  };

  // Switch person inside modal (Preserve uploaded photo if any)
  const handleSelectPersonInModal = (personType, personData = null) => {
    setActivePersonTab(personType);
    if (personType === 'CUSTOM') {
      setModalForm((prev) => ({
        ...prev,
        pickupName: '',
        pickupRelationship: 'Người được ủy quyền',
        pickupPhone: '',
        pickupCitizenId: '',
      }));
    } else if (personData) {
      setModalForm((prev) => ({
        ...prev,
        pickupName: personData.name || personData.full_name || '',
        pickupRelationship: personData.relationship || 'Phụ huynh',
        pickupPhone: personData.phone || '',
        pickupCitizenId: personData.citizenId || '',
      }));
    }
  };

  // Upload image to MinIO via /api/upload/pickup
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error(
        isVi
          ? 'Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.'
          : 'Please select a JPG, PNG or WebP image.'
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isVi ? 'Kích thước ảnh tối đa là 2MB' : 'Max image size is 2MB');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const res = await uploadApi.uploadPickupPhoto(file);
      const photoUrl = res?.url || res?.relativeUrl;
      if (photoUrl) {
        setModalForm((prev) => ({ ...prev, pickupPhotoUrl: photoUrl }));
        toast.success(isVi ? 'Đã tải ảnh lên thành công!' : 'Photo uploaded successfully!');
      }
    } catch (err) {
      console.error('Failed to upload photo:', err);
      toast.error(isVi ? 'Tải ảnh lên thất bại' : 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit modal to record child pickup
  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!modalStudent) return;

    if (!modalForm.pickupName.trim()) {
      toast.warning(isVi ? 'Vui lòng nhập họ và tên người đón' : 'Please enter pickup person name');
      return;
    }

    if (!modalForm.pickupRelationship.trim()) {
      toast.warning(isVi ? 'Vui lòng chọn mối quan hệ với bé' : 'Please select relationship');
      return;
    }

    const targetDateStr = date || new Date().toISOString().slice(0, 10);
    let targetTimeIso = new Date().toISOString();

    if (modalForm.pickupTime) {
      const [hh, mm] = modalForm.pickupTime.split(':');
      const customDate = new Date(`${targetDateStr}T${hh || '16'}:${mm || '30'}:00.000Z`);
      if (!isNaN(customDate.getTime())) {
        targetTimeIso = customDate.toISOString();
      }
    }

    const savedStudent = modalStudent;
    const savedName = modalForm.pickupName.trim();
    const savedRel = modalForm.pickupRelationship.trim();
    const savedPhone = modalForm.pickupPhone.trim();
    const savedCitizenId = modalForm.pickupCitizenId.trim();

    let selectedId = null;
    let isCustom = false;
    let isAuth = false;
    if (activePersonTab.startsWith('PARENT_')) {
      selectedId = activePersonTab.replace('PARENT_', '');
    } else if (activePersonTab.startsWith('AUTH_')) {
      selectedId = activePersonTab.replace('AUTH_', '');
      isAuth = true;
    } else if (activePersonTab === 'CUSTOM') {
      isCustom = true;
    }

    // Persist this selection to localStorage so future sessions default to it!
    saveStudentDefault(savedStudent.id, {
      id: selectedId,
      name: savedName,
      relationship: savedRel,
      phone: savedPhone,
      citizenId: savedCitizenId,
      isCustom,
      isAuth,
    });

    // Immediate local update for snappy UI
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === savedStudent.id) {
          return {
            ...s,
            isDismissed: true,
            checkOutTime: targetTimeIso,
            checkOutTimeFormatted: modalForm.pickupTime,
            pickupPersonName: savedName,
            pickupRelationship: savedRel,
            pickupPersonPhone: savedPhone || null,
            pickupCitizenId: savedCitizenId || null,
            pickupPhotoUrl: modalForm.pickupPhotoUrl.trim() || null,
            pickupNote: modalForm.pickupNote.trim() || null,
            isAuthPickup: isAuth,
          };
        }
        return s;
      })
    );

    setModalStudent(null);

    try {
      await attendanceApi.recordDismissal(classId, {
        date: targetDateStr,
        records: [
          {
            studentId: savedStudent.id,
            pickupPersonName: savedName,
            pickupRelationship: savedRel,
            pickupPersonPhone: savedPhone || null,
            pickupCitizenId: savedCitizenId || null,
            pickupPhotoUrl: modalForm.pickupPhotoUrl.trim() || null,
            pickupNote: modalForm.pickupNote.trim() || null,
            checkOutTime: targetTimeIso,
          },
        ],
      });
      toast.success(
        isVi
          ? `Đã ghi nhận ${savedRel} (${savedName}) đón bé ${savedStudent.name}!`
          : `Dismissal recorded for ${savedStudent.name}!`
      );
      fetchDismissalData();
    } catch (err) {
      console.error('Record dismissal failed:', err);
      toast.error(
        err?.response?.data?.message ||
        (isVi ? 'Ghi nhận đón trẻ thất bại' : 'Failed to record dismissal')
      );
      fetchDismissalData();
    }
  };

  // Undo / Cancel Dismissal
  const handleCancelDismissal = async (student) => {
    if (!student.isDismissed) return;

    // Instant local rollback
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === student.id) {
          return {
            ...s,
            isDismissed: false,
            checkOutTime: null,
            checkOutTimeFormatted: null,
            pickupPersonName: null,
            pickupRelationship: null,
            pickupPersonPhone: null,
            pickupCitizenId: null,
            pickupPhotoUrl: null,
          };
        }
        return s;
      })
    );

    try {
      await attendanceApi.cancelDismissal(classId, student.id, { date });
      toast.success(
        isVi
          ? `Đã hoàn tác: bé ${student.name} quay lại lớp`
          : `Dismissal undone for ${student.name}`
      );
      fetchDismissalData();
    } catch (err) {
      console.error('Undo dismissal failed:', err);
      toast.error(isVi ? 'Hoàn tác đón thất bại' : 'Failed to undo dismissal');
      fetchDismissalData();
    }
  };

  // Inline note change in table
  const handleNoteChange = (id, newNote) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pickupNote: newNote } : s))
    );
  };

  // Handle Save All Dismissals (called after user confirms in dialog)
  const handleConfirmSaveAll = async () => {
    setShowSaveConfirmDialog(false);
    if (isSaving || isCleaning) return;
    setIsSaving(true);
    try {
      const targetDateStr = date || new Date().toISOString().slice(0, 10);
      const now = new Date();
      const currentTime = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const targetTimeIso = now.toISOString();

      const presentStudents = students.filter((s) => s.isPresent);
      if (presentStudents.length === 0) {
        toast.warning(isVi ? 'Không có học sinh nào có mặt hôm nay.' : 'No students present today.');
        return;
      }

      const records = presentStudents.map((s) => {
        if (s.isDismissed && s.pickupRelationship) {
          return {
            studentId: s.id,
            pickupPersonName: s.pickupPersonName || 'Phụ huynh',
            pickupRelationship: s.pickupRelationship || 'Phụ huynh',
            pickupPersonPhone: s.pickupPersonPhone || null,
            pickupCitizenId: s.pickupCitizenId || null,
            pickupPhotoUrl: s.pickupPhotoUrl || null,
            pickupNote: s.pickupNote || null,
            checkOutTime: s.checkOutTime || targetTimeIso,
          };
        }

        // Apply default person for undismissed students (strictly from student's actual parents)
        const defPerson = getStudentDefaultPerson(s);
        const validParents = (s.parents || []).filter((p) => p.canPickup !== false);
        const firstActual = (s.authorizations || [])[0] || validParents[0];

        const chosen =
          defPerson && defPerson.name
            ? defPerson
            : firstActual || { name: `Phụ huynh bé ${s.name}`, relationship: 'Phụ huynh' };

        const pName =
          chosen.name || (chosen.relationship ? `${chosen.relationship} bé` : `Phụ huynh bé ${s.name}`);
        const pRel = chosen.relationship || 'Phụ huynh';

        return {
          studentId: s.id,
          pickupPersonName: pName,
          pickupRelationship: pRel,
          pickupPersonPhone: chosen.phone || null,
          pickupCitizenId: chosen.citizenId || null,
          pickupPhotoUrl: s.pickupPhotoUrl || null,
          pickupNote: s.pickupNote || null,
          checkOutTime: targetTimeIso,
        };
      });

      await attendanceApi.recordDismissal(classId, {
        date: targetDateStr,
        records,
      });

      // Optimistic update all present students to isDismissed: true
      setStudents((prev) =>
        prev.map((s) => {
          if (!s.isPresent) return s;
          const rec = records.find((r) => r.studentId === s.id);
          if (!rec) return s;
          return {
            ...s,
            isDismissed: true,
            checkOutTime: rec.checkOutTime,
            checkOutTimeFormatted: s.checkOutTimeFormatted || currentTime,
            pickupPersonName: rec.pickupPersonName,
            pickupRelationship: rec.pickupRelationship,
            pickupPersonPhone: rec.pickupPersonPhone,
            pickupCitizenId: rec.pickupCitizenId,
            pickupPhotoUrl: rec.pickupPhotoUrl,
            pickupNote: rec.pickupNote,
          };
        })
      );

      toast.success(
        isVi
          ? `Đã lưu thông tin đón trẻ cho tất cả ${records.length} học sinh!`
          : `Dismissal records saved for all ${records.length} students!`
      );
      setInitialSnapshot(
        JSON.stringify(
          presentStudents.map((s) => ({
            id: s.id,
            isDismissed: true,
            pickupPersonName: s.pickupPersonName || '',
            pickupRelationship: s.pickupRelationship || '',
            pickupNote: s.pickupNote || '',
          }))
        )
      );
      fetchDismissalData();
    } catch (err) {
      console.error('Failed to save dismissal:', err);
      toast.error(isVi ? 'Không thể lưu đón trẻ. Vui lòng thử lại.' : 'Failed to save dismissal.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset / Clear all dismissals for this date
  const handleConfirmResetAll = async () => {
    if (dismissedCount === 0 || isSaving || isCleaning) return;
    if (!window.confirm(isVi ? `Bạn có chắc chắn muốn xóa toàn bộ thông tin đón trẻ của ngày ${formattedDate}?` : `Clear all dismissals for ${formattedDate}?`)) return;

    setIsCleaning(true);
    try {
      try {
        await attendanceApi.clearAllDismissals(classId, { date });
      } catch {
        const dismissedList = students.filter((s) => s.isDismissed);
        for (const st of dismissedList) {
          await attendanceApi.cancelDismissal(classId, st.id, { date });
        }
      }

      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          isDismissed: false,
          checkOutTime: null,
          checkOutTimeFormatted: null,
          pickupPersonName: null,
          pickupRelationship: null,
          pickupPersonPhone: null,
          pickupCitizenId: null,
          pickupPhotoUrl: null,
        }))
      );

      toast.success(isVi ? 'Đã xóa toàn bộ thông tin đón trẻ ngày này' : 'All dismissals cleared');
      fetchDismissalData();
    } catch (err) {
      console.error('Failed to clear dismissals:', err);
      toast.error(isVi ? 'Không thể xóa đón trẻ' : 'Failed to clear dismissals');
    } finally {
      setIsCleaning(false);
    }
  };

  const slotTitle = slot?.title || slot?.shortTitle || 'Trả trẻ';
  const slotTime = `${slot?.startTime || '15:30'} – ${slot?.endTime || '16:30'}`;

  return (
    <div
      className={cn(
        hideHeader
          ? 'flex-1 flex flex-col justify-between min-h-0'
          : 'w-[520px] sm:w-[580px] border-l border-border bg-card flex flex-col justify-between shrink-0 select-none z-10',
        className
      )}
      data-name="ChildDismissalPanel"
    >
      {/* 1. Header (only when not embedded in Drawer) */}
      {!hideHeader && (
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-foreground tracking-tight">
                {t('dismissal.panelTitle', 'Quản lý đón trẻ')}
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                {slotTitle} · {slotTime} · {data?.classInfo?.name || 'Nhà trẻ 1'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                    title="Tùy chọn khác"
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-none shadow-md">
                  <DropdownMenuItem
                    disabled={dismissedCount === 0 || isCleaning}
                    onClick={handleConfirmResetAll}
                    className="cursor-pointer text-[12.5px] py-2 px-3 text-rose-600 hover:text-rose-700 rounded-none disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span>{isVi ? 'Xóa đón trẻ ngày này' : 'Clear date dismissals'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-none transition-colors cursor-pointer shrink-0"
                  title={t('common.close', 'Đóng (Esc)')}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Students List Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-4">
        {/* Phụ đề & Tìm kiếm mini & Nút Yêu cầu ủy quyền */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-[12px] text-muted-foreground select-none pb-2.5 mb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-foreground text-[12px]">
              {isVi ? 'Ghi nhận giờ đón & người đón trẻ' : 'Dismissal & Pickup Records'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Nút Yêu cầu ủy quyền chuyển sang kế bên ô tìm kiếm học sinh */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className={cn(
                'relative h-8 px-3 text-[12px] font-medium rounded-none border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 select-none shadow-2xs',
                pendingAuthorizationsCount > 0
                  ? 'border-[#1447e6] text-[#1447e6] bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/40'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              title={isVi ? 'Xem và duyệt yêu cầu ủy quyền đưa đón từ phụ huynh' : 'Review pickup authorizations from parents'}
            >
              <HugeiconsIcon
                icon={TaskDone01Icon}
                size={14}
                className={pendingAuthorizationsCount > 0 ? 'text-[#1447e6]' : 'text-muted-foreground'}
              />
              <span>{isVi ? 'Yêu cầu ủy quyền' : 'Authorizations'}</span>
              {pendingAuthorizationsCount > 0 && (
                <span className="w-5 h-5 min-w-[20px] min-h-[20px] inline-flex items-center justify-center text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-[#1447e6] dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-none shrink-0 tabular-nums">
                  {pendingAuthorizationsCount}
                </span>
              )}
            </button>

            {/* Ô tìm kiếm học sinh mini chuẩn Sorak */}
            <div className="relative w-[180px] sm:w-[200px] h-8 shrink-0">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm học sinh...' : 'Search student...'}
                className="h-8 pl-8 pr-7 text-[12px] bg-background border-border rounded-none shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <table className="w-full text-[12.5px] border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground text-[11.5px] whitespace-nowrap">
              <th className="text-left font-medium pb-2 whitespace-nowrap w-[160px] min-w-[150px]">
                {t('attendance.studentCol', 'Học sinh')}
              </th>
              <th className="w-[70px] text-center font-medium pb-2 whitespace-nowrap">
                {t('attendance.statusCol', 'Điểm danh')}
              </th>
              <th className="w-[260px] min-w-[220px] text-left font-medium pb-2 pl-2 whitespace-nowrap">
                {t('dismissal.statusCol', 'Đón trẻ')}
              </th>
              <th className="text-left font-medium pb-2 pl-3 whitespace-nowrap min-w-[130px]">
                {t('dismissal.notes', 'Dặn dò phụ huynh')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[12.5px] text-muted-foreground">
                  {isVi ? 'Đang tải dữ liệu đón trẻ...' : 'Loading dismissal data...'}
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[12.5px] text-muted-foreground">
                  {searchQuery.trim()
                    ? isVi
                      ? 'Không tìm thấy học sinh phù hợp'
                      : 'No matching student found'
                    : isVi
                      ? 'Chưa có dữ liệu học sinh'
                      : 'No students enrolled'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((st) => {
                const validParents = (st.parents || []).filter((p) => p.canPickup !== false);
                const activeAuths = (st.authorizations || []).map((a) => ({ ...a, isAuth: true }));
                // Phụ huynh của trẻ xếp trước, người được ủy quyền luôn luôn nằm ở cuối cùng
                let availablePickups = [];
                if (activeAuths.length > 0) {
                  // Dành slot cuối cho người được ủy quyền
                  availablePickups = [
                    ...validParents.slice(0, 3),
                    ...activeAuths.slice(0, 1),
                  ];
                } else {
                  availablePickups = validParents.slice(0, 4);
                }
                const defPerson = getStudentDefaultPerson(st);

                const isAuthDismissal = Boolean(
                  st.isAuthPickup ||
                  (st.pickupRelationship && (
                    st.pickupRelationship.toLowerCase().includes('ủy quyền') ||
                    st.pickupRelationship.toLowerCase().includes('uy quyen') ||
                    st.pickupRelationship.toLowerCase().includes('auth')
                  )) ||
                  (st.authorizations || []).some((a) => {
                    const pName = (st.pickupPersonName || '').trim().toLowerCase();
                    const aName = (a.name || '').trim().toLowerCase();
                    const pPhone = (st.pickupPersonPhone || '').trim();
                    const aPhone = (a.phone || '').trim();
                    const pRel = (st.pickupRelationship || '').trim().toLowerCase();
                    const aRel = (a.relationship || '').trim().toLowerCase();
                    return (
                      (pName && aName && (pName === aName || pName.includes(aName) || aName.includes(pName))) ||
                      (pPhone && aPhone && pPhone === aPhone) ||
                      (pRel && aRel && pRel === aRel)
                    );
                  })
                );

                return (
                  <tr key={st.id} className="h-12 hover:bg-muted/30 transition-colors">
                    {/* Student profile */}
                    <td className="py-1.5 pr-2 w-[160px] min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(st.code)}&backgroundColor=ff2e63,00c2a8,ffb300,3d5afe,8e24aa,00e676`}
                          alt={st.name}
                          className="size-7 rounded-none border border-border/80 object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground text-[12px] truncate max-w-[130px]">
                            {st.name}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground font-mono">
                            {st.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Điểm danh badge (Lấy từ bảng Điểm danh) */}
                    <td className="w-[70px] text-center py-1.5 px-1 whitespace-nowrap">
                      {st.isPresent ? (
                        <span className="inline-flex items-center justify-center h-5 px-1.5 font-bold text-[11px] bg-blue-100 dark:bg-blue-950/60 text-[#1447e6] border border-blue-200 dark:border-blue-800/50">
                          {isVi ? 'Có' : 'P'}
                        </span>
                      ) : st.attendanceStatus === 'EXCUSED_ABSENCE' ? (
                        <span className="inline-flex items-center justify-center h-5 px-1.5 font-bold text-[11px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                          {isVi ? 'CP' : 'EA'}
                        </span>
                      ) : st.attendanceStatus === 'UNEXCUSED_ABSENCE' ? (
                        <span className="inline-flex items-center justify-center h-5 px-1.5 font-bold text-[11px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                          {isVi ? 'KP' : 'UA'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center h-5 px-1.5 text-[11px] bg-muted text-muted-foreground border border-border">
                          —
                        </span>
                      )}
                    </td>

                    {/* Trạng thái đón trẻ: Segmented buttons hoặc [Quan hệ] · [Tên] · [Giờ] */}
                    <td className="w-[260px] min-w-[220px] py-1.5 pl-2 whitespace-nowrap">
                      {!st.isPresent ? (
                        <span className="text-[11.5px] text-muted-foreground/60 italic select-none">
                          {isVi ? 'Vắng mặt hôm nay' : 'Absent today'}
                        </span>
                      ) : st.isDismissed ? (
                        <div
                          className="inline-flex items-center gap-1.5 cursor-pointer group py-1 select-none"
                          onClick={() => handleOpenPickupModal(st)}
                          title={
                            isVi
                              ? `Bấm để xem chi tiết / sửa (${isAuthDismissal ? 'Người được ủy quyền' : 'Người đón'}: ${st.pickupPersonName || st.pickupRelationship || 'Đã đón'})`
                              : 'Click to view / edit dismissal details'
                          }
                        >
                          <span
                            className={cn(
                              'text-[12.5px] font-semibold transition-colors shrink-0',
                              isAuthDismissal
                                ? 'text-amber-700 dark:text-amber-400 group-hover:text-amber-500 dark:group-hover:text-amber-300'
                                : 'text-foreground group-hover:text-primary'
                            )}
                          >
                            {st.pickupRelationship || (isVi ? 'Đã đón' : 'Dismissed')}
                          </span>
                          {(() => {
                            const rawName = (st.pickupPersonName || '').trim();
                            const rel = (st.pickupRelationship || '').trim();
                            const cleanName = rawName.replace(/^.*[:\-]\s*/, '').trim() || rawName;
                            if (
                              cleanName &&
                              cleanName.toLowerCase() !== rel.toLowerCase() &&
                              cleanName.toLowerCase() !== `${rel.toLowerCase()} bé`
                            ) {
                              return (
                                <>
                                  <span
                                    className={cn(
                                      'text-[11px]',
                                      isAuthDismissal
                                        ? 'text-amber-600/70 group-hover:text-amber-500/80'
                                        : 'text-muted-foreground/60'
                                    )}
                                  >
                                    ·
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[12.5px] font-medium transition-colors truncate max-w-[130px]',
                                      isAuthDismissal
                                        ? 'text-amber-900 dark:text-amber-200 group-hover:text-amber-500 dark:group-hover:text-amber-300'
                                        : 'text-foreground/90 group-hover:text-primary'
                                    )}
                                  >
                                    {cleanName}
                                  </span>
                                </>
                              );
                            }
                            return null;
                          })()}
                          <span
                            className={cn(
                              'text-[11px]',
                              isAuthDismissal
                                ? 'text-amber-600/70 group-hover:text-amber-500/80'
                                : 'text-muted-foreground/60'
                            )}
                          >
                            ·
                          </span>
                          <span
                            className={cn(
                              'text-[12px] font-mono transition-colors shrink-0',
                              isAuthDismissal
                                ? 'text-amber-800/80 dark:text-amber-400/80 group-hover:text-amber-600 dark:group-hover:text-amber-300'
                                : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          >
                            {st.checkOutTimeFormatted || '16:30'}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center border border-border bg-background rounded-none p-0.5 shadow-2xs shrink-0">
                          {availablePickups.length === 0 ? (
                            <span className="px-2 text-[11px] text-muted-foreground/70 italic select-none">
                              {isVi ? 'Chưa có PH' : 'No parent'}
                            </span>
                          ) : (
                            availablePickups.slice(0, 4).map((p, idx) => {
                              const isAuthorizedPerson = Boolean(
                                p.isAuth ||
                                p.isAuthorized ||
                                (p.relationship && (
                                  p.relationship.toLowerCase().includes('ủy quyền') ||
                                  p.relationship.toLowerCase().includes('uy quyen') ||
                                  p.relationship.toLowerCase().includes('auth')
                                )) ||
                                (st.authorizations || []).some(
                                  (a) =>
                                    (p.id && String(a.id) === String(p.id)) ||
                                    (p.name && a.name && p.name.trim().toLowerCase() === a.name.trim().toLowerCase()) ||
                                    (p.phone && a.phone && p.phone.trim() === a.phone.trim())
                                )
                              );

                              const isSelected =
                                (defPerson.id && p.id && String(defPerson.id) === String(p.id)) ||
                                (defPerson.name && p.name && defPerson.name === p.name) ||
                                (!defPerson.name &&
                                  defPerson.relationship &&
                                  p.relationship &&
                                  defPerson.relationship === p.relationship);

                              return (
                                <button
                                  key={p.id || `${p.relationship}-${idx}`}
                                  type="button"
                                  onClick={() => handleSelectAndSwitchDefault(st, p)}
                                  className={cn(
                                    'h-7 px-2.5 text-[11.5px] font-medium transition-colors cursor-pointer flex items-center justify-center',
                                    idx > 0 && 'border-l border-border/60',
                                    isAuthorizedPerson
                                      ? isSelected
                                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 font-semibold hover:bg-amber-200/90 hover:text-amber-950'
                                        : 'bg-amber-50/70 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 hover:bg-amber-100 hover:text-amber-900'
                                      : isSelected
                                      ? 'bg-primary/10 text-primary font-semibold hover:bg-primary hover:text-white'
                                      : 'text-foreground hover:bg-muted/70'
                                  )}
                                  title={
                                    isAuthorizedPerson
                                      ? `Ủy quyền (${p.relationship}): ${p.name || ''} (Bấm để chọn đón)`
                                      : p.name
                                      ? `${p.relationship}: ${p.name} (Bấm để chọn đón)`
                                      : `${p.relationship} (Bấm để chọn đón)`
                                  }
                                >
                                  <span>{getShortRelationshipLabel(p.relationship)}</span>
                                </button>
                              );
                            })
                          )}

                          {/* Nút tùy chỉnh / người đón khác (Icon 3 chấm gọn gàng) */}
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenPickupModal(
                                st,
                                defPerson || availablePickups[0] || 'CUSTOM'
                              )
                            }
                            className={cn(
                              'h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer flex items-center justify-center shrink-0',
                              availablePickups.length > 0 && 'border-l border-border/60'
                            )}
                            title={
                              isVi
                                ? 'Tùy chỉnh thông tin đón hoặc chọn người khác...'
                                : 'More options / custom pickup...'
                            }
                          >
                            <HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Dặn dò / Ghi chú (Disabled nếu không có mặt) */}
                    <td className="py-1 pl-3 min-w-[130px]">
                      <input
                        type="text"
                        value={st.pickupNote || ''}
                        onChange={(e) => handleNoteChange(st.id, e.target.value)}
                        placeholder={
                          st.isPresent
                            ? isVi
                              ? 'Dặn dò phụ huynh...'
                              : 'Note...'
                            : isVi
                              ? 'Không có mặt'
                              : 'Absent'
                        }
                        disabled={!st.isPresent}
                        className="w-full h-7 px-2.5 text-[11.5px] border border-border bg-background text-foreground rounded-none focus:outline-hidden focus:border-[#1447e6] disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Sticky Bottom Action Bar - Hiển thị đúng số lượng đón trẻ trên tổng số */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3">
          {dismissedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 select-none">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                {isVi
                  ? `Đã đón trẻ (${dismissedCount}/${students.length})`
                  : `Dismissed (${dismissedCount}/${students.length})`}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground select-none">
              <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
              <span>
                {isVi
                  ? `Chưa đón trẻ (0/${students.length})`
                  : `Not dismissed (0/${students.length})`}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-none h-9 text-[13px] px-4 cursor-pointer"
            >
              {t('common.cancel', 'Huỷ')}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              if (presentCount === 0) {
                toast.warning(isVi ? 'Không có học sinh nào có mặt hôm nay.' : 'No students present today.');
                return;
              }
              setShowSaveConfirmDialog(true);
            }}
            disabled={presentCount === 0 || isSaving || isCleaning}
            className={cn(
              'rounded-none h-9 text-[13px] px-5 font-medium transition-colors shadow-none',
              presentCount > 0 && !isSaving && !isCleaning
                ? 'bg-[#1447e6] hover:bg-[#123ec4] text-white cursor-pointer'
                : 'bg-muted/80 text-muted-foreground border border-border/80 cursor-not-allowed opacity-60'
            )}
            title={presentCount === 0 ? (isVi ? 'Không có học sinh có mặt để lưu' : 'No students present') : undefined}
          >
            {isSaving ? t('common.saving', 'Đang lưu...') : t('dismissal.saveDismissal', 'Lưu đón trẻ')}
          </Button>
        </div>
      </div>

      {/* 4. Clean Popup Dialog: Không có icon kế tiêu đề, upload ảnh MinIO, đầy đủ thông tin pickup */}
      {modalStudent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200"
            onClick={() => setModalStudent(null)}
          />

          <div
            className="relative w-full max-w-[460px] bg-card border border-border shadow-2xl rounded-none z-10 animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: BỎ ICON KẾ TIÊU ĐỀ ĐI theo đúng yêu cầu */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[14.5px] font-semibold text-foreground tracking-tight">
                  {modalStudent.isDismissed
                    ? isVi
                      ? 'Thông tin chi tiết đón trẻ'
                      : 'Dismissal Details'
                    : isVi
                      ? 'Ghi nhận đón trẻ'
                      : 'Record Child Dismissal'}
                </h3>
                <span className="text-[12px] text-muted-foreground font-mono">
                  {modalStudent.name} ({modalStudent.code})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalStudent(null)}
                className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title={t('common.close', 'Đóng')}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            {/* Modal Form: Đầy đủ các trường pickup trong bảng attendances */}
            <form onSubmit={handleSubmitModal} className="p-5 flex flex-col gap-3.5">
              {/* Chọn người đón dạng Select dropdown clean & gọn gàng */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-foreground">
                  {isVi ? 'Chọn người đón' : 'Select pickup person'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={activePersonTab}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('PARENT_')) {
                        const pId = val.replace('PARENT_', '');
                        const pObj = (modalStudent.parents || []).find((p) => String(p.id) === pId);
                        handleSelectPersonInModal(val, pObj);
                      } else if (val.startsWith('AUTH_')) {
                        const aId = val.replace('AUTH_', '');
                        const aObj = (modalStudent.authorizations || []).find((a) => String(a.id) === aId);
                        handleSelectPersonInModal(val, aObj);
                      } else {
                        handleSelectPersonInModal('CUSTOM');
                      }
                    }}
                    className="w-full h-9 px-3 text-[12.5px] bg-background border border-border text-foreground rounded-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary appearance-none transition-colors pr-8 font-medium"
                  >
                    {(modalStudent.parents || []).map((p) => (
                      <option key={p.id} value={`PARENT_${p.id}`}>
                        {p.relationship}: {p.name}
                      </option>
                    ))}

                    {(modalStudent.authorizations || []).map((a) => (
                      <option key={a.id} value={`AUTH_${a.id}`}>
                        {a.relationship || (isVi ? 'Ủy quyền' : 'Delegate')}: {a.name} ({isVi ? 'Ủy quyền' : 'Authorized'})
                      </option>
                    ))}

                    <option value="CUSTOM">
                      {isVi ? '+ Người đón khác' : '+ Other person'}
                    </option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <HugeiconsIcon icon={ArrowDown01Icon} size={15} />
                  </div>
                </div>
              </div>

              {/* Khối 1: Thẻ nhận diện hồ sơ (Chỉ hiển thị khi chọn người trong danh sách) */}
              {activePersonTab !== 'CUSTOM' && (() => {
                const selectedParentObj = (modalStudent.parents || []).find(
                  (p) =>
                    activePersonTab === `PARENT_${p.id}` ||
                    (modalForm.pickupName && p.name === modalForm.pickupName)
                );
                const selectedAuthObj = (modalStudent.authorizations || []).find(
                  (a) =>
                    activePersonTab === `AUTH_${a.id}` ||
                    (modalForm.pickupName && a.name === modalForm.pickupName)
                );
                const isAuthPerson = Boolean(
                  activePersonTab.startsWith('AUTH_') ||
                  selectedAuthObj ||
                  (modalForm.pickupRelationship &&
                    (modalForm.pickupRelationship.toLowerCase().includes('ủy quyền') ||
                     modalForm.pickupRelationship.toLowerCase().includes('uy quyen') ||
                     modalForm.pickupRelationship.toLowerCase().includes('auth')))
                );
                const personObj = isAuthPerson
                  ? (selectedAuthObj || selectedParentObj)
                  : (selectedParentObj || selectedAuthObj);
                const personAvatar = personObj?.photoUrl
                  ? personObj.photoUrl
                  : getParentAvatarUrl(
                      personObj?.avatarUrl,
                      personObj?.name || modalForm.pickupName || (isAuthPerson ? 'UQ' : 'PH')
                    );

                return (
                  <div
                    className={cn(
                      'flex items-center gap-3 p-2.5 border rounded-none transition-colors',
                      isAuthPerson
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-700/70 dark:bg-amber-950/40'
                        : 'border-border bg-muted/25'
                    )}
                  >
                    {/* Avatar cố định 48x48px (DiceBear 9.x / DB hồ sơ / Ảnh ủy quyền) - Bấm phóng to */}
                    <div
                      className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] shrink-0 rounded-none overflow-hidden border border-border/80 bg-background cursor-zoom-in hover:opacity-85 transition-opacity"
                      onClick={() =>
                        setZoomImage({
                          src: personAvatar,
                          title: `${isAuthPerson ? (isVi ? 'Người được ủy quyền' : 'Authorized Person') : (isVi ? 'Hồ sơ phụ huynh' : 'Parent Profile')}: ${modalForm.pickupName || 'PH'}`,
                        })
                      }
                      title={isVi ? 'Bấm để xem ảnh lớn' : 'Click to enlarge'}
                    >
                      <img
                        src={personAvatar}
                        alt={modalForm.pickupName || 'Người đón'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getParentAvatarUrl(null, modalForm.pickupName || 'PH');
                        }}
                      />
                    </div>

                    {/* Thông tin hồ sơ người đón: bỏ badge, bỏ CCCD kế bên SĐT */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[13.5px] font-semibold text-foreground truncate">
                        {modalForm.pickupName || (isVi ? 'Chưa nhập họ tên' : 'No name entered')}
                      </span>
                      <div className="text-[11.5px] text-muted-foreground font-mono truncate mt-0.5">
                        {modalForm.pickupPhone ? `SĐT: ${modalForm.pickupPhone}` : (isVi ? 'Chưa có SĐT' : 'No phone')}
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-[11px] px-2 py-0.5 border shrink-0 font-medium',
                        isAuthPerson
                          ? 'text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700'
                          : 'text-muted-foreground bg-background border-border/70'
                      )}
                    >
                      {isVi ? 'Hồ sơ nhận diện' : 'Profile'}
                    </span>
                  </div>
                );
              })()}

              {/* Khối 2: Lưới các trường nhập thông tin: 2 cột x 2 dòng cân đối */}
              <div className="grid grid-cols-2 gap-3 pt-0.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Họ và tên người đón' : 'Full name'} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={modalForm.pickupName}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, pickupName: e.target.value }))
                    }
                    placeholder="Nguyễn Văn Minh"
                    className="h-8 text-[12.5px] rounded-none border-border"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Mối quan hệ với bé' : 'Relationship'} <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={modalForm.pickupRelationship}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, pickupRelationship: e.target.value }))
                    }
                    placeholder={isVi ? 'Ví dụ: Bác, Dì, Chú, Tài xế...' : 'e.g. Aunt, Driver...'}
                    className="h-8 text-[12.5px] rounded-none border-border"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Số điện thoại liên hệ' : 'Phone number'}
                  </label>
                  <Input
                    type="tel"
                    value={modalForm.pickupPhone}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, pickupPhone: e.target.value }))
                    }
                    placeholder="0912 345 678"
                    className="h-8 text-[12.5px] rounded-none border-border font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-foreground">
                    {isVi ? 'Số CCCD / Định danh' : 'Citizen ID'}
                  </label>
                  <Input
                    type="text"
                    maxLength={12}
                    value={modalForm.pickupCitizenId}
                    onChange={(e) =>
                      setModalForm((prev) => ({ ...prev, pickupCitizenId: e.target.value }))
                    }
                    placeholder="12 chữ số CCCD"
                    className="h-8 text-[12.5px] rounded-none border-border font-mono"
                  />
                </div>
              </div>

              {/* Khối 3: Ảnh xác thực đón trẻ riêng biệt (Lưu vào table attendance, không sửa avatar parent) */}
              <div className="flex flex-col gap-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
                    <HugeiconsIcon icon={Upload01Icon} size={13} className="text-muted-foreground" />
                    <span>{isVi ? 'Ảnh đón bé' : 'Pickup photo'}</span>
                  </label>
                </div>

                {modalForm.pickupPhotoUrl ? (
                  <div className="flex items-center justify-between p-2 border border-border bg-muted/20 rounded-none">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] border border-border overflow-hidden bg-background shrink-0 cursor-zoom-in hover:opacity-85 transition-opacity"
                        onClick={() =>
                          setZoomImage({
                            src: modalForm.pickupPhotoUrl,
                            title: isVi ? 'Ảnh đón bé' : 'Pickup photo',
                          })
                        }
                        title={isVi ? 'Bấm để phóng to ảnh' : 'Click to enlarge'}
                      >
                        <img
                          src={modalForm.pickupPhotoUrl}
                          alt="Ảnh đón"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-medium text-foreground truncate">
                          {isVi ? 'Ảnh đón bé' : 'Pickup photo'}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground truncate">
                          {isVi ? 'Lưu sổ đón' : 'Saved to daily record'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalForm((prev) => ({ ...prev, pickupPhotoUrl: '' }))}
                        className="h-7 px-2 text-[11px] font-medium border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title={isVi ? 'Xóa ảnh này' : 'Remove photo'}
                      >
                        {isVi ? 'Xóa' : 'Remove'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="h-7 px-2 text-[11px] font-medium border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <HugeiconsIcon icon={Upload01Icon} size={12} />
                        <span>{isVi ? 'Đổi ảnh' : 'Change'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 border border-dashed border-border bg-muted/10 rounded-none">
                    <span className="text-[11.5px] text-muted-foreground truncate pr-2">
                      {isVi ? 'Chưa có ảnh đón' : 'No photo yet'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="h-7 px-2.5 text-[11px] font-medium border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      <HugeiconsIcon icon={Upload01Icon} size={12} />
                      <span>{isVi ? 'Tải ảnh' : 'Upload'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Input file ẩn phục vụ upload ảnh xác thực đón trẻ */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
              />

              {/* Modal footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-1">
                {modalStudent.isDismissed ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleCancelDismissal(modalStudent);
                      setModalStudent(null);
                    }}
                    className="size-8 border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center rounded-none cursor-pointer transition-colors"
                    title={isVi ? 'Đặt lại chưa đón' : 'Reset dismissal status'}
                  >
                    <HugeiconsIcon icon={UndoIcon} size={15} />
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalStudent(null)}
                    className="h-8 px-3 text-[12.5px] rounded-none cursor-pointer"
                  >
                    {t('common.cancel', 'Huỷ')}
                  </Button>
                  <Button
                    type="submit"
                    className="h-8 px-4 text-[12.5px] font-medium bg-[#1447e6] hover:bg-[#123ec4] text-white rounded-none cursor-pointer shadow-none transition-colors"
                  >
                    {modalStudent.isDismissed
                      ? isVi
                        ? 'Cập nhật đón trẻ'
                        : 'Update Pickup'
                      : isVi
                        ? 'Xác nhận đón trẻ'
                        : 'Confirm Pickup'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox phóng to ảnh (phụ huynh hoặc ảnh đón bé) */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-background border border-border shadow-2xl p-3 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-border/60 mb-3">
              <span className="text-[13px] font-semibold text-foreground truncate pr-2">
                {zoomImage.title || (isVi ? 'Xem ảnh' : 'Preview image')}
              </span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
            <div className="w-full max-h-[70vh] flex items-center justify-center bg-muted/20 overflow-hidden border border-border/50">
              <img
                src={zoomImage.src}
                alt={zoomImage.title || 'Ảnh'}
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Lưu toàn bộ đón trẻ */}
      {showSaveConfirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
            onClick={() => setShowSaveConfirmDialog(false)}
          />
          <div
            className="relative w-full max-w-[440px] bg-card border border-border shadow-2xl rounded-none z-10 animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/60 mb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                  {isVi ? 'Xác nhận lưu đón trẻ' : 'Confirm Save Dismissals'}
                </h3>
                <span className="text-[12px] text-muted-foreground">
                  {isVi ? `Ngày ${formattedDate}` : `Date ${formattedDate}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveConfirmDialog(false)}
                className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} />
              </button>
            </div>

            <div className="text-[13px] text-foreground/90 space-y-2 mb-4">
              <p>
                {isVi
                  ? 'Bạn có chắc chắn muốn lưu thông tin đón trẻ cho tất cả học sinh còn lại hôm nay không?'
                  : 'Are you sure you want to save dismissal records for all present students today?'}
              </p>
              {undismissedPresentCount > 0 ? (
                <div className="p-2.5 bg-muted/40 border border-border/70 text-[12px] space-y-1">
                  <div className="font-medium text-foreground">
                    {isVi
                      ? `Sẽ áp dụng người đón đang chọn ở trên cho ${undismissedPresentCount} bé chưa đón:`
                      : `Will auto-assign default pickup person for ${undismissedPresentCount} students:`}
                  </div>
                  <div className="text-muted-foreground text-[11.5px]">
                    {isVi
                      ? '• Các bé chưa đón sẽ được ghi nhận với giờ hiện tại.'
                      : '• Students not individually dismissed will record default pickup person at current time.'}
                  </div>
                  {dismissedCount > 0 && (
                    <div className="text-muted-foreground text-[11.5px]">
                      {isVi
                        ? `• Giữ nguyên thông tin của ${dismissedCount} bé đã được ghi nhận trước đó.`
                        : `• Keep existing details for ${dismissedCount} already dismissed students.`}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-emerald-600 dark:text-emerald-400">
                  {isVi
                    ? `Toàn bộ ${presentCount} học sinh có mặt đã được ghi nhận đón.`
                    : `All ${presentCount} present students are already recorded.`}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSaveConfirmDialog(false)}
                className="h-8 px-3 text-[12.5px] rounded-none cursor-pointer"
              >
                {t('common.cancel', 'Huỷ')}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSaveAll}
                disabled={isSaving}
                className="h-8 px-4 text-[12.5px] font-medium bg-[#1447e6] hover:bg-[#123ec4] text-white rounded-none cursor-pointer shadow-none transition-colors"
              >
                {isSaving
                  ? t('common.saving', 'Đang lưu...')
                  : isVi
                    ? 'Xác nhận lưu tất cả'
                    : 'Confirm Save All'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Authorizations Review Modal */}
      <PickupAuthorizationsModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        classId={classId}
        targetDate={date}
        students={students}
        onAuthorizationChanged={() => {
          try {
            const raw = localStorage.getItem(`sorak_pickup_defaults_${classId}`);
            setDefaultsMap(raw ? JSON.parse(raw) : {});
          } catch {}
          fetchDismissalData();
        }}
      />
    </div>
  );
}

export default ChildDismissalPanel;
