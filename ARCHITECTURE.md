# Sorak Web — Architecture & Frontend Design System

> **Single source of truth** for frontend engineering across the Sorak team.
> Enforces visual and architectural consistency across all pages and features.

---

## 1. Technology Stack

- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS 3.4 + `tailwindcss-animate`
- **Component Primitives**: Radix UI (Headless accessible primitives / shadcn/ui pattern)
- **Server Cache / Data Fetching**: TanStack Query v5
- **Client Global State**: Zustand 5
- **Forms & Validation**: `react-hook-form` + `zod`
- **Routing**: `react-router-dom` v7
- **Notifications**: Sonner (rich toasts)
- **Charts & Tables**: Recharts 3 + TanStack Table 8
- **Icons**: Lucide React

---

## 2. Directory Structure

```
sorak-web/
├── public/                      # Static public assets
├── src/
│   ├── app/                     # Core app setup: router.jsx, providers.jsx, layouts, guards
│   ├── components/
│   │   └── ui/                  # Headless shadcn / Radix primitives (Button, Dialog, Input...)
│   ├── features/                # Domain feature modules (each domain has its own folder)
│   │   └── <domain>/
│   │       ├── <Domain>Page.jsx
│   │       ├── <Domain>Tab.jsx
│   │       ├── <Domain>Modal.jsx
│   │       └── <domain>-shared.js
│   ├── shared/
│   │   ├── api/                 # Axios instance (client.js) with interceptors & cookies
│   │   ├── components/          # Reusable domain components (PageHeader, DataPagination...)
│   │   ├── hooks/               # Generic hooks (useList, useCreate, useUpdate, useDelete)
│   │   ├── lib/                 # Base utilities (utils.js with cn() helper)
│   │   ├── stores/              # Zustand global client stores (auth.store.js)
│   │   └── utils/               # Formatting, date helpers, number helpers
│   ├── index.css                # Tailwind theme variables (Amber/Ink tokens)
│   └── main.jsx                 # React root mount
├── .editorconfig
├── .env.example
├── .gitignore
├── .prettierrc.json
├── ARCHITECTURE.md
├── components.json              # shadcn CLI configuration
├── index.html
├── jsconfig.json                # Path aliases (@/* -> src/*)
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## 3. Design System & Design Tokens

Always use semantic Tailwind utility classes mapped to CSS variables in `src/index.css`. **Never write raw hex codes** in component JSX.

| Token | Tailwind Class | Usage |
| :--- | :--- | :--- |
| **Primary** (`#f5a623` Amber) | `bg-primary` `text-primary` | Main CTA buttons, active tab indicators, focus rings |
| **Ink** (`#1A2845` Deep Navy) | `text-foreground` | Main body & heading text |
| **Secondary text** | `text-muted-foreground` | Subtitles, meta descriptions, table empty placeholders (`—`) |
| **Card Surface** | `bg-card` | Container backgrounds for tables and forms |
| **Border** | `border` / `border-border` | Section dividers, table borders, card borders |
| **Destructive** | `text-destructive` / `bg-destructive` | Soft-delete, cancel, and alert actions |
| **Radius** | `rounded-md` (`0.5rem`) | Buttons, inputs, modals, cards |

---

## 4. Standard List Page Skeleton (5-Block Pattern)

Every management page must follow the identical 5-block structure:
1. **PageHeader**: Vietnamese title, concise description, and right-aligned primary CTA button.
2. **Filter Bar**: Search input with debounce + filter dropdowns (`Select`).
3. **Table Card**: Clean responsive table rendering data rows with status badges and action menus.
4. **Pagination**: Standard pagination controls (`DataPagination`).
5. **Dialogs / Sheets**: Form modals controlled by state (`createOpen`, `editing`, `deleting`).

---

## 5. Engineering Conventions

1. **Path Aliases**: Always use `@/` to import from `src/` (e.g. `@/shared/api/client`, `@/components/ui/button`).
2. **Data Fetching**: Never create per-feature Axios instances. Use `@/shared/api/client` and TanStack Query hooks.
3. **Forms**: Use `react-hook-form` coupled with Zod schemas. Disable submit buttons if `!isDirty`.
4. **Toasts**: Always notify actions via `sonner`: `toast.success(...)` or `toast.error(...)`.
5. **Localization**:
   - User-facing labels, headings, toasts, placeholders: **Vietnamese**.
   - Code, identifiers, comments, logs, commit messages: **English**.
