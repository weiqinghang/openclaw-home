# ACP Checklist

Use when the task touches ACP, Codex runtime, session spawn, or OpenClaw upgrade compatibility.

## Check

- confirm whether the task changes ACP runtime behavior
- check whether local patch status may be affected
- check whether session visibility or agent-to-agent access matters

## Verify

- run ACP patch status check
- if upgraded, decide whether patch must be replayed
- smoke test project-level ACP
- smoke test agent-internal ACP

## Risks

- local patch may be overwritten after upgrade
- spawn may succeed while parent session cannot read child result
- official upstream fix may make local patch obsolete

## Minimum Output

- patch status
- replay or not
- smoke result
- rollback note
