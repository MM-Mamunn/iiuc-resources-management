---
name: frontend-redesign
description: >-
  Persistent guidelines and operational playbook for redesigning and improving the RMS
  frontend incrementally, one page or feature at a time, while preserving all existing
  functional features, API integrations, themes, and backend contracts.
---

# Frontend Redesign Guidelines & Incremental Workflow

> [!IMPORTANT]
> **Mandatory Agent Instruction:**
> Any coding agent tasked with redesigning, refactoring, or visually improving any part of this frontend **must read and adhere to this skill before modifying code**.
> This skill is the **persistent source of truth for frontend redesign workflows**. It governs how to modernize and polish interfaces incrementally, with high visual quality, while strictly preserving functional integrity, real API contracts, and user workflows.

---

## 1. Skill Relationships & Reading Order

Frontend redesigns require synthesizing architecture, design philosophy, and component composition. Before writing code, consult the following complementary skills in this specific sequence:

```text
1. architecture/SKILL.md        ──> What exists, how it works, file paths, API contracts, state, auth
2. frontend-design/SKILL.md    ──> Aesthetic direction, bespoke visuals, typography, layout hierarchy
3. shadcn/SKILL.md             ──> Component composition patterns, semantic tokens, accessible structure
4. frontend-redesign/SKILL.md  ──> Operational playbook, incremental scope, preservation rules, verification
```

