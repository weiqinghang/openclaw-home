# Change Examples

Use when task classification is unclear.

## Route to Spec-kit

- new project-agent capability with unclear shape
- new collaboration protocol between agents
- new PM artifact or workflow template
- new operator workflow not yet standardized

## Route to OpenSpec

- change Feishu routing rules in an existing setup
- change ACP behavior, patch policy, or upgrade flow
- change bootstrap defaults or workspace sync behavior
- change safety policy, permissions, or runtime boundaries

## Route to Systematic Debugging

- group message does not reach agent
- ACP session spawn or child result retrieval fails
- workspace sync appears correct but runtime behavior is stale
- behavior changed but the failing layer is unclear

## Route to Direct Execution

- small edit inside an approved design
- narrow doc update with no behavior change
- local script or prompt adjustment with known scope

## Escalate to Design-First

Treat as design-first work if any of these are true:

- 3 or more surfaces are touched
- rollback is non-trivial
- operator workflow changes
- runtime compatibility changes
- cross-agent boundaries change
