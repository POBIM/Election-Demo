# Thai Election System - Conventions & Commands Reference

For use in AGENTS.md, AI-assisted development, and automated tooling.

---

## 🎯 CONVENTIONS

### Project Type & Structure
- **Monorepo:** NPM Workspaces with 3 packages (frontend, backend, shared)
- **Language:** TypeScript 5.3.3 (strict mode enforced)
- **Runtime:** Node.js >=18.0.0, ES modules (`"type": "module"`)

### Workspace Layout
```
Election Demo/
├── frontend/          Next.js 16.1.6 + React 19.2.3 (port 3000)
├── backend/           Express.js + Prisma SQLite (port 3001)
├── shared/            TypeScript types library (@election/shared)
└── scripts/           Utility scripts (smoke tests)
```

### TypeScript Strictness
**All packages enforce:**
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedIndexedAccess: true`
- `declaration: true` (generate .d.ts files)
- `sourceMap: true` (for debugging)

### File & Naming Conventions
| Category | Convention | Example |
|----------|-----------|---------|
| React Components | PascalCase | `ElectionCard.tsx`, `VoteForm.tsx` |
| Functions/Variables | camelCase | `getUserRole()`, `electionStatus` |
| Database Models | PascalCase | `User`, `Election`, `District` |
| Database Tables | snake_case via `@@map` | `users`, `elections`, `districts` |
| Types/Interfaces | PascalCase | `IElection`, `VotePayload` |
| Constants | UPPER_SNAKE_CASE | `MAX_CANDIDATES`, `ADMIN_ROLES` |
| Paths (Aliases) | `@alias/*` format | `@election/shared`, `@/*` (frontend) |

### Module System
- **Backend:** ES modules (`"type": "module"`)
- **Frontend:** ES modules (Next.js default)
- **Shared:** ES modules (`"type": "module"`)
- **Path Aliases:**
  - Backend: `@election/shared` → `../shared/src`
  - Frontend: `@/*` → `./src/*`

### ESLint Rules
- **Frontend:** ESLint v9 with Next.js Core Web Vitals + TypeScript
- **Backend:** ESLint v8.55.0 with TypeScript support
- **Shared:** ESLint v8.55.0 with TypeScript support
- **Lint all:** `eslint src --ext .ts` pattern
- **No Prettier config:** Use editor defaults (likely 2-space indents)

### Database Conventions
- **ORM:** Prisma 5.7.0
- **Provider:** SQLite (local), PostgreSQL (production ready)
- **Migrations:** `backend/prisma/migrations/`
- **Seeding:** `backend/prisma/seed.ts` (via `tsx`)
- **Timestamps:** All models include `createdAt`, `updatedAt`
- **Relations:** Proper foreign keys with cascading

### Authentication & RBAC
- **Roles:** Super Admin, Regional Admin, Province Admin, District Official
- **Types:** Defined in `shared/src/types/rbac.ts`
- **Middleware:** Located in `backend/src/middleware/`
- **Auth Routes:** In `backend/src/routes/`

### Build Order (Critical)
When building the monorepo, **order matters:**
1. `shared` (dependency)
2. `backend` (depends on shared)
3. `frontend` (may depend on both)

### Ports & Services
| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | Next.js dev/production server |
| Backend | 3001 | Express.js API server |
| Prisma Studio | 5555 | Database GUI (if opened) |

### Ignore Patterns
**Always excluded from git:**
- `node_modules/`, `dist/`, `build/`, `.next/`, `out/`
- `.env`, `.env.local`, `.env.*.local`
- `*.db`, `*.db-journal`
- `prisma/migrations/**/migration_lock.toml`
- `.idea/`, `.vscode/`, IDE swap files
- `coverage/`, `.nyc_output/`

### Code Organization
```
backend/src/
  ├── routes/       API endpoints (express handlers)
  ├── middleware/   Auth, RBAC, error handling
  ├── services/     Business logic (reusable functions)
  ├── db/          Prisma client initialization
  ├── types/       Local type extensions
  └── index.ts     Entry point