### How These Skills Complement One Another
- **[`architecture`](file:///d:/B/desktop/RMS%20Drizzle/FrontEnd/.agents/skills/architecture/SKILL.md)**: Details the *structural reality* of the repository (e.g. Vite SPA, React Router 7, Axios with `jwtToken` custom header, Express backend with Drizzle ORM, no WebSockets/Supabase). It tells you **what must not be broken**.
- **[`frontend-design`](file:///d:/B/desktop/RMS%20Drizzle/FrontEnd/.agents/skills/frontend-design/SKILL.md)**: Defines the *aesthetic philosophy* (e.g. creating distinctive, audience-specific academic portals for IIUC rather than generic cookie-cutter templates). It tells you **how to make intentional visual choices**.
- **[`shadcn`](file:///d:/B/desktop/RMS%20Drizzle/FrontEnd/.agents/skills/shadcn/SKILL.md)**: Defines *composition and structural rules* (e.g. semantic tokens, card anatomy, accessible dialogs, form field groups, no arbitrary spacing overrides). It tells you **how to structure component interfaces cleanly**.
- **`frontend-redesign` (This Skill)**: Governs the *execution methodology*—how to scope redesign tasks, preserve 100% of functional capabilities, eliminate visual clutter without data loss, verify cross-theme responsiveness, and report changes.

---

## 2. Incremental Redesign Process

Redesigns must proceed **step-by-step, one page, component, or feature at a time**. Never attempt a sprawling multi-page refactor in a single task.

### A. Pre-Implementation Investigation (5-Step Checklist)
Before modifying a single line of code, execute these 5 steps:

1. **Inspect Existing UI & Functionality**:
   - Open the target page or component file.
   - Understand every user action (buttons, inputs, dropdowns, filters, modals, tabs, pagination).
   - Identify what real data is being displayed and where it originates.
2. **Trace State, API, and Dependencies**:
   - Check all hooks in the component (`useState`, `useEffect`, `useMemo`, `useCallback`).
   - Identify context consumers (`useAuth()`, `useActiveSession()`, `useTheme()`, `useFeatureSettings()`).
   - Identify all API calls (whether imported from `src/services/` or called directly via `api.get`/`api.post`).
   - Check any client caching (`cacheService.js`) or notification hooks (`notify()`).
3. **Identify Reusable Components & Smallest Change Set**:
   - Inspect [`src/pages/components/ui.jsx`](file:///d:/B/desktop/RMS%20Drizzle/FrontEnd/src/pages/components/ui.jsx) and [`src/index.css`](file:///d:/B/desktop/RMS%20Drizzle/FrontEnd/src/index.css) to reuse existing primitives (`PageShell`, `SectionHeading`, `FormField`, `.surface-card`, `.btn-primary`).
   - Determine the exact minimal set of files that need modification.
4. **Align with Architecture and Design Guidelines**:
   - Verify that your proposed layout honors the design tokens and class-based dark mode.
   - Plan semantic HTML structure (headings, labels, buttons) for accessibility.
5. **Implement Only the Assigned Scope**:
   - Confine changes strictly to the target page or component.
   - Do **not** touch unrelated routes, navigation links, or global configurations unless explicitly assigned.

---

## 3. Preserving Existing Functionality (Non-Negotiable)

> [!CAUTION]
> **Zero Feature Regression Rule:**
> **Never remove, break, or disable an existing functional capability.**
> A redesign is a visual and structural enhancement, **not** a feature deprecation.

### What Must ALWAYS Be Preserved
- **Authentication & Authorization**:
  - Keep `useAuth()` integration intact.
  - Preserve protected route redirects and role-specific conditional rendering (`isAdmin`, `isCrOrAdmin`).
  - Do not alter cookie handling or the `jwtToken` request header in `src/api.js`.
- **API Integrations & Contracts**:
  - Keep all backend endpoints, query parameters, path variables, and payload shapes intact.
  - Preserve multipart `FormData` requirements (e.g. `profilePic`, `logo`, `image`, `pdf`).
- **Forms & Usability**:
  - Maintain all input fields, validation checks, error feedback messages, and submit buttons.
  - Preserve loading spinners (`LoadingState`, disabled states during async submission).
  - Retain inline error alerts (`Notice`) and floating toasts (`notify()`).
- **Administrative & Role Features**:
  - In admin or CR pages, keep all tabs, role switchers, session updaters, period editors, query logs, and submission review tools fully operational.
- **Account Settings & Profiles**:
  - Maintain student profile updating, avatar uploading, password resetting, and resource contribution stats.
- **Theme Switching**:
  - Ensure every updated element supports both **Light** and **Dark** themes seamlessly via Tailwind's `dark:` classes or semantic CSS variables.

### Permitted Modifications vs. Prohibited Actions

| Permitted Modifications (Encouraged) | Prohibited Actions (Strictly Forbidden) |
| :--- | :--- |
| Reorganizing layouts into cleaner grids or tabs | Removing existing inputs, buttons, or data tables |
| Replacing cluttered cards with clean modern surfaces | Hardcoding mock data in place of real API calls |
| Removing redundant decorative borders or noise | Altering backend endpoints or API request headers |
| Improving typography, contrast, and spacing | Breaking keyboard navigation or removing form labels |
| Converting clunky inline forms into modal or drawer flows | Dropping error handling, loading states, or validation |
| Grouping related actions into clear button rows | Disabling dark mode support on redesigned elements |

---

## 4. Design Quality Standards

### A. Bespoke, Product-Specific Interface
Follow [`frontend-design/SKILL.md`](file:///d:/B/desktop/RMS%20Drizzle/FrontEnd/.agents/skills/frontend-design/SKILL.md):
- **Audience**: Design specifically for university students, faculty, CRs, and academic administrators at IIUC.
- **Clarity First**: Timetables, period slots, classroom numbers, and course codes require maximum readability. Avoid decorative fluff that obscures critical academic information.
- **Visual Hierarchy**: Every page must have a distinct focal point. Use kickers (`.section-kicker`), bold display titles (`.display-heading`), accent lines (`.heading-accent-line`), and clean subtitle descriptions.

### B. Component Composition (Shadcn Principles)
Follow [`shadcn/SKILL.md`](file:///d:/B/desktop/RMS%20Drizzle/FrontEnd/.agents/skills/shadcn/SKILL.md):
- **Structured Anatomy**: Compose cards using explicit header, title, description, content, and footer hierarchy.
- **Semantic Tokens**: Use established color tokens and classes (`text-slate-900 dark:text-slate-100`, `text-slate-600 dark:text-slate-400`, `bg-white dark:bg-slate-950`) rather than arbitrary hardcoded hex codes.
- **Consistent Gaps**: Use flexbox and grid gaps (`gap-3`, `gap-4`, `gap-6`) instead of deprecated margin hacks (`space-y-*` or `space-x-*`).
- **Button Standards**:
  - Primary actions: `.btn-primary` (violet gradient, elevation, active scale).
  - Secondary/neutral: `.btn-secondary` (bordered, theme-reactive).
  - Destructive: `.btn-danger` (rose gradient, clear warning).
- **Form Groups**: Use `FormField` from `ui.jsx` to wrap inputs with accessible labels, helper text, and error indicators.

### C. Motion and Animation Guidelines
- **Purposeful Feedback**: Motion should orient the user or provide interactive feedback (e.g. hover elevation on cards, active button scaling, smooth modal entrance).
- **Established CSS Keyframes**:
  - `.animate-enter`: Smooth entrance animation for loaded data and tables (`animation: enter 450ms cubic-bezier(0.22, 1, 0.36, 1)`).
  - `.animate-soft-pulse`: Subtle status pulsation.
  - `.animate-marquee`: Smooth continuous marquee for partner sponsors.
- **Framer Motion**: If Framer Motion is present or introduced for complex micro-interactions, use it for layout transitions (`AnimatePresence`, `layoutId`), spring-based dialogs, or multi-step form sequences. Avoid excessive, distracting, or continuous unprompted motion. Respect `prefers-reduced-motion`.

### D. Dark Mode Parity
- Never design light-only. Every background, card, border, text color, and status icon must be verified in dark mode.
- Use Tailwind's `dark:` modifier or CSS custom properties defined in `src/index.css` (`--page-bg`, `--panel-bg`, `--panel-border`, `--brand`).

---

## 5. Code Quality & Architectural Integrity

### A. Modular and Maintainable Structure
- Keep route-level components in `src/pages/` as the default export.
- When creating reusable visual primitives, place them in `src/pages/components/ui.jsx` with named exports.
- When domain logic or formatting is reusable (e.g. routine string parsing, time formatting), extract it into `src/services/` rather than embedding duplicated helpers inside component files.

### B. Respecting Architectural Boundaries
- **No Direct DOM Mutation**: Never bypass React state to manipulate DOM nodes directly (except standard theme class toggling on `<html>` or measurement refs).
- **Defensive Data Handling**: Academic API responses often vary between direct objects, arrays, and `{ rows: [...] }`. Always normalize data defensively using optional chaining (`?.`) and fallback defaults (`?? []`).
- **No Backend Changes for UI Tasks**: Never alter Express routes, backend controllers, Drizzle schemas, or SQL migrations during a frontend UI redesign task.

---

## 6. Verification Checklist & Testing Procedures

Before considering any redesign task complete, perform this verification checklist:

### 1. Functional Verification
- [ ] Authentication works; user session is recognized.
- [ ] All forms submit valid payloads and receive expected responses.
- [ ] Loading spinners render while awaiting async operations.
- [ ] Validation errors and API failure messages display clearly.
- [ ] Modals, drawers, dropdowns, and tabs open and close properly.
- [ ] Table sorting, filtering, and pagination operate as intended.

### 2. Responsive & Cross-Theme Verification
- [ ] **Mobile Viewport (320px – 480px)**: Content stacks cleanly; tables horizontally scroll or wrap; touch targets are at least 44px (`min-h-11`).
- [ ] **Tablet Viewport (768px – 1024px)**: Grid layouts adjust gracefully (`sm:grid-cols-2`, `lg:grid-cols-3`).
- [ ] **Desktop Viewport (1280px+)**: Content stays comfortably constrained within `.page-wrap` (`max-w-7xl`).
- [ ] **Dark Mode**: High contrast, readable typography, no invisible text or borders on dark backgrounds.
- [ ] **Light Mode**: Crisp borders, appropriate shadows, no washed-out text.

### 3. Build & Linter Checks
Run these terminal commands (using `npm.cmd` on Windows PowerShell):
```powershell
# 1. Run ESLint to verify zero lint errors
npm.cmd run lint

# 2. Run Vite build to verify clean production compilation
npm.cmd run build
```

---

## 7. Change Reporting Template

When presenting the completed redesign to the user or recording progress, use this structured reporting format:

```markdown
### Summary of Redesign: [Page or Component Name]

- **Target File(s)**: `src/pages/...`
- **Scope**: [Brief description of what was redesigned]

#### Key Visual & Structural Improvements
- [Improvement 1: e.g. Reorganized cluttered form into responsive 2-column card grid]
- [Improvement 2: e.g. Adopted SectionHeading and MetricCard primitives]
- [Improvement 3: e.g. Polished dark mode contrast and mobile table scrolling]

#### Functionality Preserved
- [Feature 1: e.g. Complete routine add/drop API integration]
- [Feature 2: e.g. Form validation, error notifications, and loading spinners]
- [Feature 3: e.g. Auth session checks and role gating]

#### Verification Results
- **Lint**: Passed (`npm.cmd run lint` - 0 errors)
- **Build**: Passed (`npm.cmd run build` - successful bundle)
- **Responsive & Themes**: Verified on 320px mobile, desktop, light, and dark modes
- **Remaining Issues / Open Questions**: [None or list specific items]
```
