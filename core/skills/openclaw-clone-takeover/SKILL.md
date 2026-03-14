---
name: openclaw-clone-takeover
description: Use when a Coding Agent has cloned OpenClaw and needs to take over local setup, bootstrap a local instance, fill minimal config inputs, and run the first readiness checks without relying on manual human configuration.
---

# OpenClaw Clone Takeover

## Purpose

Take over a freshly cloned OpenClaw repository.

Do not assume a human will hand-edit config files correctly.
Use the repository bootstrap and check scripts first.

## Use When

Use this skill when:

- OpenClaw was just cloned into a local `.openclaw`
- local instance files do not exist yet
- `openclaw.template.json` must become a local `openclaw.json`
- `secrets.local.example.json` must become a local `secrets.local.json`
- the user wants the Coding Agent to set things up instead of doing it manually

## Hard Rule

Prefer agent takeover over manual editing.

Humans should provide only:

- local username or home directory
- Feishu user id
- Feishu app id
- secrets values

## Workflow

1. Read `README.md` Quickstart if context is unclear.
2. Run `node scripts/init-local-instance.js ...` to create local instance files.
3. Ask for or use provided secrets values to complete `secrets.local.json`.
4. Run `node scripts/check-local-instance.js`.
5. If local checks pass, run the repository validation commands.

## Commands

Initialize local instance:

```bash
node scripts/init-local-instance.js \
  --user-name "$(basename "$HOME")" \
  --feishu-user-id "<feishu-user-id>" \
  --feishu-app-id "<feishu-app-id>" \
  --force
```

Run local readiness check:

```bash
node scripts/check-local-instance.js
```

Run repository validation:

```bash
./scripts/with-openclaw-secrets.sh openclaw config validate --json
./scripts/with-openclaw-secrets.sh openclaw models list
./scripts/with-openclaw-secrets.sh openclaw gateway health
```

## Boundaries

- `openclaw.template.json` is the public starting point
- `openclaw.json` may be a tracked author instance; do not treat it as the public default
- prefer initialization scripts over direct file editing
- do not expand into deeper repository changes until takeover checks pass

## Output

Report:

- whether local instance files were created
- which inputs are still missing
- whether local readiness check passed
- whether repository validation passed
