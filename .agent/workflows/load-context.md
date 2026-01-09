---
description: Load project context and memory for SUMA medical platform
---

# Load SUMA Project Context

When starting a new session or when context seems lost:

1. Read the project memory file:
   - File: `.agent/memory/project-context.md`
   - Contains: Database schema, auth system, features, pending issues

2. If memory file doesn't exist or is outdated, explore:
   - `src/lib/types.ts` - Data types
   - `src/lib/supabaseService.ts` - Database operations
   - `src/lib/auth.tsx` - Authentication context
   - `src/app/api/` - API routes

3. Key project facts:
   - **Stack**: Next.js 14+, Supabase, TypeScript, shadcn/ui
   - **Supabase Project**: `fnjdqdwpttmrpzbqzbqm`
   - **Roles**: patient, doctor, seller, admin
   - **Walk-in password**: `Suma..00`

4. After major changes, update `.agent/memory/project-context.md`
