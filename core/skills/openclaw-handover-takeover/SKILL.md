---
name: openclaw-handover-takeover
description: Use when working on OpenClaw and the user asks to hand over, take over, continue previous work, update handover, read handover, or resume from the current repository state tracked in .handover.md.
---

# OpenClaw Handover Takeover

## Purpose

Handle repository handover and takeover through `.handover.md`.

Use the existing repository handover format.
Do not invent a new handover structure.

## Use When

Use this skill when the user says or implies:

- handover
- take over
- continue previous work
- resume from current state
- update handover
- read handover
- 接手
- 接管
- 继续上次工作
- 更新 handover
- 读取 handover

## Hard Rules

- If the user asks to **take over / 接手 / 接管 / continue previous work**, read `.handover.md` first.
- If the user asks to **update handover / 更新 handover**, update `.handover.md`.
- Do not update `.handover.md` unless the user explicitly asks.
- When updating handover, keep the existing section structure unless the user asks for a redesign.
- When updating handover, include:
  - current timestamp
  - current baseline commit
  - only the durable facts worth handing to the next agent

## Takeover Flow

1. Read `.handover.md`.
2. Extract:
   - current state
   - important completed work
   - active risks or constraints
   - next recommended actions
3. Report the takeover summary before doing deeper work.

## Handover Flow

1. Review the current repository state.
2. Update `.handover.md` using the existing format.
3. Keep only durable project facts, not transient conversation noise.
4. Commit the handover update separately.

## Output

For takeover, report:

- current state
- important constraints
- next steps

For handover update, report:

- handover updated
- timestamp used
- baseline commit used
