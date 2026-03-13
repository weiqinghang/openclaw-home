---
name: extreme-programming
description: Use when implementing a feature or bugfix and you need a disciplined loop of TDD, tiny commits, continuous refactoring, and frequent review.
---

# Extreme Programming

## Overview

Extreme Programming is the execution discipline. It keeps delivery small, testable, and reversible.

## When to Use

- Any non-trivial implementation
- Any bugfix with regression risk
- Any change that benefits from rapid feedback

## Core Loop

1. Write the smallest failing test.
2. Add the minimal code to pass.
3. Refactor while tests stay green.
4. Commit a small coherent step.
5. Re-run review and verification before the next slice.

## Operating Rules

- Prefer TDD over post-hoc tests.
- Keep slices small enough to revert cleanly.
- Treat refactoring as continuous, not end-loaded.
- Ask for review before merges, not after incidents.

## Integration Rules

- Use `superpowers:test-driven-development` before code changes.
- Use `superpowers:requesting-code-review` after meaningful slices.
- Use `superpowers:verification-before-completion` before claiming done.
- Use `superpowers:finishing-a-development-branch` when integration is ready.

## Reference

Read [references/xp-checklist.md](references/xp-checklist.md) when execution starts.
