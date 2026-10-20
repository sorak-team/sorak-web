# sorak-web

Frontend single-page application for the Sorak preschool management platform. Provides role-tailored interfaces for administrators, educators, and parents.

## Architecture

The application is structured around domain-driven feature modules:

- **`src/features/`**: Feature-specific views, API clients, and state stores isolated by domain.
- **`src/app/`**: Root routing definitions (`router.jsx`), authentication route guards, and application providers.
- **`src/components/ui/`**: Base UI component primitives built on Radix UI and Tailwind CSS.
- **`src/shared/`**: Shared layout shells (`DashboardShell`, `ParentPortalShell`), Axios client instance, stores, and localization files.

## Tech Stack

- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS 3.4
- **UI Primitives**: Radix UI (shadcn pattern), Lucide React
- **State Management**: Zustand 5
- **Data Visualization**: Recharts 3
- **Routing**: React Router DOM 7
- **Internationalization**: i18next (Vietnamese and English)

## Role Portals

- **Admin & Principal**: Academic calendar management, classroom rosters, teacher workload allocation, student admissions, and class transfer approvals.
- **Teacher**: Daily student attendance check-ins, routine timetable overview, curriculum lesson planning, health logs, daily/weekly assessments, and achievement tracking.
- **Parent**: Mobile-responsive timeline feed, daily meal menus, attendance logs, leave absence requests, authorized pickup delegation, and WHO growth percentile curves.

## Project Structure

```
sorak-web/
├── public/                  # Static assets and icons
├── src/
│   ├── app/                 # Providers, router configuration, route guards
│   ├── components/ui/       # Reusable UI primitives (Button, Dialog, Input, etc.)
│   ├── features/            # Business feature modules (auth, classes, students, etc.)
│   ├── shared/
│   │   ├── api/             # Axios client configuration and interceptors
│   │   ├── components/      # Shared components (AppHeader, AppSidebar, LanguageSwitcher)
│   │   ├── lib/             # Utility functions and i18n setup
│   │   ├── locales/         # i18n dictionary files (vi.json, en.json)
│   │   └── stores/          # Shared Zustand stores (auth, appearance, pagination)
│   ├── index.css            # Global CSS variables and Tailwind directives
│   └── main.jsx             # React application entrypoint
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### Installation & Setup

1. Clone the repository and enter the directory:
   ```bash
   git clone https://github.com/sorak-team/sorak-web.git
   cd sorak-web
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Set the API backend URL:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will run locally at `http://localhost:5173`.

## Available Scripts

- `npm run dev`: Starts the Vite local development server with HMR.
- `npm run build`: Compiles production assets into `dist/`.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint analysis across the project.
- `npm run format`: Formats source files with Prettier.

## Default Accounts

Use the following accounts (password: `123456`) to access different role views:

| Role | Username | Accessible View |
| :--- | :--- | :--- |
| Principal / Admin | `ADMIN01` | Management dashboard, academic years, class transfers |
| Teacher | `CB24001` | Attendance, routine timetable, lesson plans, health logs |
| Parent | `HS26001` | Parent portal timeline, leave requests, pickup delegation |
