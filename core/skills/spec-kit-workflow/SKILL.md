---
name: spec-kit-workflow
description: Use when starting a new capability, product slice, or workflow from ambiguous intent and you need a spec-first path before implementation.
---

# Spec-kit Workflow

## Overview

Official source: `https://github.com/github/spec-kit`

Spec-kit handles greenfield or loosely defined work. Its job is to turn intent into an executable spec, not to jump into code.

## When to Use

- New feature, new workflow, new agent, new subsystem
- Scope is still fuzzy
- Stakeholders are aligned on outcome but not on shape

Do not use it for a narrow code tweak inside a known design. Use `openspec-workflow` there.

## Core Flow

1. If the repository is ready for official Spec Kit scaffolding, run `specify init`.
2. Clarify user outcome, constraints, and non-goals.
3. Draft or refine the spec using the Spec Kit structure.
4. Split the chosen spec into independently testable slices.
5. Hand the chosen slice to planning and XP execution.

## Required Output

- Problem statement
- Scope / non-goals
- User flow or operating flow
- Acceptance criteria
- Risks and unknowns
- Ordered slices

## Integration Rules

- Prefer official `specify` commands over ad hoc templates.
- Use `superpowers:brainstorming` before drafting the spec.
- Use `superpowers:writing-plans` after the spec stabilizes.
- Use `extreme-programming` for implementation.

## Reference

Read [references/spec-checklist.md](references/spec-checklist.md) when drafting or reviewing the spec.
