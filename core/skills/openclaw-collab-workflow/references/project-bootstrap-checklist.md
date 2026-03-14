# Project Bootstrap Checklist

Use when the task creates or changes project agents, bootstrap flow, workspace sync, or project registry behavior.

## Check

- confirm project id, group id, and owner user id
- confirm project agent scope and shared PM boundary
- confirm target directories, registry, and config surfaces
- confirm whether the task changes bootstrap defaults or only creates one project

## Verify

- dry-run when the shape is still under review
- confirm project files, registry, and config are updated consistently
- confirm workspace sync ran for the new or changed project agent
- confirm group routing was written at account scope when applicable
- run gateway health or equivalent smoke check

## Risks

- bootstrap may update multiple surfaces in one run
- Feishu multi-account config may be written to the wrong scope
- generated workspace files may drift from source assets

## Minimum Output

- touched surfaces
- generated artifacts
- group routing result
- smoke result
