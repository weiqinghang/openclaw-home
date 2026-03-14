---
name: openclaw-collab-workflow
description: Use when working on OpenClaw and you need to route changes, new capabilities, debugging, or operations into the correct workflow with repository-specific safety and runtime checks.
---

# OpenClaw Collaboration Workflow

## Purpose

Route OpenClaw work into the correct process.

Do not replace:
- `spec-kit-workflow`
- `openspec-workflow`
- `systematic-debugging`
- `writing-plans`
- `extreme-programming`
- `verification-before-completion`

Select the path and apply OpenClaw-specific checks.

## Use When

Use this skill if the task touches:

- multi-agent behavior
- Feishu accounts, groups, or allowlists
- ACP / Codex runtime
- bootstrap / workspace sync
- safety rules
- hooks / scripts / operator docs
- project-agent workflow
- cross-agent boundaries

Skip it only for isolated low-risk local edits.

## Route First

Choose exactly one primary path before implementation:

- **new capability / new workflow / unclear shape** -> `spec-kit-workflow`
- **existing system change / compatibility / migration / rollout** -> `openspec-workflow`
- **bug / failure / unexpected behavior** -> `systematic-debugging`
- **small scoped implementation with known design** -> `writing-plans` then `extreme-programming`
- **completion check / acceptance / review** -> `verification-before-completion`

If unsure:
- existing thing changed -> `openspec-workflow`
- behavior is broken or unclear -> `systematic-debugging`

## Invariants

Preserve these unless the change explicitly redefines them:

- runtime data stays outside the repo
- agent boundaries stay explicit
- workspace entry files stay controlled
- dangerous runtime actions stay guarded
- operator docs and agent instructions stay separate
- ACP changes are upgrade-sensitive
- Feishu multi-account rules are checked at account scope

## Required Check

Before planning or coding, state:

- task type
- chosen workflow
- touched surfaces
- invariants
- risks
- verification plan

If 3 or more surfaces are touched, treat it as design-first work.

Touched surfaces:

- code
- config
- agents
- skills
- hooks
- scripts
- docs
- runtime
- Feishu
- ACP
- safety controls

## Risk Gates

Require extra care if the task involves:

- Feishu routing or allowlists
- ACP patches or runtime compatibility
- bootstrap or workspace sync
- destructive runtime actions
- cross-agent shared state
- security or permission changes

For these, always define:

- rollback path
- verification steps
- doc impact

## Verification

Do not claim completion without evidence.

Pick only relevant checks:

- script or unit verification
- affected workflow smoke test
- ACP check
- Feishu routing check
- bootstrap / workspace check
- doc consistency check

## Handover

Read or update `.handover.md` only when the user explicitly asks.

If updating:

- include timestamp
- include current commit
- commit separately

## Default Output

For each task, output:

- task type
- chosen workflow
- touched surfaces
- invariants
- risks
- verification
- docs updated or not updated

## References

Read only when needed:

- `references/acp-checklist.md`
- `references/change-examples.md`
- `references/feishu-routing-checklist.md`
- `references/project-bootstrap-checklist.md`
