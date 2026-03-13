---
name: openspec-workflow
description: Use when changing an existing system, process, or codebase and you need explicit change design, impact analysis, and rollout rules before implementation.
---

# OpenSpec Workflow

## Overview

Official source: `https://github.com/Fission-AI/OpenSpec`

OpenSpec handles brownfield change. Its job is to make modifications explicit: what changes, what stays stable, and how rollout stays safe.

## When to Use

- Existing project, existing runtime, existing workflow
- Refactor, migration, policy change, behavior change
- Work touches compatibility, routing, ownership, or rollout

Do not use it for zero-risk cosmetic edits. Use normal implementation flow there.

## Core Flow

1. If the repository is ready for official OpenSpec scaffolding, run `openspec init`.
2. Baseline the current behavior and constraints.
3. Define the target change and preserved invariants.
4. List touched surfaces: code, docs, runtime, operators, users.
5. Design migration, rollout, rollback, and verification.
6. Pass the approved change set to planning and XP execution.

## Required Output

- Current state
- Target state
- Invariants
- Impacted surfaces
- Migration path
- Rollback path
- Verification plan

## Integration Rules

- Prefer official `openspec` commands over ad hoc templates.
- Use `superpowers:brainstorming` to frame the change.
- Use `superpowers:writing-plans` once the change shape is stable.
- Use `extreme-programming` to implement in small, reversible steps.

## Reference

Read [references/change-checklist.md](references/change-checklist.md) for review and rollout checks.
