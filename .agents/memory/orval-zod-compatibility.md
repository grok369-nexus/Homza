---
name: Orval and Zod compatibility
description: Compatibility constraint for generated validation schemas in this workspace.
---

The installed generated validation runtime is Zod 3-compatible, while Orval can emit Zod 4-only helpers for OpenAPI integer schemas. Use numeric schemas for generated API contracts unless the workspace Zod version is upgraded deliberately.

**Why:** Code generation succeeded but the workspace typecheck failed when integer fields produced `z.int()`, which is unavailable in the installed Zod runtime.

**How to apply:** After changing OpenAPI numeric fields, run codegen and the library typecheck together before wiring the generated schemas into server routes.