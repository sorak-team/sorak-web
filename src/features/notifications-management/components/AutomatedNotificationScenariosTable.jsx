import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Notification03Icon,
  Copy01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

export const NOTIFICATION_SCENARIOS = [
  {
    id: 1,
    code: 'ACCOUNT_STATUS_CHANGED',
    featureVi: 'Khóa / Kích hoạt tài khoản',
    feature: 'Change Account Status',
    category: 'Tài khoản',
    categoryKey: 'ACCOUNT',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH thực hiện thao tác khóa hoặc mở khóa kích hoạt lại tài khoản người dùng',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Tài khoản bị thay đổi',
    recipientRole: 'Cá nhân (GV / PH / BGH)',
    scope: 'Cá nhân',
    sampleTitle: 'Trạng thái tài khoản của bạn đã được cập nhật',
    sampleBody: 'Ban Giám Hiệu vừa kích hoạt lại tài khoản của bạn trên hệ thống Sorak. Bạn có thể đăng nhập bình thường.',
    actionUrl: '/settings',
  },
  {
    id: 2,
    code: 'ROLE_UPDATED',
    featureVi: 'Thay đổi quyền người dùng',
    feature: 'Assign Role',
    category: 'Tài khoản',
    categoryKey: 'ACCOUNT',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH điều chỉnh quyền hoặc vai trò giữa Teacher ↔ Principal / Quản trị viên',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Tài khoản được thay đổi quyền',
    recipientRole: 'Cá nhân',
    scope: 'Cá nhân',
    sampleTitle: 'Vai trò tài khoản đã được cập nhật',
    sampleBody: 'Ban Giám Hiệu đã cập nhật vai trò phân quyền của bạn thành [Giáo viên phụ trách]. Nhấp để xem chi tiết.',
    actionUrl: '/settings',
  },
  {
    id: 3,
    code: 'TEACHER_CLASS_ASSIGNED',
    featureVi: 'Phân công giáo viên vào lớp',
    feature: 'Assign Teacher to Class',
    category: 'Tài khoản',
    categoryKey: 'ACCOUNT',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH gán giáo viên vào làm chủ nhiệm hoặc giảng dạy một lớp học cụ thể',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Giáo viên được phân công',
    recipientRole: 'Giáo viên',
    scope: 'Cá nhân',
    sampleTitle: 'Phân công phụ trách lớp học mới',
    sampleBody: 'Bạn đã được Ban Giám Hiệu phân công phụ trách Lớp Lá A1 trong năm học 2026-2027.',
    actionUrl: '/classes',
  },
  {
    id: 4,
    code: 'TEACHER_CLASS_UNASSIGNED',
    featureVi: 'Gỡ giáo viên khỏi lớp',
    feature: 'Unassign Teacher From Class',
    category: 'Tài khoản',
    categoryKey: 'ACCOUNT',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH hủy phân công / gỡ giáo viên khỏi lớp học phụ trách',
    channels: ['inapp'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Giáo viên bị gỡ',
    recipientRole: 'Giáo viên',
    scope: 'Cá nhân',
    sampleTitle: 'Điều chỉnh phân công lớp học',
    sampleBody: 'Bạn đã được rút khỏi danh sách phụ trách Lớp Chồi B1 theo điều chỉnh nhân sự của Ban Giám Hiệu.',
    actionUrl: '/classes',
  },
  {
    id: 5,
    code: 'STUDENT_CLASS_ASSIGNED',
    featureVi: 'Phân học sinh vào lớp học',
    feature: 'Assign Students to Class',
    category: 'Tài khoản',
    categoryKey: 'ACCOUNT',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH xếp học sinh mới hoặc chuyển học sinh chính thức vào danh sách lớp',
    channels: ['inapp', 'push'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Phụ huynh của trẻ; GV lớp',
    recipientRole: 'Phụ huynh & GV',
    scope: 'Cá nhân / Lớp',
    sampleTitle: 'Bé đã được xếp vào lớp học mới',
    sampleBody: 'Bé Nguyễn Văn Minh đã được phân vào Lớp Mầm C1 do Cô Trần Thị Mai phụ trách. Mời phụ huynh xem thông tin.',
    actionUrl: '/classes',
  },
  {
    id: 6,
    code: 'TRANSFER_REQUEST_CREATED',
    featureVi: 'Tạo yêu cầu chuyển lớp',
    feature: 'Create Transfer Request',
    category: 'Chuyển lớp',
    categoryKey: 'TRANSFER',
    sender: 'Giáo viên hoặc BGH',
    trigger: 'Giáo viên hoặc BGH tạo hồ sơ đề xuất chuyển lớp cho học sinh',
    channels: ['inapp', 'push', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Ban Giám Hiệu',
    recipientRole: 'Ban Giám Hiệu',
    scope: 'BGH',
    sampleTitle: 'Yêu cầu chuyển lớp mới cần duyệt',
    sampleBody: 'Cô Nguyễn Thị Hoa vừa gửi đề xuất chuyển bé Lê Hoàng Nam từ Lớp Mầm C1 sang Mầm C2. Nhấp để xem hồ sơ.',
    actionUrl: '/transfers',
  },
  {
    id: 7,
    code: 'TRANSFER_REQUEST_APPROVED',
    featureVi: 'Phê duyệt chuyển lớp',
    feature: 'Approve Transfer Request',
    category: 'Chuyển lớp',
    categoryKey: 'TRANSFER',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH phê duyệt đơn xin chuyển lớp cho học sinh',
    channels: ['inapp', 'email', 'push'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Người tạo yêu cầu + GV lớp nguồn + GV lớp đích',
    recipientRole: 'GV & Người tạo',
    scope: 'Cá nhân / GV liên quan',
    sampleTitle: 'Yêu cầu chuyển lớp đã được phê duyệt',
    sampleBody: 'BGH đã phê duyệt chuyển bé Lê Hoàng Nam sang Lớp Mầm C2. Hồ sơ trẻ đã tự động chuyển sang giáo viên mới.',
    actionUrl: '/transfers',
  },
  {
    id: 8,
    code: 'TRANSFER_REQUEST_REJECTED',
    featureVi: 'Từ chối chuyển lớp',
    feature: 'Reject Transfer Request',
    category: 'Chuyển lớp',
    categoryKey: 'TRANSFER',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH từ chối đề xuất chuyển lớp (kèm lý do ghi chú cụ thể)',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Người tạo yêu cầu',
    recipientRole: 'Cá nhân',
    scope: 'Cá nhân',
    sampleTitle: 'Yêu cầu chuyển lớp đã bị từ chối',
    sampleBody: 'Đề xuất chuyển bé Lê Hoàng Nam không được duyệt. Lý do: Sĩ số lớp đích hiện đã đủ định mức 25 bé.',
    actionUrl: '/transfers',
  },
  {
    id: 9,
    code: 'ACADEMIC_CALENDAR_CREATED',
    featureVi: 'Tạo lịch năm học / sự kiện',
    feature: 'Create Academic Calendar',
    category: 'Lịch năm học',
    categoryKey: 'CALENDAR',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH thêm ngày nghỉ lễ, ngày hội trường, sự kiện chuyên môn quan trọng',
    channels: ['inapp', 'email', 'push'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'broadcasts',
    targetTabLabel: 'Bản tin trường',
    recipient: 'Giáo viên hoặc toàn trường tùy event',
    recipientRole: 'Toàn trường / GV',
    scope: 'Toàn trường / Khối / Lớp',
    sampleTitle: 'Thông báo lịch nghỉ bù Tết Dương lịch 2027',
    sampleBody: 'Ban Giám Hiệu vừa cập nhật lịch nghỉ học và học bù Tết Dương lịch 2027 trên hệ thống Sorak.',
    actionUrl: '/school-years',
  },
  {
    id: 10,
    code: 'ACADEMIC_CALENDAR_UPDATED',
    featureVi: 'Cập nhật lịch năm học',
    feature: 'Update Academic Calendar',
    category: 'Lịch năm học',
    categoryKey: 'CALENDAR',
    sender: 'Ban Giám Hiệu',
    trigger: 'Ngày nghỉ, ngày học bù hoặc nội dung sự kiện trên lịch trường có sự điều chỉnh',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'broadcasts',
    targetTabLabel: 'Bản tin trường',
    recipient: 'Những người bị ảnh hưởng',
    recipientRole: 'Bị ảnh hưởng',
    scope: 'Toàn trường / Khối / Lớp',
    sampleTitle: 'Điều chỉnh lịch học bù học kỳ 1',
    sampleBody: 'Lịch học bù Lớp Lá A1 được dời từ thứ Bảy 14/11 sang thứ Bảy 21/11 do trùng sự kiện tập huấn.',
    actionUrl: '/school-years',
  },
  {
    id: 11,
    code: 'PICKUP_AUTH_CREATED',
    featureVi: 'Tạo ủy quyền đón trẻ',
    feature: 'Create Pickup Authorization',
    category: 'Ủy quyền đón hộ',
    categoryKey: 'PICKUP',
    sender: 'Phụ huynh',
    trigger: 'Phụ huynh gửi đơn ủy quyền người thân đón hộ bé qua ứng dụng phụ huynh',
    channels: ['inapp', 'push'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Giáo viên của lớp trẻ, Principal',
    recipientRole: 'Giáo viên & BGH',
    scope: 'Lớp / GV phụ trách',
    sampleTitle: 'Yêu cầu ủy quyền đón hộ mới cần xác nhận',
    sampleBody: 'PH bé Trần Gia Hân vừa gửi đơn ủy quyền cho Ông Trần Văn Nam (CCCD: 079...) đón bé vào lúc 16:30.',
    actionUrl: '/classes',
  },
  {
    id: 12,
    code: 'PICKUP_AUTH_APPROVED',
    featureVi: 'Phê duyệt đón hộ',
    feature: 'Approve Authorization',
    category: 'Ủy quyền đón hộ',
    categoryKey: 'PICKUP',
    sender: 'Giáo viên phụ trách lớp',
    trigger: 'Giáo viên kiểm tra và bấm phê duyệt người đón hộ hợp lệ',
    channels: ['inapp', 'push', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Phụ huynh của trẻ',
    recipientRole: 'Phụ huynh',
    scope: 'Cá nhân',
    sampleTitle: 'Yêu cầu ủy quyền đón hộ đã được duyệt',
    sampleBody: 'Cô Lan đã xác nhận người đón hộ bé Trần Gia Hân chiều nay. Người đón vui lòng xuất trình CCCD đối chiếu.',
    actionUrl: '/parent',
  },
  {
    id: 13,
    code: 'PICKUP_AUTH_REJECTED',
    featureVi: 'Từ chối đón hộ',
    feature: 'Reject Authorization',
    category: 'Ủy quyền đón hộ',
    categoryKey: 'PICKUP',
    sender: 'Giáo viên phụ trách lớp',
    trigger: 'Giáo viên từ chối đơn đón hộ (kèm lý do không đáp ứng an toàn đón trẻ)',
    channels: ['inapp', 'push'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Phụ huynh của trẻ',
    recipientRole: 'Phụ huynh',
    scope: 'Cá nhân',
    sampleTitle: 'Đơn ủy quyền đón hộ không được chấp thuận',
    sampleBody: 'Yêu cầu đón hộ bé bị từ chối do ảnh CCCD người đón bị mờ. Phụ huynh vui lòng gửi lại hoặc liên hệ cô giáo.',
    actionUrl: '/parent',
  },
  {
    id: 14,
    code: 'EDU_FRAMEWORK_PUBLISHED',
    featureVi: 'Công bố khung chuẩn giáo dục',
    feature: 'Publish Education Framework',
    category: 'Kế hoạch GD',
    categoryKey: 'PLANNING',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH ban hành khung chuẩn mục tiêu giáo dục mầm non theo từng độ tuổi',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'GV thuộc độ tuổi/khối áp dụng',
    recipientRole: 'Giáo viên khối',
    scope: 'Khối',
    sampleTitle: 'Khung giáo dục năm học mới đã được ban hành',
    sampleBody: 'BGH vừa công bố Khung giáo dục Khối Mầm năm học 2026-2027. Giáo viên nghiên cứu để xây dựng chủ đề.',
    actionUrl: '/curriculum',
  },
  {
    id: 15,
    code: 'THEME_PLAN_PUBLISHED',
    featureVi: 'Công bố kế hoạch chủ đề',
    feature: 'Publish Theme Plan',
    category: 'Kế hoạch GD',
    categoryKey: 'PLANNING',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH công bố kế hoạch chủ đề năm học cho các khối lớp',
    channels: ['inapp'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'GV thuộc khối áp dụng',
    recipientRole: 'Giáo viên khối',
    scope: 'Khối',
    sampleTitle: 'Kế hoạch chủ đề mới đã phát hành',
    sampleBody: 'Chủ đề "Gia đình yêu thương" (thời lượng 3 tuần) đã được ban hành. Giáo viên có thể lập giáo án.',
    actionUrl: '/curriculum',
  },
  {
    id: 16,
    code: 'MONTHLY_PARENT_COMMENT',
    featureVi: 'Phụ huynh gửi phản hồi sổ theo dõi',
    feature: 'Add Parent Comment',
    category: 'Sổ theo dõi & Đánh giá',
    categoryKey: 'ASSESSMENT',
    sender: 'Phụ huynh',
    trigger: 'Phụ huynh gửi nhận xét, phản hồi trong sổ theo dõi tháng của bé',
    channels: ['inapp', 'push'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'GV phụ trách trẻ',
    recipientRole: 'Giáo viên lớp',
    scope: 'GV lớp',
    sampleTitle: 'Phụ huynh gửi phản hồi sổ theo dõi tháng',
    sampleBody: 'Mẹ bé Nguyễn Gia Bảo vừa để lại nhận xét phản hồi về chế độ ăn uống và giấc ngủ tháng 10 của bé.',
    actionUrl: '/classes',
  },
  {
    id: 17,
    code: 'MONTHLY_COMMENT_PUBLISHED',
    featureVi: 'Công bố sổ nhận xét tháng của bé',
    feature: 'Add Teacher Monthly Comment / công bố sổ tháng',
    category: 'Sổ theo dõi & Đánh giá',
    categoryKey: 'ASSESSMENT',
    sender: 'Giáo viên phụ trách lớp',
    trigger: 'Giáo viên hoàn tất nhận xét tháng và phát hành công bố cho phụ huynh xem',
    channels: ['inapp', 'email', 'push'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'Phụ huynh của trẻ',
    recipientRole: 'Phụ huynh',
    scope: 'Cá nhân',
    sampleTitle: 'Số theo dõi & nhận xét bé ngoan tháng 10',
    sampleBody: 'Bản nhận xét đánh giá tháng 10 của bé Nguyễn Gia Bảo đã hoàn thiện. Ba mẹ vui lòng vào xem chi tiết.',
    actionUrl: '/parent',
  },
  {
    id: 18,
    code: 'BROADCAST_CREATED',
    featureVi: 'Tạo bản tin tức thời',
    feature: 'Create Notification',
    category: 'Bản tin BGH',
    categoryKey: 'BROADCAST',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH chủ động tạo và phát hành thông báo bản tin trường ngay lập tức',
    channels: ['inapp', 'email', 'push'],
    deliveryMechanism: 'Tự động phát hành ngay',
    targetTab: 'broadcasts',
    targetTabLabel: 'Bản tin trường',
    recipient: 'Theo lựa chọn của BGH',
    recipientRole: 'Tùy chọn BGH',
    scope: 'Toàn trường / Khối / Lớp / Cá nhân',
    sampleTitle: 'Thông báo họp chuyên môn triển khai kế hoạch giáo dục hè',
    sampleBody: 'Ban Giám Hiệu triệu tập toàn thể giáo viên các khối dự phiên họp chuyên môn vào sáng thứ Sáu lúc 8h30.',
    actionUrl: '/notifications',
  },
  {
    id: 19,
    code: 'BROADCAST_SCHEDULED',
    featureVi: 'Phát hành bản tin hẹn giờ',
    feature: 'Schedule Notification',
    category: 'Bản tin BGH',
    categoryKey: 'BROADCAST',
    sender: 'Hệ thống tự động (Cron job)',
    trigger: 'Hệ thống tự động đẩy bản tin lên sóng khi chạm mốc thời gian hẹn giờ đã lập lịch',
    channels: ['inapp', 'email', 'push'],
    deliveryMechanism: 'Hẹn giờ tự động',
    targetTab: 'broadcasts',
    targetTabLabel: 'Bản tin trường',
    recipient: 'Theo recipients đã cấu hình',
    recipientRole: 'Tùy chọn BGH',
    scope: 'Toàn trường / Khối / Lớp / Cá nhân',
    sampleTitle: 'Lịch hoạt động ngoại khóa tham quan nông trại cho Khối Chồi',
    sampleBody: 'Kính gửi quý phụ huynh và giáo viên thông tin chi tiết về chuyến dã ngoại nông trại xanh ngày 15/11.',
    actionUrl: '/notifications',
  },
  {
    id: 20,
    code: 'THEME_PLAN_SUBMITTED',
    featureVi: 'Nộp kế hoạch chủ đề để duyệt',
    feature: 'Submit Theme Teaching Plan',
    category: 'Kế hoạch GD',
    categoryKey: 'PLANNING',
    sender: 'Giáo viên soạn',
    trigger: 'Giáo viên gửi hoặc gửi lại kế hoạch chủ đề giáo dục lên Ban Giám Hiệu',
    channels: ['inapp', 'push', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'BGH',
    recipientRole: 'Ban Giám Hiệu',
    scope: 'BGH',
    sampleTitle: 'Kế hoạch chủ đề mới cần phê duyệt',
    sampleBody: 'Cô Trần Thị Mai vừa gửi Kế hoạch chủ đề "Thế giới thực vật quanh em" Lớp Lá A1 cần BGH phê duyệt.',
    actionUrl: '/curriculum',
  },
  {
    id: 21,
    code: 'THEME_PLAN_APPROVED',
    featureVi: 'Phê duyệt kế hoạch chủ đề',
    feature: 'Approve Theme Teaching Plan',
    category: 'Kế hoạch GD',
    categoryKey: 'PLANNING',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH phê duyệt kế hoạch chủ đề giáo dục thành công',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'GV soạn; GV liên quan của lớp',
    recipientRole: 'Giáo viên soạn & lớp',
    scope: 'Cá nhân / Lớp',
    sampleTitle: 'Kế hoạch chủ đề đã được phê duyệt',
    sampleBody: 'Kế hoạch chủ đề "Thế giới thực vật" Lớp Lá A1 của bạn đã được BGH duyệt. Có hiệu lực từ ngày 10/11.',
    actionUrl: '/classes',
  },
  {
    id: 22,
    code: 'THEME_PLAN_REVISION_REQUESTED',
    featureVi: 'Yêu cầu chỉnh sửa kế hoạch',
    feature: 'Request Theme Plan Revision',
    category: 'Kế hoạch GD',
    categoryKey: 'PLANNING',
    sender: 'Ban Giám Hiệu',
    trigger: 'BGH yêu cầu giáo viên chỉnh sửa kế hoạch giảng dạy, kèm lý do cụ thể',
    channels: ['inapp', 'email'],
    deliveryMechanism: 'Tự động tức thời',
    targetTab: 'classActivities',
    targetTabLabel: 'Hoạt động lớp',
    recipient: 'GV chịu trách nhiệm chỉnh sửa',
    recipientRole: 'Giáo viên soạn',
    scope: 'Cá nhân',
    sampleTitle: 'Yêu cầu điều chỉnh kế hoạch chủ đề',
    sampleBody: 'BGH đề nghị điều chỉnh lại mục tiêu vận động tinh trong kế hoạch chủ đề tuần 2. Nhấp để xem nhận xét.',
    actionUrl: '/classes',
  },
];

export function AutomatedNotificationScenariosTable() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [expandedRowId, setExpandedRowId] = useState(null);

  const handleCopyJson = (scenario, e) => {
    e.stopPropagation();
    const payload = {
      event_type: scenario.code,
      title: scenario.sampleTitle,
      body: scenario.sampleBody,
      category: scenario.categoryKey,
      sender: scenario.sender,
      recipient: scenario.recipient,
      scope: scenario.scope,
      target_tab: scenario.targetTab,
      delivery: scenario.deliveryMechanism,
      action_url: scenario.actionUrl,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success(t('notifications.management.scenarios.copySuccess', 'Đã sao chép JSON mẫu vào clipboard!'));
  };

  const getCategoryBadgeClass = (catKey) => {
    switch (catKey) {
      case 'TRANSFER':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'PICKUP':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'PLANNING':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'ASSESSMENT':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'CALENDAR':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'BROADCAST':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'ACCOUNT':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="w-full border border-border bg-card rounded-none shadow-xs mt-6 select-none">
      {/* Header */}
      <div className="p-4 sm:p-5 flex flex-col gap-0.5 border-b border-border/80 bg-muted/20">
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
          {t('notifications.management.scenarios.title', 'Quy định & Bảng tra cứu 22 kịch bản thông báo tự động')}
        </h3>
        <p className="text-[12px] text-muted-foreground font-normal">
          {t('notifications.management.scenarios.subtitle', 'Quy chuẩn 22 loại thông báo tự động, điều kiện phát, cơ chế tức thời/hẹn giờ và mẫu thông báo thực tế trong hệ thống Sorak')}
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Scenarios Table */}
        <div className="border border-border bg-card rounded-none overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="h-10 border-b border-border bg-muted/40 text-[12px] font-medium text-foreground">
                <th className="px-3 w-[50px] text-center font-semibold">#</th>
                <th className="px-3 min-w-[200px] font-semibold">{t('notifications.management.scenarios.colFunctionCategory', 'Chức năng & Phân loại')}</th>
                <th className="px-3 min-w-[260px] font-semibold">{t('notifications.management.scenarios.colTriggerSender', 'Khi nào phát & Tác nhân')}</th>
                <th className="px-3 min-w-[190px] font-semibold">{t('notifications.management.scenarios.colTabMechanism', 'Tab hộp thư & Cơ chế')}</th>
                <th className="px-3 min-w-[190px] font-semibold">{t('notifications.management.scenarios.colRecipientScope', 'Người nhận & Phạm vi')}</th>
                <th className="px-3 min-w-[260px] font-semibold">{t('notifications.management.scenarios.colSample', 'Gửi ra sao (Tiêu đề & Nội dung mẫu)')}</th>
                <th className="px-3 w-[80px] text-center font-semibold">{t('notifications.management.scenarios.colActions', 'Thao tác')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-[13px]">
              {NOTIFICATION_SCENARIOS.map((s) => {
                    const isRowExpanded = expandedRowId === s.id;

                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => setExpandedRowId(isRowExpanded ? null : s.id)}
                          className={cn(
                            'hover:bg-muted/30 transition-colors cursor-pointer group',
                            isRowExpanded && 'bg-muted/20'
                          )}
                        >
                          {/* # */}
                          <td className="px-3 py-3 text-center font-mono text-[12px] text-muted-foreground font-semibold">
                            {s.id}
                          </td>

                          {/* Chức năng & Phân loại */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="font-semibold text-foreground text-[13px] leading-snug group-hover:text-primary transition-colors">
                                {isEn ? s.feature : s.featureVi}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={cn(
                                    'inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium border rounded-none',
                                    getCategoryBadgeClass(s.categoryKey)
                                  )}
                                >
                                  {s.category}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {s.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Khi nào phát & Tác nhân */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] text-foreground font-normal leading-relaxed">
                                {s.trigger}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {t('notifications.management.scenarios.triggerLabel', 'Tác nhân kích hoạt')}:{' '}
                                <strong className="text-foreground font-medium">{s.sender}</strong>
                              </span>
                            </div>
                          </td>

                          {/* Tab hộp thư & Cơ chế */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium text-[11px] border border-blue-200 dark:border-blue-800 w-fit">
                                Tab: {s.targetTabLabel}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.2 bg-muted text-muted-foreground font-normal text-[10px] w-fit">
                                {s.deliveryMechanism}
                              </span>
                            </div>
                          </td>

                          {/* Người nhận & Phạm vi */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-[13px] font-medium text-foreground">
                                {s.recipient}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground">{t('notifications.management.scenarios.scopeLabel', 'Phạm vi')}:</span>
                                <span className="inline-flex items-center px-1.5 py-0.2 text-[11px] bg-muted/60 text-foreground font-normal border border-border/60">
                                  {s.scope}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Gửi ra sao (Tiêu đề & Nội dung mẫu) */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[13px] font-medium text-foreground leading-snug line-clamp-1">
                                {s.sampleTitle}
                              </span>
                              <span className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {s.sampleBody}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground/80 mt-0.5">
                                {t('notifications.management.scenarios.navigation', 'Điều hướng')}: {s.actionUrl}
                              </span>
                            </div>
                          </td>

                          {/* Thao tác */}
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleCopyJson(s, e)}
                                title={t('notifications.management.scenarios.copyJson', 'Sao chép JSON mẫu cho Tester')}
                                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80 rounded-none transition-colors"
                              >
                                <HugeiconsIcon icon={Copy01Icon} size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Detail Row for QA / Tester */}
                        {isRowExpanded && (
                          <tr className="bg-muted/15 border-b border-border/80">
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background border border-border p-4">
                                {/* Left Column: Visual Bubble Preview */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider">
                                      {t('notifications.management.scenarios.inappPreview', 'Mô phỏng hiển thị thông báo trong hộp thư (In-app Preview)')}
                                    </span>
                                    <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                      {s.targetTabLabel}
                                    </span>
                                  </div>

                                  <div className="p-3.5 bg-card border border-border shadow-xs flex items-start gap-3">
                                    <div className="size-9 bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                      <HugeiconsIcon icon={Notification03Icon} size={18} />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[13px] font-semibold text-foreground leading-snug">
                                          {s.sampleTitle}
                                        </p>
                                        <span className="text-[11px] text-muted-foreground">{t('notifications.management.scenarios.justNow', 'Vừa xong')}</span>
                                      </div>
                                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                                        {s.sampleBody}
                                      </p>
                                      <div className="flex items-center gap-2 pt-1 text-[11px] text-primary font-medium">
                                        <span>{t('notifications.management.scenarios.clickToOpen', 'Bấm vào để mở {{url}}', { url: s.actionUrl })}</span>
                                        <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                                      </div>
                                    </div>
                                    <div className="size-2 bg-blue-600 rounded-full shrink-0 mt-1.5" title="Chưa đọc" />
                                  </div>

                                  <div className="text-[12px] text-muted-foreground space-y-1">
                                    <p>
                                      • <strong>{t('notifications.management.scenarios.deliveryMechanism', 'Cơ chế phát')}:</strong> {s.deliveryMechanism} ngay khi {s.trigger.toLowerCase()}
                                    </p>
                                    <p>
                                      • <strong>{t('notifications.management.scenarios.recipient', 'Đối tượng nhận')}:</strong> {s.recipient} ({t('notifications.management.scenarios.scopeLabel', 'Phạm vi')}: {s.scope})
                                    </p>
                                    <p>
                                      • <strong>{t('notifications.management.scenarios.displayLocation', 'Vị trí hiển thị')}:</strong> Hộp thư hệ thống → Tab {s.targetTabLabel}
                                    </p>
                                  </div>
                                </div>

                                {/* Right Column: JSON Payload for API / DB Testing */}
                                <div className="space-y-2 flex flex-col justify-between">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider">
                                      {t('notifications.management.scenarios.jsonPayload', 'JSON Payload (Dành cho Tester / Swagger / API test)')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyJson(s, e)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                                    >
                                      <HugeiconsIcon icon={Copy01Icon} size={12} />
                                      <span>{t('notifications.management.scenarios.copyJson', 'Sao chép JSON')}</span>
                                    </button>
                                  </div>

                                  <pre className="p-3 bg-muted/40 border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-[170px] select-text">
{JSON.stringify(
  {
    event_type: s.code,
    title: s.sampleTitle,
    body: s.sampleBody,
    category: s.categoryKey,
    sender: s.sender,
    recipient: s.recipient,
    scope: s.scope,
    channels: s.channels,
    target_tab: s.targetTab,
    delivery: s.deliveryMechanism,
    action_url: s.actionUrl,
  },
  null,
  2
)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}

export default AutomatedNotificationScenariosTable;
