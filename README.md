# Sorak Web — Modern Preschool Management & Parent Portal

[![React Version](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%206-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Radix UI](https://img.shields.io/badge/Components-Radix%20UI%20%2F%20shadcn-161618?logo=radix-ui&logoColor=white)](https://ui.shadcn.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand%205-764ABC?logo=redux&logoColor=white)](https://zustand.docs.pmnd.rs/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Cổng Thông tin Quản lý Giáo dục & Sổ Liên lạc Điện tử Mầm non (Trường Mầm non Hòn Tre)**  
> **Capstone Project SEP490 — FPT University (Fall 2026)**

---

## 📖 Tổng Quan Ứng Dụng (Application Overview)

**Sorak Web** là ứng dụng Frontend Single Page Application (SPA) hiện đại, phục vụ công tác chuyển đổi số toàn diện cho trường mầm non. Ứng dụng cung cấp không gian làm việc số hóa trực quan cho Ban Giám Hiệu, Giáo viên và phụ huynh theo tiêu chuẩn giáo dục của Bộ Giáo dục & Đào tạo (MOET).

Ứng dụng được xây dựng trên nền tảng **React 19** và **Vite**, kết hợp hệ thống thiết kế **Sorak Design System** thân thiện với lứa tuổi mầm non, hỗ trợ đầy đủ chế độ **Sáng/Tối (Light/Dark Mode)**, đa ngôn ngữ (**Tiếng Việt / English**) và hiển thị mượt mà trên cả máy tính, máy tính bảng và điện thoại di động.

---

## 🎨 Hệ Thống Giao Diện Theo Vai Trò (Role-Tailored Portals)

Ứng dụng chia thành 3 phân hệ giao diện chuyên biệt được bảo vệ bởi bộ định tuyến phân quyền (`ProtectedRoute`):

### 1. Phân Hệ Ban Giám Hiệu & Quản Trị (Admin & Principal Portal)
- **Tổng quan quản trị trường học:** KPI thống kê sĩ số học sinh theo khối, tỷ lệ nam/nữ, tỷ lệ lấp đầy phòng học và tình hình tuyển sinh.
- **Quản lý Năm học & Lịch sự kiện:** Cấu hình học kỳ, mốc đánh giá, đánh dấu ngày lễ quốc gia, chuyển đổi năm học kế tiếp.
- **Hồ sơ Giáo viên & Phân công chủ nhiệm:** Quản lý bằng cấp, phân bổ khối lượng giảng dạy giữa giáo viên chính và giáo viên phụ.
- **Phê duyệt chuyển lớp:** Quy trình kiểm tra chỉ tiêu lớp đến, xem xét lý do và duyệt hồ sơ chuyển lớp học sinh.
- **Báo cáo & Xuất dữ liệu:** Xuất danh sách học sinh, sổ theo dõi phát triển ra file Excel và PDF đóng dấu mộc trường.

### 2. Phân Hệ Giáo Viên Chủ Nhiệm (Teacher Portal)
- **Điểm danh & Theo dõi xe buýt hàng ngày:** Thao tác 1 chạm (*Có mặt*, *Vắng phép*, *Vắng không phép*), ghi nhận giờ đón/trả và tình trạng lên/xuống xe đưa đón.
- **Thời khóa biểu & Chế độ sinh hoạt tuần:** Ma trận sinh hoạt chi tiết từ đón trẻ, thể dục sáng, ăn trưa, ngủ trưa, ăn xế đến trả trẻ.
- **Kế hoạch giáo dục & Trợ lý AI:** Lập kế hoạch theo tuần theo 5 lĩnh vực phát triển MOET; sử dụng Trợ lý AI gợi ý trò chơi, bài thơ, học liệu phù hợp lứa tuổi.
- **Kiểm tra sức khỏe thể chất:** Ghi nhận chiều cao, cân nặng, tự động tính chỉ số BMI và đối chiếu bảng chuẩn Z-score của WHO.
- **Đánh giá trẻ & Khen thưởng Bé Ngoan:** Nhật ký quan sát hàng ngày (thang 3 mức), tổng hợp phiếu phát triển học kỳ (radar chart 5 cánh), chấm cờ hoa Bé Ngoan tuần.

### 3. Cổng Tương Tác Phụ Huynh (Mobile-first Parent Portal)
- **Dòng thời gian trực tiếp (Daily Timeline):** Cập nhật thời gian thực giờ con đến lớp, thực đơn chi tiết 3 bữa, thời lượng ngủ trưa và trạng thái cảm xúc.
- **Sổ theo dõi sức khỏe điện tử:** Theo dõi biểu đồ tăng trưởng chiều cao/cân nặng của con theo chuẩn WHO qua các tháng.
- **Dịch vụ tiện ích 1 chạm:** Gửi đơn xin nghỉ phép có lý do, ủy quyền người thân đón trẻ (có ảnh và CCCD đối chiếu), gửi dặn dò thuốc cho cô giáo.
- **Bộ sưu tập Hoa Bé Ngoan:** Xem và tải giấy khen Bé Ngoan tuần kèm lời nhận xét ấm áp từ giáo viên chủ nhiệm.

---

## 🧩 Các Module Nghiệp Vụ Chính (Core Feature Modules)

```
sorak-web/src/features/
├── auth/                 # Đăng nhập, khôi phục mật khẩu, xác thực OTP 6 số, bảo vệ tuyến đường
├── accounts/             # Quản lý tài khoản người dùng, đổi mật khẩu, phân quyền RBAC
├── teachers/             # Hồ sơ giáo viên, trình độ chuyên môn, phân công lớp học
├── academic-years/       # Cấu hình năm học, mốc học kỳ, ngày nghỉ lễ, huy hiệu năm học
├── classes/              # Quản lý phòng học, sĩ số, chỉ tiêu, phân bổ giáo viên & học sinh
├── students/             # Danh bạ học sinh, hồ sơ phụ huynh, hồ sơ nhập học, lọc lứa tuổi
├── transfers/            # Quy trình xét duyệt đơn xin chuyển lớp học sinh
├── curriculum/           # Khung 5 lĩnh vực phát triển MOET, quản lý chủ đề & mục tiêu giáo dục
├── planning/             # Phân bổ ma trận hoạt động học, trợ lý AI gợi ý bài học
├── daily/                # Thời khóa biểu tuần và chế độ sinh hoạt trong ngày
├── attendance/           # Bảng điểm danh hàng ngày, theo dõi trạng thái xe buýt trường
├── health/               # Khám sức khỏe định kỳ, tính BMI tự động, biểu đồ tăng trưởng WHO
├── assessment/           # Đánh giá trẻ hàng ngày, báo cáo phát triển định kỳ & cuối học kỳ
├── good-behavior/        # Tiêu chí Bé Ngoan, bình cờ hoa, cấp giấy khen tuần
├── parent/               # Cổng thông tin phụ huynh: dòng thời gian, thực đơn, xin nghỉ, ủy quyền
├── settings/             # Cài đặt giao diện hệ thống, chuyển đổi Sáng/Tối, ngôn ngữ
└── notifications/        # Trung tâm thông báo đẩy các sự kiện quan trọng trong ngày
```

---

## 🏗 Kiến Trúc Frontend (Frontend Architecture)

Hệ thống được tổ chức theo kiến trúc **Domain-Driven Feature Modules**:

```
                                    App Entry (main.jsx)
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │       Global Providers        │
                             │  • React Router DOM 7         │
                             │  • Appearance (Light/Dark)    │
                             │  • i18next (vi / en)          │
                             └───────────────┬───────────────┘
                                             │
                                             ▼
                             ┌───────────────────────────────┐
                             │      Router & Route Guards    │
                             │  • PublicOnlyRoute (Login/OTP)│
                             │  • ProtectedRoute (RBAC Guard)│
                             └───────────────┬───────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
        ┌───────────────────────────┐                 ┌───────────────────────────┐
        │  DashboardShell (Desktop) │                 │ ParentPortalShell (Mobile)│
        │  • Sidebar & AppHeader    │                 │ • Mobile Header & Banner  │
        │  • BGH & Teacher Modules  │                 │ • Bottom Navigation Bar   │
        └─────────────┬─────────────┘                 └─────────────┬─────────────┘
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             ▼
                             ┌───────────────────────────────┐
                             │      Domain Feature Pages     │
                             │  • Zustand Reactive Stores    │
                             │  • Axios API Client           │
                             │  • Radix UI + Recharts Visual │
                             └───────────────────────────────┘
```

---

## 🛠 Tech Stack

- **Core Framework:** React 19 + Vite 6
- **CSS & Styling:** Tailwind CSS 3.4, PostCSS, Autoprefixer
- **UI Primitives:** Radix UI (shadcn pattern) + Lucide React Icons
- **State Management:** Zustand 5 (Client state), Axios Interceptors (Network & Tokens)
- **Data Visualization:** Recharts 3 (Radar charts, Growth curves, Donut charts)
- **Internationalization (i18n):** i18next + react-i18next (Tiếng Việt & English)
- **Notifications:** Sonner Toast Notifications
- **Tooling:** ESLint, Prettier, jsconfig path aliases (`@/*`)

---

## 📁 Cấu Trúc Thư Mục (Directory Structure)

```
sorak-web/
├── public/                      # Tài nguyên tĩnh (ảnh nền, mascot trường, logo vector)
├── src/
│   ├── app/
│   │   ├── providers.jsx        # Nhà cung cấp ngữ cảnh toàn cục (Context Providers)
│   │   └── router.jsx           # Cấu hình bảng định tuyến toàn ứng dụng
│   ├── components/ui/           # Các thành phần giao diện nguyên tử shadcn (Button, Card, Dialog...)
│   ├── features/                # 17 thư mục module tính năng theo từng nghiệp vụ chuyên biệt
│   ├── shared/
│   │   ├── api/                 # Cấu hình Axios client kèm interceptor tự động đính kèm cookie
│   │   ├── components/          # Thành phần dùng chung (AppHeader, AppSidebar, LanguageSwitcher...)
│   │   ├── hooks/               # Các custom hooks tái sử dụng
│   │   ├── lib/                 # Tiện ích cn (clsx + tailwind-merge), i18n instance
│   │   ├── locales/             # Từ điển dịch đa ngôn ngữ vi.json và en.json
│   │   ├── stores/              # Các store trạng thái toàn cục (auth, appearance, pagination)
│   │   └── utils/               # Hàm định dạng ngày tháng, tiền tệ, mặt nạ email
│   ├── index.css                # Biến màu Design Tokens (HSL), typography và font Inter
│   └── main.jsx                 # Điểm khởi chạy ứng dụng React
├── components.json              # Cấu hình shadcn UI
├── tailwind.config.js           # Cấu hình bảng màu, kích thước và font Tailwind
├── vite.config.js               # Cấu hình bundler Vite và alias đường dẫn `@/`
└── README.md
```

---

## 🔑 Tài Khoản Trải Nghiệm Thử Nghiệm (Demo Accounts)

Bạn có thể sử dụng các tài khoản demo sau đây để kiểm tra các giao diện và luồng phân quyền:

| Vai Trò | Tên Đăng Nhập | Mật Khẩu | Giao Diện Trải Nghiệm |
| :--- | :--- | :--- | :--- |
| **BGH / Hiệu Trưởng** | `ADMIN01` | `123456` | Toàn quyền quản trị, năm học, duyệt lớp, cấu hình trường học. |
| **Phó Hiệu Trưởng** | `CB24001` | `123456` | Quản lý giáo viên, chủ nhiệm lớp Mầm 1, lập thời khóa biểu. |
| **Giáo Viên Chủ Nhiệm** | `CB25001` | `123456` | Điểm danh, nhập chỉ số sức khỏe, kế hoạch bài dạy, chấm Bé Ngoan. |
| **Phụ Huynh Học Sinh** | `HS26001` | `123456` | Cổng phụ huynh em Lê Tuấn Kiệt (Lớp Mầm 1): xin nghỉ, ủy quyền đón. |
| **Phụ Huynh Học Sinh** | `HS26016` | `123456` | Cổng phụ huynh em Nguyễn Anh Thư (Lớp Nhà trẻ A1): theo dõi thực đơn. |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Getting Started)

### Yêu cầu môi trường
- **Node.js**: Phiên bản 22.x LTS trở lên
- **npm**: Phiên bản 10.x trở lên

### Các bước cài đặt

1. **Clone repository:**
   ```bash
   git clone https://github.com/sorak-team/sorak-web.git
   cd sorak-web
   ```

2. **Cấu hình môi trường kết nối Backend:**
   Sao chép tệp `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
   *Nội dung cấu hình:*
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

3. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```

4. **Khởi chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```

Mở trình duyệt tại: `http://localhost:5173`.

---

## 📜 Các Scripts Có Sẵn (Available Scripts)

- `npm run dev`: Chạy ứng dụng trên máy chủ phát triển cục bộ của Vite với Hot Module Replacement (HMR).
- `npm run build`: Biên dịch và tối ưu hóa mã nguồn thành gói sản phẩm tĩnh trong thư mục `dist/`.
- `npm run preview`: Chạy thử nghiệm gói sản phẩm tĩnh sau khi build.
- `npm run lint`: Phân tích lỗi cú pháp và chất lượng mã nguồn bằng ESLint.
- `npm run format`: Tự động định dạng mã nguồn theo tiêu chuẩn Prettier.

---

## 👨‍💻 Đội Ngũ Thực Hiện (Sorak Team — SEP490 Fall 2026)

| STT | Thành Viên | Vai Trò Trong Dự Án | GitHub Handle |
| :---: | :--- | :--- | :--- |
| 1 | **La Thiên Toàn** | Leader / Full-stack Developer | [@toanthienla](https://github.com/toanthienla) |
| 2 | **Phan Văn Hữu Thuận** | Full-stack Developer | [@ThunFan127](https://github.com/ThunFan127) |
| 3 | **Nguyễn Ngọc Hân** | Frontend / Full-stack Developer | [@hancontam](https://github.com/hancontam) |
| 4 | **Huỳnh Phúc Thọ** | Full-stack Developer | [@HuynhPhucTho-Web](https://github.com/HuynhPhucTho-Web) |
| 5 | **Quang Nhật Phi Yến** | Full-stack Developer | [@quangnhatphiyen](https://github.com/quangnhatphiyen) |

---
*Bản quyền © 2026 Sorak Team — Đại học FPT. Dự án phục vụ Đồ án Tốt nghiệp Kỹ sư Kỹ thuật Phần mềm (SEP490).*
