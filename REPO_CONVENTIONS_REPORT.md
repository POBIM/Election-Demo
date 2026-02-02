# Thai Election System - Repository-Level Conventions Report

**Generated:** 2024-02-02  
**Repository:** `/home/posebimgroup/Election Demo`  
**Project Type:** Monorepo (TypeScript/Node.js + Next.js)

---

## 📋 Table of Contents

1. [Package Management & Structure](#package-management--structure)
2. [TypeScript Configuration](#typescript-configuration)
3. [Linting Conventions](#linting-conventions)
4. [Build & Development Setup](#build--development-setup)
5. [Database & Prisma](#database--prisma)
6. [Testing Framework](#testing-framework)
7. [Code Style Rules](#code-style-rules)
8. [Project Structure](#project-structure)
9. [Build Commands](#build-commands)
10. [Version Requirements](#version-requirements)

---

## Package Management & Structure

### Workspace Configuration
- **Type:** NPM Workspaces (Monorepo)
- **Root Directory:** `/home/posebimgroup/Election Demo/`
- **Workspaces:**
  - `frontend/` - Next.js 16.1.6 + React 19.2.3
  - `backend/` - Express.js + Node.js (ES modules)
  - `shared/` - Shared TypeScript types library

### Root package.json
```json
{
  "name": "thai-election-system",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["frontend", "backend", "shared"],
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
```

### Workspace Scripts
Scripts in root `package.json` delegate to workspace-specific scripts using npm workspaces (`-w` flag):

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run frontend + backend concurrently |
| `npm run build` | Build shared → backend → frontend (order matters) |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type-check all workspaces |
| `npm run db:migrate` | Run database migrations (backend) |
| `npm run db:seed` | Seed database with test data |
| `npm run db:reset` | Reset database (destructive) |
| `npm run smoke` | Run smoke tests |

---

## TypeScript Configuration

### Base Configuration: `tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Backend: `backend/tsconfig.json`
- **Extends:** `../tsconfig.base.json`
- **Output:** `./dist`
- **Root:** `./src`
- **Module:** `NodeNext` (ES modules)
- **Path Aliases:**
  - `@election/shared` → `../shared/src`
- **Project References:** References `../shared` for composite builds
- **Excluded:** `node_modules`, `dist`

### Frontend: `frontend/tsconfig.json`
- **Target:** `ES2017`
- **Module:** `esnext`
- **Module Resolution:** `bundler` (Next.js)
- **JSX:** `react-jsx`
- **Plugins:** Next.js type checking plugin
- **Path Aliases:**
  - `@/*` → `./src/*`
- **Includes:** `.ts`, `.tsx`, `.mts` files + Next.js generated types

### Shared: `shared/tsconfig.json`
- **Extends:** `../tsconfig.base.json`
- **Output:** `./dist`
- **Root:** `./src`
- **Composite:** `true` (enables project references in dependent packages)

### Compiler Strictness
**All packages enforce strict mode:**
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedIndexedAccess: true`

---

## Linting Conventions

### ESLint Configuration

#### Frontend: `frontend/eslint.config.mjs`
- **Config Format:** Flat config (ESLint v9+)
- **Base Rules:** 
  - `eslint-config-next/core-web-vitals` - Web Vitals best practices
  - `eslint-config-next/typescript` - TypeScript support
- **Global Ignores:**
  - `.next/**`
  - `out/**`
  - `build/**`
  - `next-env.d.ts`

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])
]);

export default eslintConfig;
```

#### Backend & Shared
- **Config Format:** Default ESLint v8 configuration (no explicit `.eslintrc` files)
- **Version:** `^8.55.0`
- **Lint Command:** `eslint src --ext .ts`
- **Uses TypeScript support:** via ESLint + type information

### ESLint Versions
| Package | Version |
|---------|---------|
| frontend | ^9 |
| backend | ^8.55.0 |
| shared | ^8.55.0 |

### Lint Scripts
```bash
npm run lint               # Lint all workspaces
npm run lint:frontend      # Frontend only
npm run lint:backend       # Backend only
npm run lint:shared        # Shared types only
```

---

## Build & Development Setup

### Development Servers
| Service | Port | Command |
|---------|------|---------|
| Frontend | 3000 | `npm run dev:frontend` or `next dev` |
| Backend | 3001 | `npm run dev:backend` or `tsx watch src/index.ts` |
| Both (concurrent) | 3000+3001 | `npm run dev` |

### Build Process

#### Build Order (Sequential)
1. **Shared library first** → `npm run build:shared` → outputs `shared/dist`
2. **Backend** → `npm run build:backend` → outputs `backend/dist`
3. **Frontend** → `npm run build:frontend` → outputs `frontend/.next`

**Reason:** Backend depends on `@election/shared`, frontend may depend on both.

#### Build Commands
```bash
npm run build              # Build all (respects order)
npm run build:shared       # Build shared only (tsc)
npm run build:backend      # Build backend only (tsc)
npm run build:frontend     # Build frontend only (next build)
```

### Type Checking
```bash
npm run typecheck          # Type-check all workspaces
npm run typecheck:shared   # tsc --noEmit
npm run typecheck:backend  # tsc --noEmit
npm run typecheck:frontend # Next.js type checking
```

---

## Database & Prisma

### Prisma Setup
- **Provider:** SQLite (local development)
- **Database File:** `backend/prisma/dev.db`
- **Schema:** `backend/prisma/schema.prisma`
- **Client:** `@prisma/client@^5.7.0`

### Database Commands
```bash
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run pending migrations (interactive)
npm run db:seed            # Seed database with test data
npm run db:reset           # Reset database (destructive!)
npm run db:studio          # Open Prisma Studio (GUI)
```

### Prisma Schema Features
- **Models:** Region, Province, District, Election, Party, Candidate, Vote, User, etc.
- **Relations:** Proper foreign key relationships with cascading
- **Timestamps:** `createdAt`, `updatedAt` on most models
- **Data Types:** String (cuid), Int, DateTime, Boolean enums

### Migration Management
- **Location:** `backend/prisma/migrations/`
- **Lock File:** `backend/prisma/migrations/*/migration_lock.toml`
- **Gitignore:** Lock files excluded from version control

---

## Testing Framework

**No explicit test framework configured** 

Current observations:
- No `jest.config.js`, `vitest.config.js`, or test scripts in package.json files
- No test dependencies in devDependencies
- `coverage/` and `.nyc_output/` directories ignored in `.gitignore`

**Recommendation for future:** Consider adding Jest or Vitest if testing is added.

---

## Code Style Rules

### Project-Specific Conventions

#### File Organization
```
frontend/
  ├── src/
  │   ├── app/           # App Router pages
  │   ├── components/    # React components
  │   ├── lib/          # Utilities & Context
  │   └── hooks/        # Custom React hooks

backend/
  ├── src/
  │   ├── routes/       # API endpoints
  │   ├── middleware/   # Auth & RBAC middleware
  │   ├── services/     # Business logic
  │   └── db/          # Prisma client setup

shared/
  └── src/
      └── types/        # TypeScript type definitions
```

#### Naming Conventions
- **Database Models:** PascalCase, singular (e.g., `User`, `Election`)
- **Database Tables:** lowercase with underscores (via `@@map`)
- **React Components:** PascalCase (e.g., `ElectionCard`, `VoteForm`)
- **Functions/Variables:** camelCase
- **Types/Interfaces:** PascalCase (TypeScript convention)
- **Constants:** UPPER_SNAKE_CASE

#### Module System
- **Backend:** `"type": "module"` (ES modules)
- **Frontend:** Next.js (ES modules by default)
- **Shared:** `"type": "module"` (ES modules)

#### Imports
- **Workspace imports:** Use path aliases:
  - `@election/shared` (backend)
  - `@/*` (frontend)
- **External packages:** Standard npm package names

---

## Project Structure

### Root Level
```
Election Demo/
├── frontend/                    # Next.js 16.1.6 Frontend
├── backend/                     # Express.js Backend
├── shared/                      # Shared TypeScript Types
├── scripts/                     # Utility scripts (smoke tests)
├── package.json                 # Workspace root config
├── tsconfig.base.json          # Base TypeScript config
├── README.md                    # Thai documentation
├── .gitignore                  # Root-level git ignore rules
├── .env.local                  # Local environment (not tracked)
├── package-lock.json           # Dependency lock file
├── CI_WORKFLOW_REPORT.md       # CI/CD documentation
└── PROJECT_STRUCTURE_ANALYSIS.md # Architecture docs
```

### Backend Structure
```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware (auth, RBAC)
│   ├── services/        # Business logic services
│   ├── types/          # Type definitions
│   └── index.ts        # Entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   ├── migrations/     # Migration history
│   └── seed.ts        # Test data seeding
├── dist/               # Compiled output (ES modules)
├── tsconfig.json       # Backend TypeScript config
├── package.json        # Backend dependencies
└── .env               # Backend environment variables
```

### Frontend Structure
```
frontend/
├── src/
│   ├── app/           # Next.js App Router
│   │   ├── (public)/  # Public pages (vote, results)
│   │   ├── (auth)/    # Auth pages (login)
│   │   └── (admin)/   # Admin dashboard
│   ├── components/    # React components
│   ├── lib/          # Utilities, context, hooks
│   └── hooks/        # Custom React hooks
├── public/            # Static assets
├── .next/             # Next.js build output
├── tsconfig.json      # Frontend TypeScript config
├── package.json       # Frontend dependencies
└── eslint.config.mjs # ESLint flat config
```

### Shared Structure
```
shared/
├── src/
│   └── types/         # TypeScript type definitions
│       ├── auth.ts   # Authentication types
│       ├── election.ts
│       ├── vote.ts
│       ├── rbac.ts
│       └── index.ts
├── dist/              # Compiled output
├── tsconfig.json      # Shared TypeScript config
└── package.json       # Shared exports config
```

---

## Build Commands

### Development
```bash
npm run dev              # Start both frontend + backend (concurrently)
npm run dev:frontend    # Frontend only (Next.js dev server on :3000)
npm run dev:backend     # Backend only (tsx watch on :3001)
```

### Production Build
```bash
npm run build           # Full build: shared → backend → frontend
npm run build:shared    # TypeScript compilation only
npm run build:backend   # TypeScript compilation + dist/
npm run build:frontend  # Next.js production build
```

### Linting & Type Checking
```bash
npm run lint            # ESLint all workspaces
npm run lint:frontend   # Frontend ESLint only
npm run lint:backend    # Backend ESLint only
npm run lint:shared     # Shared ESLint only

npm run typecheck       # Full type-check
npm run typecheck:frontend  # Next.js type-check
npm run typecheck:backend   # TSC --noEmit (backend)
npm run typecheck:shared    # TSC --noEmit (shared)
```

### Database Management
```bash
npm run db:generate    # Generate Prisma client types
npm run db:migrate     # Interactive migration prompt
npm run db:seed        # Seed test data (via tsx)
npm run db:reset       # Full reset (⚠️ destructive)
npm run db:studio      # Prisma Studio (GUI for DB)
```

### Quality Assurance
```bash
npm run smoke          # Run smoke tests (bash scripts/smoke/run-all.sh)
```

---

## Version Requirements

### Node.js
- **Minimum:** `18.0.0` (per `package.json` engines)
- **npm:** `9+` (per README, supports workspaces)

### Framework Versions
| Package | Version | Purpose |
|---------|---------|---------|
| TypeScript | ^5.3.3 | Language |
| Next.js | 16.1.6 | Frontend framework |
| React | 19.2.3 | UI library |
| Express.js | ^4.18.2 | Backend framework |
| Prisma | ^5.7.0 | ORM |
| ESLint | ^8.55.0 / ^9 | Code linting |

### Key Dependencies
**Backend:**
- `@prisma/client` - Database ORM
- `bcryptjs` - Password hashing
- `cors` - CORS middleware
- `cookie-parser` - Cookie handling
- `jsonwebtoken` - JWT tokens
- `zod` - Schema validation
- `dotenv` - Environment variables
- `tsx` - TypeScript execution (dev)

**Frontend:**
- `next` - React framework
- `react` + `react-dom` - UI framework
- `tailwindcss` - Styling
- `lucide-react` - Icons
- `@radix-ui/react-slot` - UI primitives
- `class-variance-authority` - Style composition

---

## Ignore Patterns

### `.gitignore` (Root Level)
```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/
out/

# Database
*.db
*.db-journal
prisma/migrations/**/migration_lock.toml

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs & Testing
logs/
*.log
npm-debug.log*
coverage/
.nyc_output/

# Miscellaneous
*.tgz
.cache/
```

### `.gitignore` (Frontend)
- Next.js build output (`.next/`, `out/`)
- Environment files (`.env*`)
- Node modules
- Testing coverage
- IDE files

---

## Project-Specific Rules

### Authentication & RBAC
- **Types Defined In:** `shared/src/types/rbac.ts`
- **Middleware Location:** `backend/src/middleware/`
- **Auth Routes:** `backend/src/routes/` (auth endpoints)
- **RBAC Roles:** Super Admin, Regional Admin, Province Admin, District Official

### API Conventions
- **Base URL:** `http://localhost:3001` (backend)
- **Frontend URL:** `http://localhost:3000`
- **API Prefix:** All routes in `backend/src/routes/`
- **Database First:** Uses Prisma migrations for schema version control

### Development Workflow
1. **Type First:** Define types in `shared/src/types/`
2. **Database:** Update `backend/prisma/schema.prisma`
3. **Backend:** Implement API routes & services
4. **Frontend:** Consume API in React components
5. **Lint:** Run `npm run lint` before committing
6. **Type-Check:** Run `npm run typecheck` before building

---

## Summary Table

| Aspect | Configuration |
|--------|---------------|
| **Package Manager** | npm (workspaces) |
| **Language** | TypeScript 5.3.3 |
| **Type Checking** | Strict mode enabled, project references |
| **Linting** | ESLint (v8 + v9), next/core-web-vitals |
| **Formatting** | Not explicitly configured (code editor default) |
| **Testing** | None configured |
| **Database** | SQLite + Prisma 5.7.0 |
| **Frontend** | Next.js 16.1.6 + React 19.2.3 + Tailwind v4 |
| **Backend** | Express.js + Node.js ES modules |
| **Build System** | TypeScript compiler + Next.js build |
| **Module System** | ES modules (type: "module") |
| **Node Version** | >= 18.0.0 |

---

**Last Updated:** 2024-02-02  
**Status:** Extracted from active repository