frontend/src/
  ├── app/         Next.js App Router pages
  │   ├── (public)/   Public routes (vote, results)
  │   ├── (auth)/     Auth routes (login)
  │   └── (admin)/    Admin routes (dashboard)
  ├── components/  React components
  ├── lib/        Utilities, context, API clients
  └── hooks/      Custom React hooks

shared/src/
  └── types/      Shared TypeScript definitions
      ├── auth.ts
      ├── election.ts
      ├── vote.ts
      └── rbac.ts
```

### Dependency Direction
```
frontend → backend (via HTTP/API)
backend → shared (direct import)
frontend ↔ shared (types only, no imports at runtime)
```

---

## 🔧 COMMANDS

### Quick Start
```bash
# Install dependencies
npm install

# Seed database with test data
npm run db:seed

# Start development (both services)
npm run dev
```

### Development

| Command | Purpose | Environment |
|---------|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently | development |
| `npm run dev:frontend` | Frontend only (next dev on :3000) | development |
| `npm run dev:backend` | Backend only (tsx watch on :3001) | development |

### Building

| Command | Purpose | Output |
|---------|---------|--------|
| `npm run build` | Full production build (shared → backend → frontend) | Multiple (see below) |
| `npm run build:shared` | Compile shared library | `shared/dist/` |
| `npm run build:backend` | Compile backend TypeScript | `backend/dist/` |
| `npm run build:frontend` | Build Next.js frontend | `frontend/.next/` |

### Code Quality

| Command | Purpose | Scope |
|---------|---------|-------|
| `npm run lint` | Lint all workspaces | frontend, backend, shared |
| `npm run lint:frontend` | ESLint frontend | frontend only |
| `npm run lint:backend` | ESLint backend | backend only |
| `npm run lint:shared` | ESLint shared types | shared only |
| `npm run typecheck` | Type-check all workspaces | frontend, backend, shared |
| `npm run typecheck:frontend` | Next.js type-check | frontend only |
| `npm run typecheck:backend` | TSC --noEmit backend | backend only |
| `npm run typecheck:shared` | TSC --noEmit shared | shared only |

### Database Management

| Command | Purpose | Effect |
|---------|---------|--------|
| `npm run db:generate` | Generate Prisma client | Creates `@prisma/client` types |
| `npm run db:migrate` | Run pending migrations | Interactive, modifies database |
| `npm run db:seed` | Seed database with test data | Populates with demo data |
| `npm run db:reset` | Reset database (⚠️ destructive) | Deletes all data, resets schema |
| `npm run db:studio` | Open Prisma Studio | Visual database browser (port 5555) |

### Testing & Smoke Tests

| Command | Purpose |
|---------|---------|
| `npm run smoke` | Run smoke tests | `bash scripts/smoke/run-all.sh` |

---

## 📝 Development Workflow Checklist

### Before Writing Code
- [ ] Check `.env` configuration for your environment
- [ ] Review `shared/src/types/` for existing type definitions
- [ ] Ensure `npm install` has been run

### When Adding Database Features
```
1. Update backend/prisma/schema.prisma (add/modify model)
2. Run: npm run db:migrate
3. Add types to shared/src/types/
4. Implement API routes in backend/src/routes/
5. Implement middleware if needed (RBAC, auth)
6. Implement frontend components in frontend/src/
```

### Before Committing
```bash
npm run typecheck   # Ensure no type errors
npm run lint        # Fix linting issues
npm run build       # Ensure production build works
```

### To Run Tests (if added in future)
```bash
npm test                 # Run all tests (when configured)
npm test --watch        # Watch mode
npm test -- --coverage  # With coverage report
```

---

## 🚀 Common Scenarios

### Set Up New Feature (Backend)
```bash
# 1. Define types
# Edit: shared/src/types/election.ts (add new types)

