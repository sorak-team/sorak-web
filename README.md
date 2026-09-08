# Sorak Web

> Web Portal for the **Sorak Preschool Child Development and Health Monitoring System** (Trường Mầm non Hòn Tre).

Built with **React 19**, **Vite**, **Tailwind CSS**, **Radix UI (shadcn/ui)**, **TanStack Query**, and **Zustand**.

---

## 🛠 Tech Stack

- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS 3.4
- **Component UI**: Radix UI (shadcn pattern) + Lucide Icons
- **State & Caching**: TanStack Query 5 + Zustand 5
- **Forms**: React Hook Form + Zod
- **Routing**: React Router DOM 7
- **Data Visualization**: Recharts 3 + TanStack Table 8

---

## 📁 Directory Structure

```
sorak-web/
├── public/                      # Static assets
├── src/
│   ├── app/                     # Providers, router, layouts
│   ├── components/ui/           # Headless shadcn primitives
│   ├── features/                # Domain-driven feature pages & tabs
│   ├── shared/
│   │   ├── api/                 # Axios client instance with cookie credentials
│   │   ├── components/          # Shared domain widgets (page-header, pagination)
│   │   ├── hooks/               # CRUD & query hooks
│   │   ├── lib/                 # Tailwind merge utilities (cn)
│   │   ├── stores/              # Zustand global client stores
│   │   └── utils/               # Formatting and date helpers
│   ├── index.css                # Design tokens & base styles
│   └── main.jsx                 # Application entry point
├── ARCHITECTURE.md              # Frontend architecture & design system guide
├── components.json              # shadcn UI config
├── jsconfig.json                # Path aliases (@/* -> src/*)
├── package.json
└── vite.config.js
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full design system details, tokens, and page skeleton conventions.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

Application will run locally at `http://localhost:5173`.

---

## 📜 Available Scripts

- `npm run dev`: Start Vite local development server.
- `npm run build`: Build production bundle into `dist/`.
- `npm run preview`: Preview production build locally.
- `npm run format`: Format code using Prettier.
- `npm run format:check`: Check formatting consistency.
- `npm run lint`: Run ESLint analysis.
