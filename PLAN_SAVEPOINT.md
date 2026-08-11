# DepEd Auto-DLP/DLL Generator — Implementation Savepoint

**Status:** Complete — All phases done, ready for manual setup + testing
**Date:** 2026-07-24
**Version:** 1.0

---

## Confirmed Decisions
- [x] Curriculum: Both K-12 MELCs AND MATATAG
- [x] Teaching Methods: 5Es, DEAL, and Custom (free-text)
- [x] UI Language: Bilingual (Filipino + English)
- [x] Deployment: All at once at the end

---

## Tech Stack
| Component | Tool |
|-----------|------|
| Frontend | Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes (serverless) |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| AI Engine | Google AI Studio — Gemini 2.5 Flash (free tier) |
| Export | docx npm library |
| Hosting | Vercel (Hobby Tier) |

---

## Implementation Phases — Progress

### Phase 1: Project Scaffold & Environment Setup ✅ COMPLETE
- [x] Create Next.js project with App Router + TypeScript + Tailwind
- [x] Install all dependencies (@supabase/supabase-js, @supabase/ssr, docx, @google/generative-ai, zod, react-hook-form, etc.)
- [x] Initialize shadcn/ui and add component library (button, card, dialog, input, label, select, textarea, tabs, table, separator, badge, dropdown-menu, skeleton, toast, form)
- [x] Create .env.local and .env.example (Supabase URL, anon key, service role key, Gemini API key)
- [x] Engineer immutable DepEd system prompt (src/lib/prompts.ts) — K-12 + MATATAG, 5Es + DEAL + Custom

### Phase 2: Supabase Setup & Authentication ✅ COMPLETE
- [ ] Create Supabase project (database.new) — **MANUAL STEP: User must create project and get keys**
- [x] SQL setup file created (supabase-setup.sql) — tables, RLS, triggers, indexes
- [x] Create Supabase client utilities (src/lib/supabase/client.ts, server.ts, middleware.ts)
- [x] Create src/middleware.ts for auth guard (session refresh + redirect)
- [x] Build login page (src/app/(auth)/login/page.tsx)
- [x] Build signup page (src/app/(auth)/signup/page.tsx)
- [x] Build auth callback route (src/app/(auth)/auth/callback/route.ts)
- [x] Auth layout (src/app/(auth)/layout.tsx)

### Phase 3: Frontend — Core UI ✅ COMPLETE
- [x] App layout with I18nProvider (src/app/layout.tsx)
- [x] Navbar component (src/components/Navbar.tsx) — logo, nav links, language toggle, user menu
- [x] Protected layout (src/app/(protected)/layout.tsx)
- [x] Landing page with hero section + CTA (src/app/page.tsx)
- [x] Generator form (src/app/(protected)/generate/page.tsx) — all DepEd fields with zod validation
- [x] LessonPlanViewer component (src/components/LessonPlanViewer.tsx)
- [x] Dashboard page with plan list + stats (src/app/(protected)/dashboard/page.tsx)
- [x] Plan detail page with viewer + actions (src/app/(protected)/plan/[id]/page.tsx)

### Phase 4: Backend API & AI Integration ✅ COMPLETE
- [x] POST /api/generate — merges form data + system prompt → calls Gemini (src/app/api/generate/route.ts)
- [x] Gemini client with retry logic (src/lib/gemini.ts)
- [x] POST /api/plan/save — saves to Supabase (src/app/api/plan/save/route.ts)
- [x] GET /api/plan/history — paginated list (src/app/api/plan/history/route.ts)
- [x] GET /api/plan/[id] — single plan fetch (src/app/api/plan/[id]/route.ts)
- [x] DELETE /api/plan/[id] — delete with ownership check (src/app/api/plan/[id]/route.ts)

### Phase 5: Document Export Engine ✅ COMPLETE
- [x] POST /api/export/docx — generates .docx (src/app/api/export/docx/route.ts)
- [x] Docx formatter (src/lib/docx-builder.ts) — DepEd margins, fonts, table borders
- [x] Frontend download trigger integrated in generate page

### Phase 6: History & Dashboard Features ✅ COMPLETE
- [x] Dashboard page with paginated history + stats
- [x] Plan detail with re-edit, download, delete actions
- [x] Delete confirmation dialog

### Phase 7: Bilingual Support ✅ COMPLETE
- [x] i18n context (src/lib/i18n.ts) — EN/FIL toggle with full translations
- [x] Translation strings for UI labels + DepEd section headers
- [x] localStorage preference persistence

---

## Project Structure (Actual Files Created)
```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                          ✅
│   │   ├── login/page.tsx                      ✅
│   │   ├── signup/page.tsx                     ✅
│   │   └── auth/callback/route.ts              ✅
│   ├── (protected)/
│   │   ├── layout.tsx                          ✅
│   │   ├── dashboard/page.tsx                  ✅
│   │   ├── generate/page.tsx                   ✅
│   │   └── plan/[id]/page.tsx                  ✅
│   ├── api/
│   │   ├── generate/route.ts                   ✅
│   │   ├── plan/
│   │   │   ├── save/route.ts                   ✅
│   │   │   ├── history/route.ts                ✅
│   │   │   └── [id]/route.ts                   ✅
│   │   └── export/docx/route.ts                ✅
│   ├── globals.css                             ✅
│   ├── layout.tsx                              ✅
│   └── page.tsx                                ✅
├── components/
│   ├── ui/ (shadcn)                            ✅
│   ├── forms/LessonPlanForm.tsx                ✅
│   ├── LessonPlanViewer.tsx                    ✅
│   └── Navbar.tsx                              ✅
├── lib/
│   ├── supabase/
│   │   ├── client.ts                           ✅
│   │   ├── server.ts                           ✅
│   │   └── middleware.ts                       ✅
│   ├── gemini.ts                               ✅
│   ├── docx-builder.ts                         ✅
│   ├── prompts.ts                              ✅
│   ├── i18n.ts                                 ✅
│   └── utils.ts                                ✅
├── types/
│   └── lesson-plan.ts                          ✅
└── middleware.ts                                ✅

Root files:
├── .env.local                                  ✅
├── .env.example                                ✅
├── supabase-setup.sql                          ✅
├── PLAN_SAVEPOINT.md                           ✅
└── (next.config, tsconfig, package.json, etc.) ✅
```

---

## What To Do Next (Remaining Tasks)
1. **Manual: Create Supabase project** at database.new, run supabase-setup.sql, fill in .env.local keys
2. **Manual: Get Gemini API key** from Google AI Studio (aistudio.google.com), add to .env.local
3. **Test the app** — `npm run dev`, verify auth, generate, export flows
4. **Deploy to Vercel** — push to GitHub, connect repo, set env vars

---

## Notes
- Gemini 2.5 Flash free tier: 10 RPM, 250K TPM, 1,500 RPD
- Use @supabase/ssr (NOT deprecated auth-helpers-nextjs)
- Always use getUser() on server (not getSession()) for auth checks
- RLS policies enforce data isolation between users
- No student PII is stored — DPA compliant
- shadcn/ui components installed: button, card, dialog, input, label, select, textarea, tabs, table, separator, badge, dropdown-menu, skeleton, toast, form