# 2. Update database schema
# Edit: backend/prisma/schema.prisma (add/modify models)

# 3. Create migration
npm run db:migrate
npm run db:seed  # Re-seed if schema changes

# 4. Create API routes
# Create: backend/src/routes/newFeature.ts

# 5. Add middleware if needed
# Create: backend/src/middleware/newFeatureAuth.ts

# 6. Type-check and lint
npm run typecheck:backend
npm run lint:backend

# 7. Test locally
npm run dev:backend
```

### Set Up New Feature (Frontend)
```bash
# 1. Create components
# Create: frontend/src/components/NewFeature.tsx

# 2. Create pages (if needed)
# Create: frontend/src/app/(public)/newfeature/page.tsx

# 3. Create hooks if needed
# Create: frontend/src/hooks/useNewFeature.ts

# 4. Type-check and lint
npm run typecheck:frontend
npm run lint:frontend

# 5. Test locally
npm run dev:frontend
```

### Debug Database Issues
```bash
# View database GUI
npm run db:studio

# Inspect current schema
cat backend/prisma/schema.prisma

# Check migration history
ls backend/prisma/migrations/

# Reset to clean state
npm run db:reset
npm run db:seed
```

### Fix Type Errors
```bash
# Check what's wrong
npm run typecheck

# Check specific workspace
npm run typecheck:backend
npm run typecheck:frontend

# Build to see all issues
npm run build
```

### Performance: Concurrent Development
```bash
# Instead of: npm run dev (runs on different terminals if needed)
npm run dev:frontend &  # Background
npm run dev:backend     # Foreground

# Or use a terminal multiplexer (tmux, screen)
# Or IDE with multi-terminal support
```

---

## 🐛 Troubleshooting Commands

| Issue | Command | Notes |
|-------|---------|-------|
| Stale node_modules | `rm -rf node_modules && npm install` | Full reinstall |
| Stale build cache | `rm -rf dist .next && npm run build` | Clean rebuild |
| Database locked | `npm run db:reset && npm run db:seed` | Reset SQLite |
| Type errors persist | `npm run typecheck --force` | Force re-check |
| ESLint errors | `npm run lint -- --fix` | Auto-fix issues |
| Port already in use | `kill $(lsof -t -i:3000) $(lsof -t -i:3001)` | Free ports |

---

## 📦 Dependency Updates

### Check for outdated packages
```bash
npm outdated
```

### Update specific workspace
```bash
npm update --workspace=backend
npm update @election/shared --workspace=backend
```

### Update devDependency
```bash
npm install --save-dev --workspace=frontend typescript@latest
```

---

## 🔐 Environment Setup

### Required Environment Variables
**Backend (.env file):**
```
DATABASE_URL=file:./dev.db
NODE_ENV=development
JWT_SECRET=your-secret-here
PORT=3001
```

**Frontend (.env.local file):**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Local Development
1. Create `backend/.env` (git-ignored)
2. Create `frontend/.env.local` (git-ignored)
3. Never commit `.env` files
4. Use `.env.example` or documentation for template

---

## 📊 Key Metrics

- **Workspaces:** 3 (frontend, backend, shared)
- **Total Dependencies:** ~80+ (across all packages)
- **TypeScript Files:** ~100+ (estimated)
- **Prisma Models:** ~15+ (user, election, vote, party, candidate, etc.)
- **Build Time:** ~30-60 seconds (full rebuild)
- **Dev Server Startup:** ~5-10 seconds each

---

## 🎓 Learning Resources

- TypeScript strict mode: https://www.typescriptlang.org/tsconfig#strict
- Next.js App Router: https://nextjs.org/docs/app
- Express.js: https://expressjs.com/
- Prisma ORM: https://www.prisma.io/docs/
- ESLint: https://eslint.org/docs/rules/

---

**Last Updated:** 2024-02-02  
**For:** AI Agents, Developers, Automated Tools
